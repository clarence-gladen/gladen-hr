"use client";

import { useActionState, useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { createOvertimeRecordAction, deleteOvertimeRecordAction } from "./actions";
import { useToast } from "@/components/toast";

type Employee = { id: string; full_name: string };

type OtRecord = {
  id: string;
  work_date: string;
  remarks: string | null;
  amount: number;
  employees: { full_name: string } | null;
};

const INITIAL: { error?: string } = {};

function groupByMonth(records: OtRecord[]) {
  const map = new Map<string, { monthKey: string; label: string; total: number; items: OtRecord[] }>();

  for (const r of records) {
    const monthKey = r.work_date.slice(0, 7); // "2026-06"
    if (!map.has(monthKey)) {
      const d = new Date(r.work_date + "T00:00:00");
      const label = d.toLocaleDateString("en-SG", { month: "long", year: "numeric" });
      map.set(monthKey, { monthKey, label, total: 0, items: [] });
    }
    const group = map.get(monthKey)!;
    group.items.push(r);
    group.total += Number(r.amount);
  }

  // Sort months newest first; within each month sort by work_date newest first
  return [...map.values()]
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey))
    .map((g) => ({
      ...g,
      items: [...g.items].sort((a, b) => b.work_date.localeCompare(a.work_date)),
    }));
}

export function OvertimeClient({
  employees,
  records,
}: {
  employees: Employee[];
  records: OtRecord[];
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const [state, action, pending] = useActionState(createOvertimeRecordAction, INITIAL);
  const [, startTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [employeeFilter, setEmployeeFilter] = useState<string>("");

  function handleDelete(id: string) {
    setDeletingId(id);
    setDeleteError(null);
    startTransition(async () => {
      const res = await deleteOvertimeRecordAction(id);
      if (res.error) {
        setDeleteError(res.error);
        setDeletingId(null);
      } else {
        setDeletingId(null);
        addToast("OT record deleted");
        router.refresh();
      }
    });
  }

  const filteredRecords = employeeFilter
    ? records.filter((r) => r.employees?.full_name === employeeFilter)
    : records;

  return (
    <>
      {/* Add OT form */}
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Record Overtime</h2>
        <form action={action} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Employee</label>
            <select
              name="employeeId"
              required
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm"
            >
              <option value="">Select employee…</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">OT Work Date</label>
            <input
              type="date"
              name="workDate"
              required
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Remarks (optional)</label>
            <textarea
              name="remarks"
              rows={2}
              placeholder="e.g. Weekend production run"
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm resize-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">OT Amount (SGD)</label>
            <input
              type="number"
              name="amount"
              min="0.01"
              step="0.01"
              required
              placeholder="0.00"
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm"
            />
          </div>

          {state.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Saving…" : "Add OT Record"}
          </button>
        </form>
      </div>

      {/* Employee filter */}
      {employees.length > 1 && (
        <div className="flex items-center gap-2">
          <select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm"
          >
            <option value="">All employees</option>
            {employees.map((e) => (
              <option key={e.id} value={e.full_name}>{e.full_name}</option>
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

      {/* OT records grouped by month */}
      <div>
        {deleteError && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            {deleteError}
          </p>
        )}
        {filteredRecords.length === 0 ? (
          <div className="rounded-xl bg-white shadow-sm px-4 py-6 text-center text-sm text-muted-foreground">
            {employeeFilter ? "No OT records for this employee." : "No OT records yet."}
          </div>
        ) : (
          <div className="space-y-5">
            {groupByMonth(filteredRecords).map(({ monthKey, label, total, items }) => (
              <div key={monthKey}>
                {/* Month breaker */}
                <div className="mb-2 flex items-center justify-between rounded-lg bg-brand px-4 py-2.5">
                  <h3 className="text-sm font-bold tracking-wide text-white">{label}</h3>
                  <span className="text-sm font-semibold text-white/80">
                    S$ {total.toFixed(2)}
                  </span>
                </div>
                {/* Records in this month */}
                <ul className="overflow-hidden rounded-xl bg-white shadow-sm divide-y divide-black/5">
                  {items.map((r) => (
                    <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                      {/* Date badge */}
                      <div className="flex w-10 shrink-0 flex-col items-center rounded-lg bg-brand/8 py-1">
                        <span className="text-[11px] font-semibold uppercase leading-none text-brand">
                          {new Date(r.work_date + "T00:00:00").toLocaleDateString("en-SG", { month: "short" })}
                        </span>
                        <span className="text-base font-bold leading-tight text-brand">
                          {new Date(r.work_date + "T00:00:00").getDate()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {r.employees?.full_name ?? "—"}
                        </p>
                        {r.remarks && (
                          <p className="text-xs text-foreground/50 truncate">{r.remarks}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-semibold text-foreground">
                          S$ {Number(r.amount).toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDelete(r.id)}
                          disabled={deletingId !== null}
                          className="rounded-lg px-2 py-1 text-xs text-red-500 border border-red-200 disabled:opacity-40"
                        >
                          {deletingId === r.id ? "…" : "Delete"}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
