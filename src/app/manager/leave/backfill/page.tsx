"use client";

import { useState, useTransition } from "react";
import { Header } from "@/components/header";
import {
  runBackfillJan2026Action,
  runBackfillFeb2026Action,
  runBackfillMar2026Action,
  runBackfillApr2026Action,
  runBackfillMay2026Action,
  type BackfillResult,
} from "./actions";

type Month = "jan" | "feb" | "mar" | "apr" | "may";

const MONTHS: { id: Month; label: string }[] = [
  { id: "jan", label: "January 2026" },
  { id: "feb", label: "February 2026" },
  { id: "mar", label: "March 2026" },
  { id: "apr", label: "April 2026" },
  { id: "may", label: "May 2026" },
];

const ACTIONS: Record<Month, () => Promise<BackfillResult[]>> = {
  jan: runBackfillJan2026Action,
  feb: runBackfillFeb2026Action,
  mar: runBackfillMar2026Action,
  apr: runBackfillApr2026Action,
  may: runBackfillMay2026Action,
};

function ResultTable({ results }: { results: BackfillResult[] }) {
  const ok = results.filter((r) => r.status === "ok").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const errors = results.filter((r) => r.status === "error").length;

  return (
    <div className="mt-3 rounded-xl bg-white p-4 shadow-sm text-sm">
      <p className="mb-2 font-semibold text-foreground">
        Results: {ok} inserted · {skipped} skipped · {errors} errors
      </p>
      <div className="space-y-1">
        {results.map((r, i) => (
          <div
            key={i}
            className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded px-2 py-1 text-xs ${
              r.status === "ok"
                ? "bg-green-50 text-green-800"
                : r.status === "error"
                ? "bg-red-50 text-red-800"
                : "bg-gray-50 text-gray-500"
            }`}
          >
            <span className="font-medium">{r.name}</span>
            <span>{r.leaveType}</span>
            <span>{r.startDate}{r.startDate !== r.endDate ? ` – ${r.endDate}` : ""}</span>
            <span>{r.days}d</span>
            {r.message && <span className="italic">{r.message}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BackfillPage() {
  const [results, setResults] = useState<Partial<Record<Month, BackfillResult[]>>>({});
  const [running, setRunning] = useState<Month | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRun(month: Month) {
    setRunning(month);
    startTransition(async () => {
      try {
        const data = await ACTIONS[month]();
        setResults((prev) => ({ ...prev, [month]: data }));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setResults((prev) => ({
          ...prev,
          [month]: [{ name: "—", leaveType: "—", startDate: "—", endDate: "—", days: 0, status: "error", message: msg }],
        }));
      } finally {
        setRunning(null);
      }
    });
  }

  return (
    <>
      <Header title="Leave Backfill — Jan–May 2026" />
      <main className="flex-1 px-4 py-6">
        <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <p className="font-semibold">Prerequisite SQL (run once in Supabase before using):</p>
          <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-xs">
{`ALTER TABLE leave_requests ALTER COLUMN days TYPE numeric(5,1);
ALTER TABLE leave_balances ALTER COLUMN annual_used TYPE numeric(5,1);
ALTER TABLE leave_balances ALTER COLUMN sick_used TYPE numeric(5,1);
ALTER TABLE leave_balances ALTER COLUMN hospitalization_used TYPE numeric(5,1);`}
          </pre>
        </div>

        <div className="space-y-4">
          {MONTHS.map(({ id, label }) => (
            <div key={id} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <p className="font-semibold text-foreground">{label}</p>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleRun(id)}
                  className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {running === id ? "Running…" : results[id] ? "Re-run" : "Run"}
                </button>
              </div>
              {results[id] && <ResultTable results={results[id]!} />}
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
