"use client";

import { useActionState, useTransition, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/language-provider";
import { fmtDate } from "@/lib/utils/date";
import { OT_PERIOD_PRESETS, OT_PERIOD_OTHER, periodLabel } from "@/lib/ot/periods";
import { createOtLogEntryAction, updateOtLogEntryAction, deleteOtLogEntryAction } from "./actions";
import { useToast } from "@/components/toast";

type Employee = { id: string; full_name: string };
type Site = { id: string; client_name: string; site_name: string };

export type OtLogRow = {
  id: string;
  employee_id: string;
  contract_id: string | null;
  work_date: string;
  period: string;
  hours: number | null;
  comment: string | null;
  employee_name: string;
  site_name: string | null;
  logged_by: string | null;
};

const inputClass =
  "w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm";
const labelClass = "mb-1 block text-xs text-muted-foreground";

function OtLogForm({
  employees,
  sites,
  action,
  pending,
  error,
  submitLabel,
  defaults,
  onCancel,
}: {
  employees: Employee[];
  sites: Site[];
  action: (payload: FormData) => void;
  pending: boolean;
  error?: string;
  submitLabel: string;
  defaults?: OtLogRow;
  onCancel?: () => void;
}) {
  const { t } = useLanguage();
  const defaultIsPreset = defaults
    ? OT_PERIOD_PRESETS.some((p) => p.value === defaults.period)
    : true;
  const [periodChoice, setPeriodChoice] = useState<string>(
    defaults ? (defaultIsPreset ? defaults.period : OT_PERIOD_OTHER) : ""
  );

  return (
    <form action={action} className="space-y-3">
      <div>
        <label className={labelClass}>Employee</label>
        <select name="employeeId" required defaultValue={defaults?.employee_id ?? ""} className={inputClass}>
          <option value="" disabled>
            Select employee…
          </option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.full_name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Site (optional)</label>
        <select name="contractId" defaultValue={defaults?.contract_id ?? ""} className={inputClass}>
          <option value="">No site</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.client_name} — {s.site_name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>OT Date</label>
        <input type="date" name="workDate" required defaultValue={defaults?.work_date ?? ""} className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>OT Period</label>
        <select
          name="period"
          required
          value={periodChoice}
          onChange={(e) => setPeriodChoice(e.target.value)}
          className={inputClass}
        >
          <option value="" disabled>
            Select period…
          </option>
          {OT_PERIOD_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {t(p.labelKey)}
            </option>
          ))}
          <option value={OT_PERIOD_OTHER}>Others</option>
        </select>
      </div>

      {periodChoice === OT_PERIOD_OTHER && (
        <div className="grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <label className={labelClass}>Custom Period</label>
            <input
              name="customPeriod"
              type="text"
              required
              placeholder="e.g. 7am – 1pm"
              defaultValue={defaults && !defaultIsPreset ? defaults.period : ""}
              className={inputClass}
            />
          </div>
          <div className="min-w-0">
            <label className={labelClass}>Hours (optional)</label>
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
        <label className={labelClass}>Comment (optional)</label>
        <textarea name="comment" rows={2} defaultValue={defaults?.comment ?? ""} className={`${inputClass} resize-none`} />
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-lg bg-brand py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg bg-black/5 py-2.5 text-sm font-semibold text-foreground"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function OtLogCard({
  entry,
  employees,
  sites,
}: {
  entry: OtLogRow;
  employees: Employee[];
  sites: Site[];
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const { addToast } = useToast();
  const [mode, setMode] = useState<"view" | "edit" | "deleteConfirm">("view");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [editState, editAction, isEditing] = useActionState(
    updateOtLogEntryAction.bind(null, entry.id),
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
      const result = await deleteOtLogEntryAction(entry.id);
      if (result?.error) {
        setDeleteError(result.error);
      } else {
        setMode("view");
        addToast("OT entry deleted");
        router.refresh();
      }
    });
  }

  if (mode === "edit") {
    return (
      <li className="rounded-xl bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-foreground">Edit OT Entry</p>
        <OtLogForm
          employees={employees}
          sites={sites}
          action={editAction}
          pending={isEditing}
          error={editState?.error}
          submitLabel="Save Changes"
          defaults={entry}
          onCancel={() => setMode("view")}
        />
      </li>
    );
  }

  if (mode === "deleteConfirm") {
    return (
      <li className="rounded-xl border border-red-200 bg-red-50 p-4">
        <p className="mb-3 text-sm font-semibold text-red-700">Delete this OT entry?</p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={handleDelete}
            className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isPending ? "Deleting…" : "Delete"}
          </button>
          <button
            type="button"
            onClick={() => setMode("view")}
            className="flex-1 rounded-lg bg-black/5 py-2.5 text-sm font-semibold text-foreground"
          >
            Back
          </button>
        </div>
        {deleteError && <p className="mt-2 text-sm text-red-700">{deleteError}</p>}
      </li>
    );
  }

  return (
    <li className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{entry.employee_name}</p>
          <p className="mt-1 text-sm text-foreground/60">
            {fmtDate(entry.work_date)} · {periodLabel(entry.period, t)}
          </p>
          <p className="mt-1 text-xs text-foreground/50">
            {entry.site_name ?? "—"}
            {entry.logged_by ? ` · Logged by ${entry.logged_by}` : ""}
          </p>
          {entry.comment && <p className="mt-1 text-sm text-foreground/60">{entry.comment}</p>}
        </div>
        {entry.hours != null && (
          <span className="shrink-0 rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
            {Number(entry.hours)} hrs
          </span>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setMode("edit")}
          className="rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => setMode("deleteConfirm")}
          className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600"
        >
          Delete
        </button>
      </div>
    </li>
  );
}

