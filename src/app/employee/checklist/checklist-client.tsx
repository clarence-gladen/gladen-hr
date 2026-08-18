"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/header";
import { completeItemAction, uncompleteItemAction } from "./actions";

export interface ChecklistTask {
  id: string;
  description: string;
  frequency: "daily" | "weekly" | "monthly";
  area: string | null;
  done: boolean;
}

const FREQ_LABEL: Record<string, string> = { daily: "Daily", weekly: "Weekly", monthly: "Monthly" };
const FREQ_ORDER = ["daily", "weekly", "monthly"] as const;

export function ChecklistClient({
  siteName,
  tasks,
  checkedIn,
}: {
  siteName: string | null;
  tasks: ChecklistTask[];
  checkedIn: boolean;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const doneCount = tasks.filter((t) => t.done).length;

  function toggle(task: ChecklistTask) {
    setError(null);
    setBusyId(task.id);
    startTransition(async () => {
      const res = task.done
        ? await uncompleteItemAction(task.id)
        : await completeItemAction(task.id);
      if (res.error) setError(res.error);
      else router.refresh();
      setBusyId(null);
    });
  }

  if (!siteName) {
    return (
      <>
        <Header title="Checklist" />
        <main className="flex-1 px-4 py-6">
          <p className="rounded-xl border border-black/10 bg-black/[.02] p-4 text-foreground/70">
            You are not assigned to a site today. Please check with your supervisor.
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <Header title="Checklist" />
      <main className="flex-1 px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold">{siteName}</p>
            <p className="text-sm text-foreground/50">
              {doneCount} of {tasks.length} done today
            </p>
          </div>
        </div>

        {!checkedIn && (
          <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Please{" "}
            <Link href="/employee/checkin" className="font-semibold underline">
              check in on site
            </Link>{" "}
            before ticking off tasks.
          </div>
        )}

        {tasks.length === 0 ? (
          <p className="text-sm text-foreground/50">No tasks set for this site yet.</p>
        ) : (
          FREQ_ORDER.map((freq) => {
            const group = tasks.filter((t) => t.frequency === freq);
            if (group.length === 0) return null;
            return (
              <div key={freq}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/50">
                  {FREQ_LABEL[freq]}
                </p>
                <ul className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
                  {group.map((task) => (
                    <li key={task.id}>
                      <button
                        type="button"
                        disabled={!checkedIn || busyId === task.id}
                        onClick={() => toggle(task)}
                        className="flex w-full items-center gap-3 border-b border-black/5 px-4 py-4 text-left last:border-b-0 disabled:opacity-60"
                      >
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${
                            task.done
                              ? "border-brand bg-brand text-white"
                              : "border-black/25 bg-white"
                          }`}
                          aria-hidden
                        >
                          {task.done ? "✓" : ""}
                        </span>
                        <span className="flex-1">
                          <span className={`text-base ${task.done ? "text-foreground/50 line-through" : ""}`}>
                            {task.description}
                          </span>
                          {task.area && (
                            <span className="block text-xs text-foreground/50">{task.area}</span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })
        )}

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}
      </main>
    </>
  );
}
