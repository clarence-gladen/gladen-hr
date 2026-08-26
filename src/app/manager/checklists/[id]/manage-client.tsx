"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import {
  addAreaAction,
  assignAreaAction,
  deleteAreaAction,
  addChecklistItemAction,
  deleteChecklistItemAction,
} from "../actions";

export interface Area {
  id: string;
  name: string;
  assigned_employee_id: string | null;
  sort_order: number;
}
export interface Task {
  id: string;
  area_id: string;
  description: string;
  frequency: "daily" | "weekly" | "monthly";
  requires_photo: boolean;
  active: boolean;
  sort_order: number;
}
export interface EmployeeOption {
  id: string;
  fullName: string;
}

const inputClass =
  "w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-base focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";
const labelClass = "mb-1 block text-sm font-medium text-foreground";

export function ChecklistManageClient({
  contractId,
  siteName,
  clientName,
  areas,
  tasks,
  employees,
}: {
  contractId: string;
  siteName: string;
  clientName: string;
  areas: Area[];
  tasks: Task[];
  employees: EmployeeOption[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newAreaName, setNewAreaName] = useState("");
  const [newAreaAssignee, setNewAreaAssignee] = useState("");

  function run(fn: () => Promise<{ error?: string }>) {
    setError(null);
    setBusy(true);
    startTransition(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
      else router.refresh();
      setBusy(false);
    });
  }

  function addArea() {
    if (!newAreaName.trim()) return;
    run(() => addAreaAction(contractId, newAreaName, newAreaAssignee || null));
    setNewAreaName("");
    setNewAreaAssignee("");
  }

  const empName = (id: string | null) =>
    id ? employees.find((e) => e.id === id)?.fullName ?? "Unknown" : null;

  return (
    <>
      <Header title="Checklist" />
      <main className="flex-1 px-4 py-6 space-y-5">
        <div>
          <p className="text-lg font-semibold">{siteName}</p>
          <p className="text-sm text-foreground/50">{clientName}</p>
        </div>

        {employees.length === 0 && (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            No employees are assigned to this site yet. Assign cleaners to this site first
            (Contracts → this site) so you can assign areas to them.
          </p>
        )}

        {areas.length === 0 ? (
          <p className="text-sm text-foreground/50">No areas yet. Add the first one below.</p>
        ) : (
          areas.map((area) => (
            <AreaBlock
              key={area.id}
              area={area}
              tasks={tasks.filter((t) => t.area_id === area.id)}
              employees={employees}
              busy={busy}
              assignedName={empName(area.assigned_employee_id)}
              onAssign={(empId) => run(() => assignAreaAction(contractId, area.id, empId))}
              onDeleteArea={() => run(() => deleteAreaAction(contractId, area.id))}
              onAddTask={(desc, freq, photo) =>
                run(() => addChecklistItemAction(contractId, area.id, desc, freq, photo))
              }
              onDeleteTask={(taskId) => run(() => deleteChecklistItemAction(contractId, taskId))}
            />
          ))
        )}

        {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        {/* Add area */}
        <div className="space-y-3 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold">Add an area</p>
          <div>
            <label className={labelClass} htmlFor="areaName">
              Area name
            </label>
            <input
              id="areaName"
              value={newAreaName}
              onChange={(e) => setNewAreaName(e.target.value)}
              placeholder="e.g. Level 1 Lobby"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="areaAssignee">
              Assign to <span className="font-normal text-foreground/40">(optional)</span>
            </label>
            <select
              id="areaAssignee"
              value={newAreaAssignee}
              onChange={(e) => setNewAreaAssignee(e.target.value)}
              className={inputClass}
            >
              <option value="">— Unassigned —</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={busy || !newAreaName.trim()}
            onClick={addArea}
            className="w-full rounded-lg bg-brand py-3 text-base font-semibold text-white transition disabled:opacity-60"
          >
            Add area
          </button>
        </div>
      </main>
    </>
  );
}

function AreaBlock({
  area,
  tasks,
  employees,
  busy,
  assignedName,
  onAssign,
  onDeleteArea,
  onAddTask,
  onDeleteTask,
}: {
  area: Area;
  tasks: Task[];
  employees: EmployeeOption[];
  busy: boolean;
  assignedName: string | null;
  onAssign: (empId: string | null) => void;
  onDeleteArea: () => void;
  onAddTask: (desc: string, freq: string, photo: boolean) => void;
  onDeleteTask: (taskId: string) => void;
}) {
  const [desc, setDesc] = useState("");
  const [freq, setFreq] = useState("daily");
  const [photo, setPhoto] = useState(false);

  function submit() {
    if (!desc.trim()) return;
    onAddTask(desc, freq, photo);
    setDesc("");
    setFreq("daily");
    setPhoto(false);
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white shadow-sm">
      {/* Area header */}
      <div className="border-b border-black/5 px-4 py-3">
        <div className="flex items-center justify-between">
          <p className="text-base font-semibold">{area.name}</p>
          <button
            type="button"
            disabled={busy}
            onClick={onDeleteArea}
            className="text-xs font-medium text-red-600 disabled:opacity-50"
          >
            Delete area
          </button>
        </div>
        <div className="mt-2">
          <label className="mb-1 block text-xs text-foreground/50">Assigned cleaner</label>
          <select
            value={area.assigned_employee_id ?? ""}
            disabled={busy}
            onChange={(e) => onAssign(e.target.value || null)}
            className={`${inputClass} ${!area.assigned_employee_id ? "text-foreground/50" : ""}`}
          >
            <option value="">— Unassigned —</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.fullName}
              </option>
            ))}
          </select>
          {!area.assigned_employee_id && (
            <p className="mt-1 text-xs text-amber-700">Unassigned — no cleaner will see these tasks.</p>
          )}
          {assignedName && (
            <p className="sr-only">Assigned to {assignedName}</p>
          )}
        </div>
      </div>

      {/* Tasks in area */}
      {tasks.length > 0 && (
        <ul>
          {tasks.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 border-b border-black/5 px-4 py-2.5 last:border-b-0"
            >
              <div>
                <p className="text-sm">{t.description}</p>
                <p className="text-xs text-foreground/50">
                  {t.frequency}
                  {t.requires_photo ? " · photo" : ""}
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => onDeleteTask(t.id)}
                className="shrink-0 text-xs font-medium text-red-600 disabled:opacity-50"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add task within this area */}
      <div className="space-y-2 px-4 py-3">
        <input
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Add a task (e.g. Sweeping)"
          className={inputClass}
        />
        <div className="flex items-center gap-2">
          <select value={freq} onChange={(e) => setFreq(e.target.value)} className={`${inputClass} flex-1`}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <label className="flex items-center gap-2 whitespace-nowrap text-sm">
            <input
              type="checkbox"
              checked={photo}
              onChange={(e) => setPhoto(e.target.checked)}
              className="h-5 w-5 rounded border-black/20 text-brand focus:ring-brand/30"
            />
            Photo
          </label>
        </div>
        <button
          type="button"
          disabled={busy || !desc.trim()}
          onClick={submit}
          className="w-full rounded-lg border border-brand py-2.5 text-sm font-semibold text-brand transition disabled:opacity-50"
        >
          Add task
        </button>
      </div>
    </div>
  );
}
