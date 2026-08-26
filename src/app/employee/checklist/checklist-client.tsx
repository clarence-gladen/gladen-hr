"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/header";
import { completeItemAction, uncompleteItemAction } from "./actions";

export interface ChecklistTask {
  id: string;
  description: string;
  frequency: string;
  done: boolean;
}
export interface AreaGroup {
  areaId: string;
  areaName: string;
  siteName: string;
  checkedIn: boolean;
  tasks: ChecklistTask[];
}

export function ChecklistClient({ groups }: { groups: AreaGroup[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

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

  const totalTasks = groups.reduce((n, g) => n + g.tasks.length, 0);
  const doneTasks = groups.reduce((n, g) => n + g.tasks.filter((t) => t.done).length, 0);
  const anyNotCheckedIn = groups.some((g) => g.tasks.length > 0 && !g.checkedIn);

  if (groups.length === 0) {
    return (
      <>
        <Header title="Checklist" />
        <main className="flex-1 px-4 py-6">
          <p className="rounded-xl border border-black/10 bg-black/[.02] p-4 text-foreground/70">
            You have no areas assigned to you today. Please check with your supervisor.
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <Header title="Checklist" />
      <main className="flex-1 px-4 py-6 space-y-4">
        <p className="text-sm text-foreground/50">
          {doneTasks} of {totalTasks} tasks done today
        </p>

        {anyNotCheckedIn && (
          <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Please{" "}
            <Link href="/employee/checkin" className="font-semibold underline">
              check in on site
            </Link>{" "}
            before ticking off tasks.
          </div>
        )}

        {groups.map((group) => (
          <div key={group.areaId}>
            <div className="mb-2">
              <p className="text-base font-semibold">{group.areaName}</p>
              <p className="text-xs text-foreground/50">{group.siteName}</p>
            </div>
            {group.tasks.length === 0 ? (
              <p className="px-1 text-sm text-foreground/40">No tasks in this area.</p>
            ) : (
              <ul className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
                {group.tasks.map((task) => (
                  <li key={task.id}>
                    <button
                      type="button"
                      disabled={!group.checkedIn || busyId === task.id}
                      onClick={() => toggle(task)}
                      className="flex w-full items-center gap-3 border-b border-black/5 px-4 py-4 text-left last:border-b-0 disabled:opacity-60"
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${
                          task.done ? "border-brand bg-brand text-white" : "border-black/25 bg-white"
                        }`}
                        aria-hidden
                      >
                        {task.done ? "✓" : ""}
                      </span>
                      <span className="flex-1">
                        <span className={`text-base ${task.done ? "text-foreground/50 line-through" : ""}`}>
                          {task.description}
                        </span>
                        <span className="block text-xs text-foreground/40">{task.frequency}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}

        {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      </main>
    </>
  );
}
