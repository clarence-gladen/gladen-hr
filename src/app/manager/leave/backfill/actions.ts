"use server";

import { createClient } from "@/lib/supabase/server";
import type { LeaveType } from "@/lib/types/database";

interface LeaveEntry {
  nameSearch: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
}

// All entries exactly as provided. Hospital leave uses full calendar days;
// all other types use working days per the employee's work_days_per_week.
const ENTRIES: LeaveEntry[] = [
  // Babu A/L Yegambaram
  { nameSearch: "%Babu%Yegambaram%",   leaveType: "annual",           startDate: "2026-05-28", endDate: "2026-05-30" },
  { nameSearch: "%Babu%Yegambaram%",   leaveType: "annual",           startDate: "2026-06-02", endDate: "2026-06-02" },
  // Cheok Soon Teck (6-day worker — work_days_per_week updated below)
  { nameSearch: "%Cheok Soon Teck%",   leaveType: "annual",           startDate: "2026-05-30", endDate: "2026-05-30" },
  { nameSearch: "%Cheok Soon Teck%",   leaveType: "annual",           startDate: "2026-06-02", endDate: "2026-06-02" },
  { nameSearch: "%Cheok Soon Teck%",   leaveType: "sick",             startDate: "2026-06-23", endDate: "2026-06-25" },
  // Narish Kumar
  { nameSearch: "%Narish Kumar%",      leaveType: "no_pay",           startDate: "2026-06-03", endDate: "2026-06-03" },
  { nameSearch: "%Narish Kumar%",      leaveType: "no_pay",           startDate: "2026-06-09", endDate: "2026-06-09" },
  { nameSearch: "%Narish Kumar%",      leaveType: "no_pay",           startDate: "2026-06-15", endDate: "2026-06-15" },
  // Hyrunsa Beevi
  { nameSearch: "%Beevi%",             leaveType: "sick",             startDate: "2026-06-05", endDate: "2026-06-05" },
  // Jumari Bin Supargi — hospital = full calendar duration
  { nameSearch: "%Jumari%",            leaveType: "hospitalization",  startDate: "2026-06-05", endDate: "2026-06-18" },
  // Peh Lian Sin
  { nameSearch: "%Peh Lian Sin%",      leaveType: "sick",             startDate: "2026-06-09", endDate: "2026-06-10" },
  // Ng Bee Eng (Irene)
  { nameSearch: "%Ng Bee Eng%",        leaveType: "annual",           startDate: "2026-06-09", endDate: "2026-06-09" },
  // Vickneswari Manickam (Vickne / Vicky)
  { nameSearch: "%Vickneswari%",       leaveType: "annual",           startDate: "2026-06-09", endDate: "2026-06-09" },
  { nameSearch: "%Vickneswari%",       leaveType: "annual",           startDate: "2026-06-22", endDate: "2026-06-24" },
  // Mak Kam Choon
  { nameSearch: "%Mak Kam Choon%",     leaveType: "sick",             startDate: "2026-06-09", endDate: "2026-06-10" },
  { nameSearch: "%Mak Kam Choon%",     leaveType: "no_pay",           startDate: "2026-06-15", endDate: "2026-06-26" },
  // Leong Peng Kuen (Leong Peng Guan)
  { nameSearch: "%Leong Peng%",        leaveType: "sick",             startDate: "2026-06-12", endDate: "2026-06-12" },
  // Zhu Zheng Li
  { nameSearch: "%Zhu Zheng Li%",      leaveType: "sick",             startDate: "2026-06-15", endDate: "2026-06-15" },
  // Kwan Tuck Fatt
  { nameSearch: "%Kwan Tuck Fatt%",    leaveType: "annual",           startDate: "2026-06-17", endDate: "2026-06-18" },
  { nameSearch: "%Kwan Tuck Fatt%",    leaveType: "sick",             startDate: "2026-06-26", endDate: "2026-06-26" },
  // Thashini Sri S Perianan (Shini)
  { nameSearch: "%Thashini%",          leaveType: "no_pay",           startDate: "2026-06-17", endDate: "2026-06-17" },
  { nameSearch: "%Thashini%",          leaveType: "no_pay",           startDate: "2026-06-30", endDate: "2026-07-01" },
  // Mohd Hisam Bin Barah
  { nameSearch: "%Hisam%",             leaveType: "annual",           startDate: "2026-06-22", endDate: "2026-06-22" },
  // R Asha Devi
  { nameSearch: "%Asha%",              leaveType: "sick",             startDate: "2026-06-24", endDate: "2026-06-25" },
  // Ragini L Dorairaju
  { nameSearch: "%Ragini%",            leaveType: "sick",             startDate: "2026-06-25", endDate: "2026-06-26" },
  { nameSearch: "%Ragini%",            leaveType: "annual",           startDate: "2026-06-29", endDate: "2026-06-30" },
];

