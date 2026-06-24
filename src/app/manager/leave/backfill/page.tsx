"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { runLeaveBackfillAction } from "./actions";
import type { BackfillResult } from "./actions";

export default function LeaveBackfillPage() {
  const [results, setResults] = useState<BackfillResult[] | null>(null);
  const [isPending, startTransition] = useTransition();

  const ok = results?.filter((r) => r.status === "ok").length ?? 0;
  const skipped = results?.filter((r) => r.status === "skipped").length ?? 0;
  const errors = results?.filter((r) => r.status === "error").length ?? 0;

  function handleRun() {
    startTransition(async () => {
      const { results } = await runLeaveBackfillAction();
      setResults(results);
    });
  }

  return (
    <>
      <Header title="Leave Backfill" />
      <main className="flex-1 px-4 py-6 space-y-4">
        <Link href="/manager/leave" className="text-sm font-medium text-brand">
          ← Back to Leave
        </Link>

        <div className="rounded-xl bg-white p-4 shadow-sm space-y-2">
          <p className="text-sm font-semibold text-foreground">May–July 2026 Backfill</p>
          <p className="text-xs text-foreground/60">
            Inserts and approves 26 leave records for 16 employees. Also updates Cheok Soon Teck to 6-day schedule.
            Run once only.
          </p>
        </div>

        {!results && (
          <button
            type="button"
            disabled={isPending}
            onClick={handleRun}
            className="w-full rounded-lg bg-brand py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isPending ? "Running — please wait…" : "Run Backfill"}
          </button>
        )}

        {results && (
          <>
            <div className="flex gap-3 text-sm font-semibold">
              <span className="text-green-600">✓ {ok} inserted</span>
              {skipped > 0 && <span className="text-yellow-600">⚠ {skipped} skipped</span>}
              {errors > 0 && <span className="text-red-600">✗ {errors} errors</span>}
            </div>

            <ul className="space-y-1.5">
              {results.map((r, i) => (
                <li
                  key={i}
                  className={`rounded-lg px-3 py-2 text-xs ${
                    r.status === "ok"
                      ? "bg-green-50 text-green-700"
                      : r.status === "skipped"
                      ? "bg-yellow-50 text-yellow-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  <span className="font-semibold">
                    {r.status === "ok" ? "✓" : r.status === "skipped" ? "⚠" : "✗"}
                  </span>{" "}
                  {r.label}
                  {r.days !== undefined && <span className="ml-1 opacity-70">({r.days}d)</span>}
                  {r.message && <span className="ml-1 opacity-70">— {r.message}</span>}
                </li>
              ))}
            </ul>

            <p className="text-center text-xs text-foreground/40">
              This page can be deleted from the codebase after use.
            </p>
          </>
        )}
      </main>
    </>
  );
}
