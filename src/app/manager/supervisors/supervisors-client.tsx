"use client";

import { useActionState, useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import {
  grantSupervisorAction,
  revokeSupervisorAction,
  saveSupervisorSitesAction,
} from "./actions";

type EmployeeRow = { id: string; full_name: string; is_supervisor: boolean };
type ContractRow = { id: string; client_name: string; site_name: string };
type AssignmentRow = { employee_id: string; contract_id: string };

const inputClass =
  "w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm";

function SupervisorCard({
  supervisor,
  contracts,
  assignedContractIds,
}: {
  supervisor: EmployeeRow;
  contracts: ContractRow[];
  assignedContractIds: Set<string>;
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [saveState, saveAction, saving] = useActionState(
    saveSupervisorSitesAction.bind(null, supervisor.id),
    {} as { error?: string }
  );

  function handleRevoke() {
    setRevokeError(null);
    startTransition(async () => {
      const result = await revokeSupervisorAction(supervisor.id);
      if (result?.error) {
        setRevokeError(result.error);
      } else {
        addToast("Supervisor removed");
        router.refresh();
      }
    });
  }

  return (
    <li className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold text-foreground">{supervisor.full_name}</p>
        {confirmRevoke ? (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={handleRevoke}
              className="rounded-full bg-red-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-60"
            >
              {isPending ? "…" : "Confirm"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmRevoke(false)}
              className="rounded-full bg-black/5 px-3 py-1 text-xs font-medium text-foreground"
            >
              Back
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmRevoke(true)}
            className="shrink-0 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600"
          >
            Remove
          </button>
        )}
      </div>
      {revokeError && <p className="mt-2 text-sm text-red-600">{revokeError}</p>}

      <form action={saveAction} className="mt-3 space-y-3">
        <p className="text-xs font-medium text-foreground/60">Sites they cover</p>
        {contracts.length === 0 ? (
          <p className="text-sm text-foreground/60">No active contracts yet.</p>
        ) : (
          <div className="space-y-2">
            {contracts.map((c) => (
              <label key={c.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="contractIds"
                  value={c.id}
                  defaultChecked={assignedContractIds.has(c.id)}
                  className="h-4 w-4 rounded border-black/20 accent-brand"
                />
                <span className="text-sm text-foreground">
                  {c.client_name} — {c.site_name}
                </span>
              </label>
            ))}
          </div>
        )}
        {saveState.error && <p className="text-sm text-red-600">{saveState.error}</p>}
        <button
          type="submit"
          disabled={saving || contracts.length === 0}
          className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Sites"}
        </button>
      </form>
    </li>
  );
}

export function SupervisorsClient({
  employees,
  contracts,
  assignments,
}: {
  employees: EmployeeRow[];
  contracts: ContractRow[];
  assignments: AssignmentRow[];
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState("");
  const [grantError, setGrantError] = useState<string | null>(null);

  const supervisors = employees.filter((e) => e.is_supervisor);
  const candidates = employees.filter((e) => !e.is_supervisor);

  const sitesByEmployee = new Map<string, Set<string>>();
  for (const a of assignments) {
    const set = sitesByEmployee.get(a.employee_id) ?? new Set<string>();
    set.add(a.contract_id);
    sitesByEmployee.set(a.employee_id, set);
  }

  function handleGrant() {
    if (!selectedId) return;
    setGrantError(null);
    startTransition(async () => {
      const result = await grantSupervisorAction(selectedId);
      if (result?.error) {
        setGrantError(result.error);
      } else {
        setSelectedId("");
        addToast("Supervisor added");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-foreground">Add Supervisor</h2>
        <p className="mb-3 text-xs text-foreground/50">
          Supervisors get an OT tab in their employee app to log overtime for workers at their
          assigned sites.
        </p>
        <div className="flex gap-2">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className={inputClass}
          >
            <option value="">Select employee…</option>
            {candidates.map((e) => (
              <option key={e.id} value={e.id}>
                {e.full_name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!selectedId || isPending}
            onClick={handleGrant}
            className="shrink-0 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isPending ? "…" : "Add"}
          </button>
        </div>
        {grantError && <p className="mt-2 text-sm text-red-600">{grantError}</p>}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-foreground/60">Current Supervisors</h2>
        {supervisors.length === 0 ? (
          <p className="text-sm text-foreground/60">No supervisors yet.</p>
        ) : (
          <ul className="space-y-3">
            {supervisors.map((s) => (
              <SupervisorCard
                key={s.id}
                supervisor={s}
                contracts={contracts}
                assignedContractIds={sitesByEmployee.get(s.id) ?? new Set()}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
