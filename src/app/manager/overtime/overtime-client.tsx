"use client";

import { useActionState, useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { createOvertimeRecordAction, deleteOvertimeRecordAction } from "./actions";

type Employee = { id: string; full_name: string };

type OtRecord = {
  id: string;
  work_date: string;
  remarks: string | null;
  amount: number;
  employees: { full_name: string } | null;
};

const INITIAL: { error?: string } = {};

export function OvertimeClient({
  employees,
  records,
}: {
  employees: Employee[];
  records: OtRecord[];
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createOvertimeRecordAction, INITIAL);
  const [, startTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
        router.refresh();
      }
    });
  }

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

      {/* OT records list */}
      <div className="rounded-xl bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-black/5">
          <h2 className="text-sm font-semibold text-foreground">OT Records</h2>
        </div>
        {deleteError && (
          <p className="mx-4 mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            {deleteError}
          </p>
        )}
        {records.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">No OT records yet.</p>
        ) : (
          <ul className="divide-y divide-black/5">
            {records.map((r) => (
              <li key={r.id} className="flex items-start gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {r.employees?.full_name ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.work_date + "T00:00:00").toLocaleDateString("en-SG", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    {r.remarks ? ` · ${r.remarks}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold text-foreground">
                    ${Number(r.amount).toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(r.id)}
                    disabled={deletingId !== null}
                    className="rounded-lg px-2 py-1 text-xs text-red-600 border border-red-200 disabled:opacity-40"
                  >
                    {deletingId === r.id ? "…" : "Delete"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
