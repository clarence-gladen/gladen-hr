import type { SupabaseClient } from "@supabase/supabase-js";

export interface ServiceReportTask {
  id: string;
  description: string;
  frequency: string;
  area: string | null;
  daysDone: number[]; // day-of-month numbers this task was completed
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
  tasks: ServiceReportTask[];
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

  const [itemsRes, completionsRes] = await Promise.all([
    supabase
      .from("checklist_items")
      .select("id, description, frequency, area, sort_order")
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

  const tasks: ServiceReportTask[] = (itemsRes.data ?? [])
    .filter((i) => !excluded.has(i.id))
    .map((i) => ({
      id: i.id,
      description: i.description,
      frequency: i.frequency,
      area: i.area,
      daysDone: [...(doneByItem.get(i.id) ?? [])].sort((a, b) => a - b),
    }));

  const totalCompletions = tasks.reduce((sum, t) => sum + t.daysDone.length, 0);

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
    tasks,
    totalCompletions,
    attendanceDays: [...attendanceDaySet].sort((a, b) => a - b),
    remarks: overrides.remarks ?? "",
    supervisorName: overrides.supervisorName ?? "",
    coverMessage: overrides.coverMessage ?? "",
    generatedAt: new Date().toISOString(),
  };
}