function countWorkingDays(start: string, end: string, workDays: 5 | 6): number {
  const cur = new Date(start + "T00:00:00");
  const endDate = new Date(end + "T00:00:00");
  let count = 0;
  while (cur <= endDate) {
    const day = cur.getDay();
    if (workDays === 6 ? day !== 0 : day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

function countCalendarDays(start: string, end: string): number {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  return Math.floor((e.getTime() - s.getTime()) / 86_400_000) + 1;
}

export interface BackfillResult {
  label: string;
  status: "ok" | "skipped" | "error";
  days?: number;
  message?: string;
}

export async function runLeaveBackfillAction(): Promise<{ results: BackfillResult[] }> {
  const supabase = await createClient();
  const results: BackfillResult[] = [];

  // Fix Cheok Soon Teck to 6-day schedule before processing
  await supabase
    .from("employees")
    .update({ work_days_per_week: 6 })
    .ilike("full_name", "%Cheok Soon Teck%");

  // Cache employee lookups to avoid redundant queries
  const empCache = new Map<string, { id: string; full_name: string; work_days_per_week: number } | null>();

  for (const entry of ENTRIES) {
    const label = `${entry.nameSearch.replace(/%/g, "").trim()} · ${entry.startDate}${entry.startDate !== entry.endDate ? " → " + entry.endDate : ""}`;

    if (!empCache.has(entry.nameSearch)) {
      const { data } = await supabase
        .from("employees")
        .select("id, full_name, work_days_per_week")
        .ilike("full_name", entry.nameSearch)
        .eq("status", "active")
        .maybeSingle();
      empCache.set(entry.nameSearch, data ?? null);
    }

    const emp = empCache.get(entry.nameSearch)!;
    if (!emp) {
      results.push({ label, status: "skipped", message: "Employee not found in database" });
      continue;
    }

    const workDays: 5 | 6 = emp.work_days_per_week === 6 ? 6 : 5;
    const days =
      entry.leaveType === "hospitalization"
        ? countCalendarDays(entry.startDate, entry.endDate)
        : countWorkingDays(entry.startDate, entry.endDate, workDays);

    if (days === 0) {
      results.push({ label: `${emp.full_name} · ${entry.startDate}`, status: "skipped", message: "No working days in range" });
      continue;
    }

    const { data: req, error: insertErr } = await supabase
      .from("leave_requests")
      .insert({
        employee_id: emp.id,
        leave_type: entry.leaveType,
        start_date: entry.startDate,
        end_date: entry.endDate,
        days,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertErr || !req) {
      results.push({ label: `${emp.full_name} · ${entry.startDate}`, status: "error", message: insertErr?.message ?? "Insert failed" });
      continue;
    }

    const { error: approveErr } = await supabase.rpc("approve_leave_request", { request_id: req.id });
    if (approveErr) {
      results.push({ label: `${emp.full_name} · ${entry.startDate}`, status: "error", days, message: `Approve failed: ${approveErr.message}` });
      continue;
    }

    results.push({ label: `${emp.full_name} · ${entry.startDate}${entry.startDate !== entry.endDate ? " → " + entry.endDate : ""}`, status: "ok", days });
  }

  return { results };
}
