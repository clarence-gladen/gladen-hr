"use client";

import { useActionState, useTransition, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { useLanguage } from "@/lib/i18n/language-provider";
import { fmtDate } from "@/lib/utils/date";
import { OT_PERIOD_PRESETS, OT_PERIOD_OTHER, periodLabel } from "@/lib/ot/periods";
import { createOtEntryAction, updateOtEntryAction, deleteOtEntryAction } from "./actions";

export interface SupervisorEmployee {
  employee_id: string;
  full_name: string;
  contract_id: string;
  site_name: string;
}

export interface OtEntryRow {
  id: string;
  employee_id: string;
  employee_name: string;
  site_name: string | null;
  work_date: string;
  period: string;
  hours: number | null;
  comment: string | null;
  contract_id: string | null;
}

const inputClass =
  "w-full rounded-lg border border-black/10 bg-white px-4 py-3 text-base focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";
const labelClass = "mb-1 block text-sm font-medium text-foreground";

function groupBySite(employees: SupervisorEmployee[]) {
  const map = new Map<string, SupervisorEmployee[]>();
  for (const e of employees) {
    const list = map.get(e.site_name) ?? [];
    list.push(e);
    map.set(e.site_name, list);
  }
  return [...map.entries()];
}

export function OtEntryForm({
  employees,
  action,
  pending,
  error,
  submitLabel,
  defaults,
  onCancel,
}: {
  employees: SupervisorEmployee[];
  action: (payload: FormData) => void;
  pending: boolean;
  error?: string;
  submitLabel: string;
  defaults?: OtEntryRow;
  onCancel?: () => void;
}) {
  const { t } = useLanguage();
  const defaultIsPreset = defaults
    ? OT_PERIOD_PRESETS.some((p) => p.value === defaults.period)
    : true;
  const [periodChoice, setPeriodChoice] = useState<string>(
    defaults ? (defaultIsPreset ? defaults.period : OT_PERIOD_OTHER) : ""
  );

  const defaultEmployeeValue =
    defaults && defaults.contract_id
      ? `${defaults.employee_id}|${defaults.contract_id}`
      : "";

  return (
    <form action={action} className="space-y-3">
      <div>
        <label className={labelClass}>{t("ot.employee")}</label>
        <select name="employee" required defaultValue={defaultEmployeeValue} className={inputClass}>
          <option value="" disabled>
            {t("ot.selectEmployee")}
          </option>
          {groupBySite(employees).map(([siteName, list]) => (
            <optgroup key={siteName} label={siteName}>
              {list.map((e) => (
                <option key={`${e.employee_id}|${e.contract_id}`} value={`${e.employee_id}|${e.contract_id}`}>
                  {e.full_name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>{t("ot.date")}</label>
        <input name="workDate" type="date" required defaultValue={defaults?.work_date ?? ""} className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>{t("ot.period")}</label>
        <select
          name="period"
          required
          value={periodChoice}
          onChange={(e) => setPeriodChoice(e.target.value)}
          className={inputClass}
        >
          <option value="" disabled>
            {t("ot.selectPeriod")}
          </option>
          {OT_PERIOD_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {t(p.labelKey)}
            </option>
          ))}
          <option value={OT_PERIOD_OTHER}>{t("ot.periodOther")}</option>
        </select>
      </div>

      {periodChoice === OT_PERIOD_OTHER && (
        <div className="grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <label className={labelClass}>{t("ot.customPeriod")}</label>
            <input
              name="customPeriod"
              type="text"
              required
              placeholder={t("ot.customPeriodPlaceholder")}
              defaultValue={defaults && !defaultIsPreset ? defaults.period : ""}
              className={inputClass}
            />
          </div>
          <div className="min-w-0">
            <label className={labelClass}>{t("ot.hoursOptional")}</label>
            <input
              name="customHours"
              type="number"
              min="0.5"
              max="24"
              step="0.5"
              defaultValue={defaults && !defaultIsPreset && defaults.hours != null ? defaults.hours : ""}
              className={inputClass}
            />
          </div>
        </div>
      )}

      <div>
        <label className={labelClass}>{t("ot.comment")}</label>
        <textarea name="comment" rows={2} defaultValue={defaults?.comment ?? ""} className={inputClass} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-lg bg-brand py-3 text-base font-semibold text-white disabled:opacity-60"
        >
          {pending ? t("common.loading") : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg bg-black/5 py-3 text-base font-semibold text-foreground"
          >
            {t("ot.cancelEdit")}
          </button>
        )}
      </div>
    </form>
  );
}

function OtEntryCard({
  entry,
  employees,
}: {
  entry: OtEntryRow;
  employees: SupervisorEmployee[];
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "edit" | "deleteConfirm">("view");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [editState, editAction, isEditing] = useActionState(
    updateOtEntryAction.bind(null, entry.id),
    {} as { error?: string }
  );
  const wasEditing = useRef(false);
  useEffect(() => {
    if (wasEditing.current && !isEditing && !editState?.error) setMode("view");
    wasEditing.current = isEditing;
  }, [isEditing, editState]);

  function handleDelete() {
    setDeleteError(null);
    startTransition(async () => {
      const result = await deleteOtEntryAction(entry.id);
      if (result?.error) {
        setDeleteError(result.error);
      } else {
        setMode("view");
        router.refresh();
      }
    });
  }

  if (mode === "edit") {
    return (
      <li className="rounded-xl bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-foreground">{t("ot.editEntry")}</p>
        <OtEntryForm
          employees={employees}
          action={editAction}
          pending={isEditing}
          error={editState?.error}
          submitLabel={t("ot.saveChanges")}
          defaults={entry}
          onCancel={() => setMode("view")}
        />
      </li>
    );
  }

  if (mode === "deleteConfirm") {
    return (
      <li className="rounded-xl border border-red-200 bg-red-50 p-4">
        <p className="mb-3 text-sm font-semibold text-red-700">{t("ot.deleteConfirm")}</p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={handleDelete}
            className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isPending ? t("common.loading") : t("ot.delete")}
          </button>
          <button
            type="button"
            onClick={() => setMode("view")}
            className="flex-1 rounded-lg bg-black/5 py-2.5 text-sm font-semibold text-foreground"
          >
            {t("common.back")}
          </button>
        </div>
        {deleteError && <p className="mt-2 text-sm text-red-700">{deleteError}</p>}
      </li>
    );
  }

  return (
    <li className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-foreground">{entry.employee_name}</p>
          <p className="mt-1 text-sm text-foreground/60">
            {fmtDate(entry.work_date)} · {periodLabel(entry.period, t)}
          </p>
          {entry.site_name && <p className="mt-1 text-xs text-foreground/50">{entry.site_name}</p>}
          {entry.comment && <p className="mt-1 text-sm text-foreground/60">{entry.comment}</p>}
        </div>
        {entry.hours != null && (
          <span className="shrink-0 rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
            {Number(entry.hours)} {t("ot.hrs")}
          </span>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setMode("edit")}
          className="rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand"
        >
          {t("ot.editEntry")}
        </button>
        <button
          type="button"
          onClick={() => setMode("deleteConfirm")}
          className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600"
        >
          {t("ot.delete")}
        </button>
      </div>
    </li>
  );
}

function groupByMonth(entries: OtEntryRow[]) {
  const map = new Map<string, { monthKey: string; label: string; totalHours: number; items: OtEntryRow[] }>();
  for (const e of entries) {
    const monthKey = e.work_date.slice(0, 7);
    if (!map.has(monthKey)) {
      const d = new Date(e.work_date + "T00:00:00");
      map.set(monthKey, {
        monthKey,
        label: d.toLocaleDateString("en-SG", { month: "long", year: "numeric" }),
        totalHours: 0,
        items: [],
      });
    }
    const group = map.get(monthKey)!;
    group.items.push(e);
    if (e.hours != null) group.totalHours += Number(e.hours);
  }
  return [...map.values()].sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}

export function OtClient({
  employees,
  entries,
}: {
  employees: SupervisorEmployee[];
  entries: OtEntryRow[];
}) {
  const { t } = useLanguage();
  const [createState, createAction, creating] = useActionState(createOtEntryAction, {} as { error?: string });

  return (
    <>
      <Header titleKey="ot.title" />
      <main className="flex-1 px-4 py-6">
        <h2 className="mb-2 text-sm font-semibold text-foreground/60">{t("ot.recordOt")}</h2>
        {employees.length === 0 ? (
          <div className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {t("ot.noEmployees")}
          </div>
        ) : (
          <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
            <OtEntryForm
              employees={employees}
              action={createAction}
              pending={creating}
              error={createState.error}
              submitLabel={t("ot.submit")}
            />
          </div>
        )}

        <h2 className="mb-2 text-sm font-semibold text-foreground/60">{t("ot.myEntries")}</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-foreground/60">{t("ot.noEntries")}</p>
        ) : (
          <div className="space-y-5">
            {groupByMonth(entries).map(({ monthKey, label, totalHours, items }) => (
              <div key={monthKey}>
                <div className="mb-2 flex items-center justify-between rounded-lg bg-brand px-4 py-2.5">
                  <h3 className="text-sm font-bold tracking-wide text-white">{label}</h3>
                  {totalHours > 0 && (
                    <span className="text-sm font-semibold text-white/80">
                      {totalHours} {t("ot.hrs")}
                    </span>
                  )}
                </div>
                <ul className="space-y-3">
                  {items.map((entry) => (
                    <OtEntryCard key={entry.id} entry={entry} employees={employees} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