function groupByMonth(entries: OtLogRow[]) {
  const map = new Map<string, { monthKey: string; label: string; totalHours: number; items: OtLogRow[] }>();
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

export function OtLogClient({
  employees,
  sites,
  entries,
}: {
  employees: Employee[];
  sites: Site[];
  entries: OtLogRow[];
}) {
  const [createState, createAction, creating] = useActionState(
    createOtLogEntryAction,
    {} as { error?: string }
  );
  const [employeeFilter, setEmployeeFilter] = useState<string>("");

  const filtered = employeeFilter
    ? entries.filter((e) => e.employee_id === employeeFilter)
    : entries;

  return (
    <>
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Add OT Entry</h2>
        <OtLogForm
          employees={employees}
          sites={sites}
          action={createAction}
          pending={creating}
          error={createState.error}
          submitLabel="Add OT Entry"
        />
      </div>

      {employees.length > 1 && (
        <div className="flex items-center gap-2">
          <select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className={inputClass}
          >
            <option value="">All employees</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.full_name}
              </option>
            ))}
          </select>
          {employeeFilter && (
            <button
              type="button"
              onClick={() => setEmployeeFilter("")}
              className="shrink-0 rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm text-foreground/60"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl bg-white px-4 py-6 text-center text-sm text-muted-foreground shadow-sm">
          {employeeFilter ? "No OT entries for this employee." : "No OT entries yet."}
        </div>
      ) : (
        <div className="space-y-5">
          {groupByMonth(filtered).map(({ monthKey, label, totalHours, items }) => (
            <div key={monthKey}>
              <div className="mb-2 flex items-center justify-between rounded-lg bg-brand px-4 py-2.5">
                <h3 className="text-sm font-bold tracking-wide text-white">{label}</h3>
                {totalHours > 0 && (
                  <span className="text-sm font-semibold text-white/80">{totalHours} hrs</span>
                )}
              </div>
              <ul className="space-y-3">
                {items.map((entry) => (
                  <OtLogCard key={entry.id} entry={entry} employees={employees} sites={sites} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
