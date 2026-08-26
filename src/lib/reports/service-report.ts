import type { SupabaseClient } from "@supabase/supabase-js";

export interface ServiceReportTask {
  id: string;
  description: string;
  frequency: string;
  daysDone: number[]; // day-of-month numbers this task was completed
}

export interface ServiceReportArea {
  id: string;
  name: string;
  tasks: ServiceReportTask[];
}

export interface ServiceReportOverrides {
  remarks?: string | null;
  supervisorName?: string | null;
  coverMessage?: string | null;
  excludedItemIds?: string[];
}

export interface ServiceReportData {
  clientName: string;
  siteName: string;
  year: number;
  month: number; // 1-12
  monthLabel: string; // e.g. "August 2026"
  daysInMonth: number;
  areas: ServiceReportArea[];
  taskCount: number;
  totalCompletions: number;
  attendanceDays: number[]; // days with at least one accepted check-in
  remarks: string;
  supervisorName: string;
  coverMessage: string;
  generatedAt: string;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * Builds a month's service-report data for one site from the raw checklist
 * completions (source of truth) plus the manager's editable overrides. Used by
 * both the on-screen preview and the PDF generator so they never diverge.
 */
export async function buildServiceReportData(
  supabase: SupabaseClient,
  contractId: string,
  year: number,
  month: number,
  overrides: ServiceReportOverrides = {}
): Promise<ServiceReportData | null> {
  const { data: contract } = await supabase
    .from("contracts")
    .select("client_name, site_name")
    .eq("id", contractId)
    .maybeSingle();
  if (!contract) return null;

  const daysInMonth = new Date(year, month, 0).getDate();
  const monthStart = `${year}-${pad2(month)}-01`;
  const monthEnd = `${year}-${pad2(month)}-${pad2(daysInMonth)}`;

  const excluded = new Set(overrides.excludedItemIds ?? []);

  const [areasRes, itemsRes, completionsRes] = await Promise.all([
    supabase
      .from("checklist_areas")
      .select("id, name, sort_order")
      .eq("contract_id", contractId)
      .eq("active", true)
      .order("sort_order"),
    supabase
      .from("checklist_items")
      .select("id, area_id, description, frequency, sort_order")
      .eq("contract_id", contractId)
      .eq("active", true)
      .order("sort_order"),
    supabase
      .from("checklist_completions")
      .select("item_id, done_date")
      .eq("contract_id", contractId)
      .gte("done_date", monthStart)
      .lte("done_date", monthEnd),
  ]);

  // Map item_id -> set of day numbers completed.
  const doneByItem = new Map<string, Set<number>>();
  for (const c of completionsRes.data ?? []) {
    const day = Number(String(c.done_date).slice(8, 10));
    if (!doneByItem.has(c.item_id)) doneByItem.set(c.item_id, new Set());
    doneByItem.get(c.item_id)!.add(day);
  }

  // Group tasks under their area (excluded tasks dropped; empty areas omitted).
  const tasksByArea = new Map<string, ServiceReportTask[]>();
  for (const i of itemsRes.data ?? []) {
    if (excluded.has(i.id)) continue;
    if (!tasksByArea.has(i.area_id)) tasksByArea.set(i.area_id, []);
    tasksByArea.get(i.area_id)!.push({
      id: i.id,
      description: i.description,
      frequency: i.frequency,
      daysDone: [...(doneByItem.get(i.id) ?? [])].sort((a, b) => a - b),
    });
  }

  const areas: ServiceReportArea[] = (areasRes.data ?? [])
    .map((a) => ({ id: a.id, name: a.name, tasks: tasksByArea.get(a.id) ?? [] }))
    .filter((a) => a.tasks.length > 0);

  const taskCount = areas.reduce((n, a) => n + a.tasks.length, 0);
  const totalCompletions = areas.reduce(
    (sum, a) => sum + a.tasks.reduce((s, t) => s + t.daysDone.length, 0),
    0
  );

  // Attendance: days with at least one accepted check-in (SGT month window).
  const startInstant = new Date(`${monthStart}T00:00:00+08:00`).toISOString();
  const endInstant = new Date(
    `${year}-${pad2(month === 12 ? 1 : month + 1)}-01T00:00:00+08:00`
  );
  if (month === 12) endInstant.setUTCFullYear(year + 1);
  const { data: attendance } = await supabase
    .from("attendance_events")
    .select("occurred_at")
    .eq("contract_id", contractId)
    .eq("status", "accepted")
    .eq("event_type", "check_in")
    .gte("occurred_at", startInstant)
    .lt("occurred_at", endInstant.toISOString());

  const attendanceDaySet = new Set<number>();
  for (const a of attendance ?? []) {
    // Convert to SGT day number.
    const sgDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Singapore" }).format(
      new Date(a.occurred_at)
    );
    attendanceDaySet.add(Number(sgDate.slice(8, 10)));
  }

  const monthLabel = new Date(year, month - 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  return {
    clientName: contract.client_name,
    siteName: contract.site_name,
    year,
    month,
    monthLabel,
    daysInMonth,
    areas,
    taskCount,
    totalCompletions,
    attendanceDays: [...attendanceDaySet].sort((a, b) => a - b),
    remarks: overrides.remarks ?? "",
    supervisorName: overrides.supervisorName ?? "",
    coverMessage: overrides.coverMessage ?? "",
    generatedAt: new Date().toISOString(),
  };
}
