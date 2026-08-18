"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { saveAndGenerateReportAction } from "./actions";

export interface SiteOption {
  id: string;
  label: string;
}
export interface ReportItem {
  id: string;
  description: string;
  frequency: string;
}

const inputClass =
  "w-full rounded-lg border border-black/10 bg-white px-4 py-3 text-base focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";
const labelClass = "mb-1 block text-sm font-medium text-foreground";

function monthOptions(): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    out.push({ value, label });
  }
  return out;
}

export function ReportClient({
  sites,
  selectedSite,
  year,
  month,
  monthLabel,
  items,
  tasksInReport,
  totalCompletions,
  attendanceDays,
  saved,
}: {
  sites: SiteOption[];
  selectedSite: string;
  year: number;
  month: number;
  monthLabel: string;
  items: ReportItem[];
  tasksInReport: number;
  totalCompletions: number;
  attendanceDays: number;
  saved: {
    remarks: string;
    supervisorName: string;
    coverMessage: string;
    excludedItemIds: string[];
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [remarks, setRemarks] = useState(saved.remarks);
  const [supervisorName, setSupervisorName] = useState(saved.supervisorName);
  const [coverMessage, setCoverMessage] = useState(saved.coverMessage);
  const [excluded, setExcluded] = useState<Set<string>>(new Set(saved.excludedItemIds));

  const monthValue = `${year}-${String(month).padStart(2, "0")}`;

  function navigate(nextSite: string, nextMonth: string) {
    router.push(`/manager/reports?site=${nextSite}&month=${nextMonth}`);
  }

  function toggleExclude(id: string) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function download() {
    setError(null);
    startTransition(async () => {
      const res = await saveAndGenerateReportAction(selectedSite, year, month, {
        remarks,
        supervisorName,
        coverMessage,
        excludedItemIds: [...excluded],
      });
      if (res.error) setError(res.error);
      else if (res.url) window.open(res.url, "_blank");
    });
  }

  return (
    <>
      <Header title="Service reports" />
      <main className="flex-1 px-4 py-6 space-y-5">
        {/* Site + month selectors */}
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className={labelClass} htmlFor="site">
              Site
            </label>
            <select
              id="site"
              value={selectedSite}
              onChange={(e) => navigate(e.target.value, monthValue)}
              className={inputClass}
            >
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="month">
              Month
            </label>
            <select
              id="month"
              value={monthValue}
              onChange={(e) => navigate(selectedSite, e.target.value)}
              className={inputClass}
            >
              {monthOptions().map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Preview summary */}
        <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold">{monthLabel} · preview</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-bold text-brand">{tasksInReport}</p>
              <p className="text-xs text-foreground/50">Tasks</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-brand">{totalCompletions}</p>
              <p className="text-xs text-foreground/50">Completions</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-brand">{attendanceDays}</p>
              <p className="text-xs text-foreground/50">Days on site</p>
            </div>
          </div>
        </div>

        {/* Editable fields */}
        <div className="space-y-3 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold">Edit before download</p>
          <div>
            <label className={labelClass} htmlFor="coverMessage">
              Cover message <span className="font-normal text-foreground/40">(intro line)</span>
            </label>
            <textarea
              id="coverMessage"
              value={coverMessage}
              onChange={(e) => setCoverMessage(e.target.value)}
              rows={2}
              placeholder="e.g. Please find below the summary of cleaning services carried out this month."
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="remarks">
              Remarks
            </label>
            <textarea
              id="remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              placeholder="Any notes for the client this month"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="supervisorName">
              Supervisor (sign-off)
            </label>
            <input
              id="supervisorName"
              value={supervisorName}
              onChange={(e) => setSupervisorName(e.target.value)}
              placeholder="Name on the sign-off line"
              className={inputClass}
            />
          </div>
        </div>

        {/* Exclude tasks */}
        {items.length > 0 && (
          <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
            <p className="mb-1 text-sm font-semibold">Tasks in this report</p>
            <p className="mb-3 text-xs text-foreground/50">Untick any task to leave it out.</p>
            <ul className="space-y-1">
              {items.map((item) => (
                <li key={item.id}>
                  <label className="flex items-center gap-3 py-1">
                    <input
                      type="checkbox"
                      checked={!excluded.has(item.id)}
                      onChange={() => toggleExclude(item.id)}
                      className="h-5 w-5 rounded border-black/20 text-brand focus:ring-brand/30"
                    />
                    <span className="text-sm">
                      {item.description}
                      <span className="text-foreground/40"> · {item.frequency}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <button
          type="button"
          disabled={pending}
          onClick={download}
          className="w-full rounded-xl bg-brand py-4 text-lg font-semibold text-white transition active:scale-[.99] disabled:opacity-60"
        >
          {pending ? "Generating…" : "Save & download PDF"}
        </button>
        <p className="text-center text-xs text-foreground/40">
          Downloads the report PDF for you to review and send to the client.
        </p>
      </main>
    </>
  );
}
