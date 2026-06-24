"use client";

import { useState, useTransition } from "react";
import { Header } from "@/components/header";
import {
  runBackfillJan2025Action, runBackfillFeb2025Action, runBackfillMar2025Action,
  runBackfillApr2025Action, runBackfillMay2025Action, runBackfillJun2025Action,
  runBackfillJul2025Action, runBackfillAug2025Action, runBackfillSep2025Action,
  runBackfillOct2025Action, runBackfillNov2025Action, runBackfillDec2025Action,
  runBackfill2026UpcomingAction,
  type BackfillResult,
} from "./actions";

type Section = "jan25" | "feb25" | "mar25" | "apr25" | "may25" | "jun25" | "jul25" | "aug25" | "sep25" | "oct25" | "nov25" | "dec25" | "upcoming26";

const SECTIONS: { id: Section; label: string }[] = [
  { id: "jan25",      label: "January 2025" },
  { id: "feb25",      label: "February 2025" },
  { id: "mar25",      label: "March 2025" },
  { id: "apr25",      label: "April 2025" },
  { id: "may25",      label: "May 2025" },
  { id: "jun25",      label: "June 2025" },
  { id: "jul25",      label: "July 2025" },
  { id: "aug25",      label: "August 2025" },
  { id: "sep25",      label: "September 2025" },
  { id: "oct25",      label: "October 2025" },
  { id: "nov25",      label: "November 2025" },
  { id: "dec25",      label: "December 2025" },
  { id: "upcoming26", label: "2026 Upcoming Leave" },
];

const ACTIONS: Record<Section, () => Promise<BackfillResult[]>> = {
  jan25:      runBackfillJan2025Action,
  feb25:      runBackfillFeb2025Action,
  mar25:      runBackfillMar2025Action,
  apr25:      runBackfillApr2025Action,
  may25:      runBackfillMay2025Action,
  jun25:      runBackfillJun2025Action,
  jul25:      runBackfillJul2025Action,
  aug25:      runBackfillAug2025Action,
  sep25:      runBackfillSep2025Action,
  oct25:      runBackfillOct2025Action,
  nov25:      runBackfillNov2025Action,
  dec25:      runBackfillDec2025Action,
  upcoming26: runBackfill2026UpcomingAction,
};

function ResultTable({ results }: { results: BackfillResult[] }) {
  const ok = results.filter((r) => r.status === "ok").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const errors = results.filter((r) => r.status === "error").length;
  return (
    <div className="mt-3 rounded-xl bg-white p-4 shadow-sm text-sm">
      <p className="mb-2 font-semibold text-foreground">
        {ok} inserted · {skipped} skipped · {errors} errors
      </p>
      <div className="space-y-1">
        {results.map((r, i) => (
          <div key={i} className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded px-2 py-1 text-xs ${
            r.status === "ok" ? "bg-green-50 text-green-800" : r.status === "error" ? "bg-red-50 text-red-800" : "bg-gray-50 text-gray-500"
          }`}>
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
  const [results, setResults] = useState<Partial<Record<Section, BackfillResult[]>>>({});
  const [running, setRunning] = useState<Section | null>(null);
  const [, startTransition] = useTransition();

  function handleRun(id: Section) {
    setRunning(id);
    startTransition(async () => {
      try {
        const data = await ACTIONS[id]();
        setResults((prev) => ({ ...prev, [id]: data }));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setResults((prev) => ({ ...prev, [id]: [{ name: "—", leaveType: "—", startDate: "—", endDate: "—", days: 0, status: "error", message: msg }] }));
      } finally {
        setRunning(null);
      }
    });
  }

  return (
    <>
      <Header title="Leave Backfill — 2025 + 2026 Upcoming" />
      <main className="flex-1 px-4 py-6">
        <div className="space-y-3">
          {SECTIONS.map(({ id, label }) => (
            <div key={id} className={`rounded-xl bg-white p-4 shadow-sm ${id === "upcoming26" ? "border-2 border-brand/30" : ""}`}>
              <div className="flex items-center justify-between gap-4">
                <p className="font-semibold text-foreground">{label}</p>
                <button
                  type="button"
                  disabled={running !== null}
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
