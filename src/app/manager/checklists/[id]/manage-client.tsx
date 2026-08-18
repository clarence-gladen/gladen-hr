"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import {
  addChecklistItemAction,
  deleteChecklistItemAction,
  toggleChecklistItemActiveAction,
} from "../actions";

export interface ChecklistItem {
  id: string;
  description: string;
  frequency: "daily" | "weekly" | "monthly";
  area: string | null;
  requires_photo: boolean;
  active: boolean;
  sort_order: number;
}

const inputClass =
  "w-full rounded-lg border border-black/10 bg-white px-4 py-3 text-base focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";
const labelClass = "mb-1 block text-sm font-medium text-foreground";

const FREQ_LABEL: Record<string, string> = { daily: "Daily", weekly: "Weekly", monthly: "Monthly" };
const FREQ_ORDER = ["daily", "weekly", "monthly"] as const;

export function ChecklistManageClient({
  contractId,
  siteName,
  clientName,
  items,
}: {
  contractId: string;
  siteName: string;
  clientName: string;
  items: ChecklistItem[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    addChecklistItemAction.bind(null, contractId),
    {}
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function del(itemId: string) {
    setBusyId(itemId);
    startTransition(async () => {
      await deleteChecklistItemAction(contractId, itemId);
      setBusyId(null);
      router.refresh();
    });
  }

  function toggle(itemId: string, active: boolean) {
    setBusyId(itemId);
    startTransition(async () => {
      await toggleChecklistItemActiveAction(contractId, itemId, active);
      setBusyId(null);
      router.refresh();
    });
  }

  return (
    <>
      <Header title="Checklist" />
      <main className="flex-1 px-4 py-6 space-y-6">
        <div>
          <p className="text-lg font-semibold">{siteName}</p>
          <p className="text-sm text-foreground/50">{clientName}</p>
        </div>

        {/* Grouped item list */}
        {items.length === 0 ? (
          <p className="text-sm text-foreground/50">No tasks yet. Add the first one below.</p>
        ) : (
          FREQ_ORDER.map((freq) => {
            const group = items.filter((i) => i.frequency === freq);
            if (group.length === 0) return null;
            return (
              <div key={freq}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/50">
                  {FREQ_LABEL[freq]}
                </p>
                <ul className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
                  {group.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 border-b border-black/5 px-4 py-3 last:border-b-0"
                    >
                      <div className={item.active ? "" : "opacity-40"}>
                        <p className="text-sm font-medium">{item.description}</p>
                        <p className="text-xs text-foreground/50">
                          {item.area ? `${item.area} · ` : ""}
                          {item.requires_photo ? "photo required" : "no photo"}
                          {item.active ? "" : " · hidden"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => toggle(item.id, !item.active)}
                          className="text-xs font-medium text-foreground/60 disabled:opacity-50"
                        >
                          {item.active ? "Hide" : "Show"}
                        </button>
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => del(item.id)}
                          className="text-xs font-medium text-red-600 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })
        )}

        {/* Add form */}
        <form action={formAction} className="space-y-3 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold">Add a task</p>
          <div>
            <label className={labelClass} htmlFor="description">
              Task
            </label>
            <input
              id="description"
              name="description"
              type="text"
              required
              placeholder="e.g. Sweep & mop lobby floor"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="frequency">
                Frequency
              </label>
              <select id="frequency" name="frequency" defaultValue="daily" className={inputClass}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="area">
                Area <span className="font-normal text-foreground/40">(optional)</span>
              </label>
              <input id="area" name="area" type="text" placeholder="e.g. Level 3" className={inputClass} />
            </div>
          </div>
          <label className="flex items-center gap-3 py-1">
            <input
              type="checkbox"
              name="requiresPhoto"
              className="h-5 w-5 rounded border-black/20 text-brand focus:ring-brand/30"
            />
            <span className="text-sm">Require a photo (coming soon)</span>
          </label>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-brand py-3 text-base font-semibold text-white transition disabled:opacity-60"
          >
            {pending ? "Adding…" : "Add task"}
          </button>
        </form>
      </main>
    </>
  );
}
