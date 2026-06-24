"use server";

import { createClient } from "@/lib/supabase/server";
import type { LeaveType } from "@/lib/types/database";

export interface BackfillResult {
  name: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  status: "ok" | "skipped" | "error";
  message?: string;
}

interface LeaveEntry {
  nameSearch: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  halfDay?: boolean;
}

function countWorkingDays(start: string, end: string, workDays: 5 | 6 = 5, restDay: 0 | 6 = 0): number {
  const cur = new Date(start + "T00:00:00");
  const endDate = new Date(end + "T00:00:00");
  if (endDate < cur) return 0;
  let count = 0;
  while (cur <= endDate) {
    const day = cur.getDay();
    if (workDays === 5) {
      if (day !== 0 && day !== 6) count++;
    } else {
      if (day !== restDay) count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

function countCalendarDays(start: string, end: string): number {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  return Math.floor((e.getTime() - s.getTime()) / 86_400_000) + 1;
}

async function processEntries(
  supabase: Awaited<ReturnType<typeof createClient>>,
  entries: LeaveEntry[]
): Promise<BackfillResult[]> {
  const results: BackfillResult[] = [];
  const cache: Record<string, { id: string; full_name: string; work_days_per_week: number; work_rest_day: number } | null> = {};

  for (const entry of entries) {
    if (!(entry.nameSearch in cache)) {
      const { data } = await supabase
        .from("employees")
        .select("id, full_name, work_days_per_week, work_rest_day")
        .ilike("full_name", entry.nameSearch)
        .maybeSingle();
      cache[entry.nameSearch] = data;
    }
    const emp = cache[entry.nameSearch];

    if (!emp) {
      results.push({ name: entry.nameSearch, leaveType: entry.leaveType, startDate: entry.startDate, endDate: entry.endDate, days: 0, status: "skipped", message: "Employee not found" });
      continue;
    }

    const workDays: 5 | 6 = emp.work_days_per_week === 6 ? 6 : 5;
    const restDay: 0 | 6 = (emp.work_rest_day as number) === 6 ? 6 : 0;
    let days: number;
    if (entry.halfDay) {
      days = 0.5;
    } else if (entry.leaveType === "hospitalization" || entry.leaveType === "off_day") {
      days = countCalendarDays(entry.startDate, entry.endDate);
    } else {
      days = countWorkingDays(entry.startDate, entry.endDate, workDays, restDay);
    }

    if (days === 0) {
      results.push({ name: emp.full_name, leaveType: entry.leaveType, startDate: entry.startDate, endDate: entry.endDate, days: 0, status: "skipped", message: `0 working days (${workDays}-day worker, rest=${restDay === 6 ? "Sat" : "Sun"})` });
      continue;
    }

    const { data: request, error: insertError } = await supabase
      .from("leave_requests")
      .insert({ employee_id: emp.id, leave_type: entry.leaveType, start_date: entry.startDate, end_date: entry.endDate, days, reason: "Backfill", status: "pending" })
      .select("id")
      .single();

    if (insertError || !request) {
      results.push({ name: emp.full_name, leaveType: entry.leaveType, startDate: entry.startDate, endDate: entry.endDate, days, status: "error", message: insertError?.message ?? "Insert failed" });
      continue;
    }

    const { error: approveError } = await supabase.rpc("approve_leave_request", { request_id: request.id });
    if (approveError) {
      results.push({ name: emp.full_name, leaveType: entry.leaveType, startDate: entry.startDate, endDate: entry.endDate, days, status: "error", message: `Approve failed: ${approveError.message}` });
      continue;
    }

    results.push({ name: emp.full_name, leaveType: entry.leaveType, startDate: entry.startDate, endDate: entry.endDate, days, status: "ok" });
  }
  return results;
}

// ─── JANUARY 2025 ─────────────────────────────────────────────────────────────
export async function runBackfillJan2025Action(): Promise<BackfillResult[]> {
  const supabase = await createClient();
  return processEntries(supabase, [
    { nameSearch: "%Jumari%",         leaveType: "sick",   startDate: "2025-01-03", endDate: "2025-01-03" },
    { nameSearch: "%Kwan Tuck Fatt%", leaveType: "sick",   startDate: "2025-01-06", endDate: "2025-01-07" },
    { nameSearch: "%Cheok Soon Teck%",leaveType: "annual", startDate: "2025-01-06", endDate: "2025-01-11" },
    { nameSearch: "%Narish Kumar%",   leaveType: "annual", startDate: "2025-01-09", endDate: "2025-01-09" },
    { nameSearch: "%Thashini%",       leaveType: "annual", startDate: "2025-01-13", endDate: "2025-01-14" },
    { nameSearch: "%Peh Lian Sin%",   leaveType: "sick",   startDate: "2025-01-16", endDate: "2025-01-16" },
    { nameSearch: "%Cheok Soon Teck%",leaveType: "annual", startDate: "2025-01-18", endDate: "2025-01-18" },
    { nameSearch: "%Babu%",           leaveType: "annual", startDate: "2025-01-18", endDate: "2025-01-25" },
    { nameSearch: "%Leong Peng%",     leaveType: "annual", startDate: "2025-01-22", endDate: "2025-01-22", halfDay: true },
    { nameSearch: "%Leong Peng%",     leaveType: "annual", startDate: "2025-01-27", endDate: "2025-02-04" },
    { nameSearch: "%Peh Lian Sin%",   leaveType: "annual", startDate: "2025-01-27", endDate: "2025-01-28" },
    { nameSearch: "%Kwan Tuck Fatt%", leaveType: "annual", startDate: "2025-01-31", endDate: "2025-01-31" },
  ]);
}

// ─── FEBRUARY 2025 ────────────────────────────────────────────────────────────
export async function runBackfillFeb2025Action(): Promise<BackfillResult[]> {
  const supabase = await createClient();
  return processEntries(supabase, [
    { nameSearch: "%Beevi%",          leaveType: "sick",   startDate: "2025-02-03", endDate: "2025-02-04" },
    { nameSearch: "%Latifah%",        leaveType: "annual", startDate: "2025-02-03", endDate: "2025-02-12" },
    { nameSearch: "%Latifah%",        leaveType: "no_pay", startDate: "2025-02-13", endDate: "2025-02-18" },
    { nameSearch: "%Mak Kam Choon%",  leaveType: "sick",   startDate: "2025-02-06", endDate: "2025-02-06" },
    { nameSearch: "%Kan%Meng%",       leaveType: "sick",   startDate: "2025-02-06", endDate: "2025-02-07" },
    { nameSearch: "%Parvathy%",       leaveType: "annual", startDate: "2025-02-08", endDate: "2025-02-08" },
    { nameSearch: "%Wan Chee Seng%",  leaveType: "sick",   startDate: "2025-02-10", endDate: "2025-02-10" },
    { nameSearch: "%Thashini%",       leaveType: "annual", startDate: "2025-02-10", endDate: "2025-02-11" },
    { nameSearch: "%Narish Kumar%",   leaveType: "annual", startDate: "2025-02-11", endDate: "2025-02-11" },
    { nameSearch: "%Peh Lian Sin%",   leaveType: "annual", startDate: "2025-02-12", endDate: "2025-02-12" },
    { nameSearch: "%Mak Kam Choon%",  leaveType: "annual", startDate: "2025-02-14", endDate: "2025-02-14" },
    { nameSearch: "%Wan Chee Seng%",  leaveType: "sick",   startDate: "2025-02-17", endDate: "2025-02-17" },
    { nameSearch: "%Beevi%",          leaveType: "annual", startDate: "2025-02-19", endDate: "2025-02-19" },
    { nameSearch: "%Suriakala%",      leaveType: "annual", startDate: "2025-02-20", endDate: "2025-02-20" },
    { nameSearch: "%Kwan Tuck Fatt%", leaveType: "annual", startDate: "2025-02-25", endDate: "2025-02-25" },
    { nameSearch: "%Peh Lian Sin%",   leaveType: "sick",   startDate: "2025-02-24", endDate: "2025-02-25" },
  ]);
}

// ─── MARCH 2025 ───────────────────────────────────────────────────────────────
export async function runBackfillMar2025Action(): Promise<BackfillResult[]> {
  const supabase = await createClient();
  return processEntries(supabase, [
    { nameSearch: "%Thang Mun Mang%", leaveType: "annual", startDate: "2025-03-02", endDate: "2025-03-02" },
    { nameSearch: "%Kwan Tuck Fatt%", leaveType: "sick",   startDate: "2025-03-05", endDate: "2025-03-05" },
    { nameSearch: "%Narish Kumar%",   leaveType: "annual", startDate: "2025-03-10", endDate: "2025-03-10" },
    { nameSearch: "%Beevi%",          leaveType: "sick",   startDate: "2025-03-11", endDate: "2025-03-11" },
    { nameSearch: "%Kwan Tuck Fatt%", leaveType: "annual", startDate: "2025-03-12", endDate: "2025-03-12" },
    { nameSearch: "%Leong Peng%",     leaveType: "sick",   startDate: "2025-03-14", endDate: "2025-03-14" },
    { nameSearch: "%Leong Peng%",     leaveType: "sick",   startDate: "2025-03-21", endDate: "2025-03-21" },
    { nameSearch: "%Narish Kumar%",   leaveType: "annual", startDate: "2025-03-21", endDate: "2025-03-21" },
    { nameSearch: "%Suriakala%",      leaveType: "annual", startDate: "2025-03-24", endDate: "2025-03-24" },
    { nameSearch: "%Jumari%",         leaveType: "sick",   startDate: "2025-03-24", endDate: "2025-03-24" },
    { nameSearch: "%Narish Kumar%",   leaveType: "annual", startDate: "2025-03-25", endDate: "2025-03-25" },
    { nameSearch: "%Mak Kam Choon%",  leaveType: "sick",   startDate: "2025-03-26", endDate: "2025-03-27" },
    { nameSearch: "%Latifah%",        leaveType: "sick",   startDate: "2025-03-26", endDate: "2025-03-27" },
    { nameSearch: "%Beevi%",          leaveType: "annual", startDate: "2025-03-28", endDate: "2025-03-28", halfDay: true },
    { nameSearch: "%Sabina%",         leaveType: "annual", startDate: "2025-03-28", endDate: "2025-04-10" },
  ]);
}

// ─── APRIL 2025 ───────────────────────────────────────────────────────────────
export async function runBackfillApr2025Action(): Promise<BackfillResult[]> {
  const supabase = await createClient();
  return processEntries(supabase, [
    { nameSearch: "%Jumari%",         leaveType: "annual", startDate: "2025-04-01", endDate: "2025-04-04" },
    { nameSearch: "%Beevi%",          leaveType: "annual", startDate: "2025-04-01", endDate: "2025-04-04" },
    { nameSearch: "%Mak Kam Choon%",  leaveType: "annual", startDate: "2025-04-03", endDate: "2025-04-04" },
    { nameSearch: "%Leong Peng%",     leaveType: "sick",   startDate: "2025-04-03", endDate: "2025-04-04" },
    { nameSearch: "%Cheok Soon Teck%",leaveType: "annual", startDate: "2025-04-05", endDate: "2025-04-07" },
    { nameSearch: "%Leong Peng%",     leaveType: "sick",   startDate: "2025-04-09", endDate: "2025-04-10" },
    { nameSearch: "%Thashini%",       leaveType: "annual", startDate: "2025-04-09", endDate: "2025-04-09" },
    { nameSearch: "%Beevi%",          leaveType: "annual", startDate: "2025-04-11", endDate: "2025-04-11" },
    { nameSearch: "%Kwan Tuck Fatt%", leaveType: "annual", startDate: "2025-04-14", endDate: "2025-04-14" },
    { nameSearch: "%Zin Thu Htet%",   leaveType: "annual", startDate: "2025-04-14", endDate: "2025-04-16" },
    { nameSearch: "%Peh Lian Sin%",   leaveType: "sick",   startDate: "2025-04-15", endDate: "2025-04-15" },
    { nameSearch: "%Mak Kam Choon%",  leaveType: "sick",   startDate: "2025-04-16", endDate: "2025-04-16" },
    { nameSearch: "%Chan Yan Siew%",  leaveType: "annual", startDate: "2025-04-21", endDate: "2025-04-21" },
    { nameSearch: "%Latifah%",        leaveType: "no_pay", startDate: "2025-04-17", endDate: "2025-04-17" },
    { nameSearch: "%Latifah%",        leaveType: "no_pay", startDate: "2025-04-21", endDate: "2025-04-21" },
    { nameSearch: "%Leong Peng%",     leaveType: "sick",   startDate: "2025-04-24", endDate: "2025-04-25" },
    { nameSearch: "%Mak Kam Choon%",  leaveType: "annual", startDate: "2025-04-28", endDate: "2025-05-02" },
  ]);
}

// ─── MAY 2025 ─────────────────────────────────────────────────────────────────
export async function runBackfillMay2025Action(): Promise<BackfillResult[]> {
  const supabase = await createClient();
  return processEntries(supabase, [
    { nameSearch: "%Leong Peng%",     leaveType: "off_day", startDate: "2025-05-05", endDate: "2025-05-05" },
    { nameSearch: "%Narish Kumar%",   leaveType: "annual",  startDate: "2025-05-10", endDate: "2025-05-10" },
    { nameSearch: "%Narish Kumar%",   leaveType: "annual",  startDate: "2025-05-13", endDate: "2025-05-14" },
    { nameSearch: "%Kwan Tuck Fatt%", leaveType: "annual",  startDate: "2025-05-14", endDate: "2025-05-14" },
    { nameSearch: "%Jumari%",         leaveType: "annual",  startDate: "2025-05-16", endDate: "2025-05-16" },
    { nameSearch: "%Leong Peng%",     leaveType: "annual",  startDate: "2025-05-16", endDate: "2025-05-16" },
    { nameSearch: "%Babu%",           leaveType: "annual",  startDate: "2025-05-22", endDate: "2025-05-22" },
    { nameSearch: "%Latifah%",        leaveType: "off_day", startDate: "2025-05-26", endDate: "2025-05-26" },
    { nameSearch: "%Leong Peng%",     leaveType: "sick",    startDate: "2025-05-29", endDate: "2025-05-30" },
    { nameSearch: "%Parvathy%",       leaveType: "annual",  startDate: "2025-05-29", endDate: "2025-06-06" },
    { nameSearch: "%Thashini%",       leaveType: "off_day", startDate: "2025-05-30", endDate: "2025-05-30" },
  ]);
}

// ─── JUNE 2025 ────────────────────────────────────────────────────────────────
export async function runBackfillJun2025Action(): Promise<BackfillResult[]> {
  const supabase = await createClient();
  return processEntries(supabase, [
    { nameSearch: "%Kwan Tuck Fatt%", leaveType: "sick",    startDate: "2025-06-04", endDate: "2025-06-04" },
    { nameSearch: "%Latifah%",        leaveType: "no_pay",  startDate: "2025-06-06", endDate: "2025-06-06", halfDay: true },
    { nameSearch: "%Beevi%",          leaveType: "annual",  startDate: "2025-06-06", endDate: "2025-06-06" },
    { nameSearch: "%Jumari%",         leaveType: "annual",  startDate: "2025-06-06", endDate: "2025-06-06" },
    { nameSearch: "%Babu%",           leaveType: "annual",  startDate: "2025-06-09", endDate: "2025-06-10" },
    { nameSearch: "%Mak Kam Choon%",  leaveType: "sick",    startDate: "2025-06-09", endDate: "2025-06-09" },
    { nameSearch: "%Suriakala%",      leaveType: "annual",  startDate: "2025-06-10", endDate: "2025-06-10" },
    { nameSearch: "%Leong Peng%",     leaveType: "sick",    startDate: "2025-06-12", endDate: "2025-06-13" },
    { nameSearch: "%Jumari%",         leaveType: "sick",    startDate: "2025-06-13", endDate: "2025-06-13" },
    { nameSearch: "%Latifah%",        leaveType: "off_day", startDate: "2025-06-13", endDate: "2025-06-13" },
    { nameSearch: "%Thashini%",       leaveType: "annual",  startDate: "2025-06-16", endDate: "2025-06-16" },
    { nameSearch: "%Jumari%",         leaveType: "sick",    startDate: "2025-06-17", endDate: "2025-06-17" },
    { nameSearch: "%Peh Lian Sin%",   leaveType: "annual",  startDate: "2025-06-18", endDate: "2025-06-18" },
    { nameSearch: "%Narish Kumar%",   leaveType: "annual",  startDate: "2025-06-19", endDate: "2025-06-19" },
    { nameSearch: "%Jumari%",         leaveType: "sick",    startDate: "2025-06-20", endDate: "2025-06-20" },
    { nameSearch: "%Thashini%",       leaveType: "annual",  startDate: "2025-06-20", endDate: "2025-06-20" },
    { nameSearch: "%Babu%",           leaveType: "annual",  startDate: "2025-06-20", endDate: "2025-06-24" },
    { nameSearch: "%Mak Kam Choon%",  leaveType: "sick",    startDate: "2025-06-25", endDate: "2025-06-26" },
    { nameSearch: "%Kwan Tuck Fatt%", leaveType: "sick",    startDate: "2025-06-30", endDate: "2025-06-30" },
  ]);
}

// ─── JULY 2025 ────────────────────────────────────────────────────────────────
export async function runBackfillJul2025Action(): Promise<BackfillResult[]> {
  const supabase = await createClient();
  return processEntries(supabase, [
    { nameSearch: "%Wang Ying%",      leaveType: "annual",  startDate: "2025-07-02", endDate: "2025-07-05" },
    { nameSearch: "%Mak Kam Choon%",  leaveType: "off_day", startDate: "2025-07-04", endDate: "2025-07-04" },
    { nameSearch: "%Kwan Tuck Fatt%", leaveType: "sick",    startDate: "2025-07-07", endDate: "2025-07-07" },
    { nameSearch: "%Peh Lian Sin%",   leaveType: "sick",    startDate: "2025-07-07", endDate: "2025-07-08" },
    { nameSearch: "%Beevi%",          leaveType: "sick",    startDate: "2025-07-08", endDate: "2025-07-08" },
    { nameSearch: "%Mak Kam Choon%",  leaveType: "sick",    startDate: "2025-07-10", endDate: "2025-07-10" },
    { nameSearch: "%Latifah%",        leaveType: "no_pay",  startDate: "2025-07-10", endDate: "2025-07-10" },
    { nameSearch: "%Thashini%",       leaveType: "annual",  startDate: "2025-07-10", endDate: "2025-07-10" },
    { nameSearch: "%Leong Peng%",     leaveType: "sick",    startDate: "2025-07-10", endDate: "2025-07-11" },
    { nameSearch: "%Beevi%",          leaveType: "sick",    startDate: "2025-07-11", endDate: "2025-07-11", halfDay: true },
    { nameSearch: "%Peh Lian Sin%",   leaveType: "annual",  startDate: "2025-07-11", endDate: "2025-07-16" },
    { nameSearch: "%Mak Kam Choon%",  leaveType: "sick",    startDate: "2025-07-17", endDate: "2025-07-17" },
    { nameSearch: "%Thang Mun Mang%", leaveType: "sick",    startDate: "2025-07-20", endDate: "2025-07-20" },
    { nameSearch: "%Mak Kam Choon%",  leaveType: "annual",  startDate: "2025-07-21", endDate: "2025-07-21" },
    { nameSearch: "%Kan%Meng%",       leaveType: "sick",    startDate: "2025-07-24", endDate: "2025-07-25" },
    { nameSearch: "%Beevi%",          leaveType: "annual",  startDate: "2025-07-25", endDate: "2025-07-25" },
    { nameSearch: "%Ragini%",         leaveType: "annual",  startDate: "2025-07-25", endDate: "2025-07-30" },
    { nameSearch: "%Leong Peng%",     leaveType: "annual",  startDate: "2025-07-28", endDate: "2025-07-28" },
    { nameSearch: "%Thashini%",       leaveType: "annual",  startDate: "2025-07-28", endDate: "2025-07-28" },
    { nameSearch: "%Kan%Meng%",       leaveType: "sick",    startDate: "2025-07-30", endDate: "2025-07-31" },
  ]);
}

// ─── AUGUST 2025 ──────────────────────────────────────────────────────────────
export async function runBackfillAug2025Action(): Promise<BackfillResult[]> {
  const supabase = await createClient();
  return processEntries(supabase, [
    { nameSearch: "%Peh Lian Sin%",   leaveType: "sick",    startDate: "2025-08-04", endDate: "2025-08-04" },
    { nameSearch: "%Beevi%",          leaveType: "sick",    startDate: "2025-08-05", endDate: "2025-08-05" },
    { nameSearch: "%Thashini%",       leaveType: "annual",  startDate: "2025-08-06", endDate: "2025-08-06", halfDay: true },
    { nameSearch: "%Beevi%",          leaveType: "off_day", startDate: "2025-08-07", endDate: "2025-08-07", halfDay: true },
    { nameSearch: "%Narish Kumar%",   leaveType: "annual",  startDate: "2025-08-07", endDate: "2025-08-07" },
    { nameSearch: "%Thashini%",       leaveType: "no_pay",  startDate: "2025-08-07", endDate: "2025-08-07" },
    { nameSearch: "%Kan%Meng%",       leaveType: "sick",    startDate: "2025-08-08", endDate: "2025-08-08" },
    { nameSearch: "%Sabina%",         leaveType: "annual",  startDate: "2025-08-11", endDate: "2025-08-11" },
    { nameSearch: "%Babu%",           leaveType: "annual",  startDate: "2025-08-11", endDate: "2025-08-11" },
    { nameSearch: "%Leong Peng%",     leaveType: "off_day", startDate: "2025-08-11", endDate: "2025-08-11" },
    { nameSearch: "%Wan Chee Seng%",  leaveType: "sick",    startDate: "2025-08-11", endDate: "2025-08-11" },
    { nameSearch: "%Kwan Tuck Fatt%", leaveType: "off_day", startDate: "2025-08-12", endDate: "2025-08-12" },
    { nameSearch: "%Cheok Soon Teck%",leaveType: "annual",  startDate: "2025-08-15", endDate: "2025-08-23" },
    { nameSearch: "%Wan Chee Seng%",  leaveType: "sick",    startDate: "2025-08-18", endDate: "2025-08-18" },
    { nameSearch: "%Kan%Meng%",       leaveType: "off_day", startDate: "2025-08-18", endDate: "2025-08-18" },
    { nameSearch: "%Wan Chee Seng%",  leaveType: "sick",    startDate: "2025-08-20", endDate: "2025-08-20" },
    { nameSearch: "%Parvathy%",       leaveType: "annual",  startDate: "2025-08-25", endDate: "2025-08-25" },
    { nameSearch: "%Kwan Tuck Fatt%", leaveType: "sick",    startDate: "2025-08-25", endDate: "2025-08-26" },
    { nameSearch: "%Latifah%",        leaveType: "sick",    startDate: "2025-08-28", endDate: "2025-08-29" },
    { nameSearch: "%Heng Tao Nee%",   leaveType: "sick",    startDate: "2025-08-29", endDate: "2025-08-30" },
    { nameSearch: "%Narish Kumar%",   leaveType: "annual",  startDate: "2025-08-30", endDate: "2025-08-30" },
  ]);
}

// ─── SEPTEMBER 2025 ───────────────────────────────────────────────────────────
export async function runBackfillSep2025Action(): Promise<BackfillResult[]> {
  const supabase = await createClient();
  return processEntries(supabase, [
    { nameSearch: "%Heng Tao Nee%",   leaveType: "sick",    startDate: "2025-09-01", endDate: "2025-09-13" },
    { nameSearch: "%Beevi%",          leaveType: "sick",    startDate: "2025-09-02", endDate: "2025-09-03" },
    { nameSearch: "%Leong Peng%",     leaveType: "sick",    startDate: "2025-09-02", endDate: "2025-09-08" },
    { nameSearch: "%Ragini%",         leaveType: "annual",  startDate: "2025-09-03", endDate: "2025-09-03" },
    { nameSearch: "%Suriakala%",      leaveType: "annual",  startDate: "2025-09-04", endDate: "2025-09-04" },
    { nameSearch: "%Goh Kah Kim%",    leaveType: "annual",  startDate: "2025-09-04", endDate: "2025-09-04", halfDay: true },
    { nameSearch: "%Mak Kam Choon%",  leaveType: "sick",    startDate: "2025-09-04", endDate: "2025-09-04" },
    { nameSearch: "%Jumari%",         leaveType: "annual",  startDate: "2025-09-05", endDate: "2025-09-05" },
    { nameSearch: "%Parvathy%",       leaveType: "annual",  startDate: "2025-09-08", endDate: "2025-09-23" },
    { nameSearch: "%Jumari%",         leaveType: "sick",    startDate: "2025-09-12", endDate: "2025-09-12" },
    { nameSearch: "%Beevi%",          leaveType: "sick",    startDate: "2025-09-15", endDate: "2025-09-16" },
    { nameSearch: "%Kwan Tuck Fatt%", leaveType: "sick",    startDate: "2025-09-16", endDate: "2025-09-17" },
    { nameSearch: "%Latifah%",        leaveType: "annual",  startDate: "2025-09-17", endDate: "2025-09-17" },
    { nameSearch: "%Kan%Meng%",       leaveType: "sick",    startDate: "2025-09-18", endDate: "2025-09-18" },
    { nameSearch: "%Ragini%",         leaveType: "annual",  startDate: "2025-09-22", endDate: "2025-09-22" },
    { nameSearch: "%Thashini%",       leaveType: "sick",    startDate: "2025-09-22", endDate: "2025-09-25" },
    { nameSearch: "%Peh Lian Sin%",   leaveType: "sick",    startDate: "2025-09-25", endDate: "2025-09-25" },
    { nameSearch: "%Thang Mun Mang%", leaveType: "annual",  startDate: "2025-09-28", endDate: "2025-09-28" },
    { nameSearch: "%Ng Bee Eng%",     leaveType: "off_day", startDate: "2025-09-29", endDate: "2025-09-29" },
    { nameSearch: "%Thashini%",       leaveType: "annual",  startDate: "2025-09-30", endDate: "2025-09-30" },
  ]);
}

// ─── OCTOBER 2025 ─────────────────────────────────────────────────────────────
export async function runBackfillOct2025Action(): Promise<BackfillResult[]> {
  const supabase = await createClient();
  return processEntries(supabase, [
    { nameSearch: "%Leong Peng%",     leaveType: "annual",  startDate: "2025-10-01", endDate: "2025-10-01" },
    { nameSearch: "%Kwan Tuck Fatt%", leaveType: "sick",    startDate: "2025-10-01", endDate: "2025-10-02" },
    { nameSearch: "%Goh Kah Kim%",    leaveType: "annual",  startDate: "2025-10-01", endDate: "2025-10-03" },
    { nameSearch: "%Beevi%",          leaveType: "annual",  startDate: "2025-10-03", endDate: "2025-10-03" },
    { nameSearch: "%Wan Chee Seng%",  leaveType: "annual",  startDate: "2025-10-03", endDate: "2025-10-03" },
    { nameSearch: "%Wan Chee Seng%",  leaveType: "annual",  startDate: "2025-10-06", endDate: "2025-10-06" },
    { nameSearch: "%Goh Kah Kim%",    leaveType: "sick",    startDate: "2025-10-06", endDate: "2025-10-06" },
    { nameSearch: "%Leong Peng%",     leaveType: "annual",  startDate: "2025-10-06", endDate: "2025-10-06" },
    { nameSearch: "%Goh Kah Kim%",    leaveType: "sick",    startDate: "2025-10-08", endDate: "2025-10-08" },
    { nameSearch: "%Babu%",           leaveType: "annual",  startDate: "2025-10-09", endDate: "2025-10-09" },
    { nameSearch: "%Mak Kam Choon%",  leaveType: "sick",    startDate: "2025-10-10", endDate: "2025-10-10" },
    { nameSearch: "%Mak Kam Choon%",  leaveType: "sick",    startDate: "2025-10-13", endDate: "2025-10-13" },
    { nameSearch: "%Goh Kah Kim%",    leaveType: "annual",  startDate: "2025-10-14", endDate: "2025-10-14" },
    { nameSearch: "%Kan%Meng%",       leaveType: "sick",    startDate: "2025-10-16", endDate: "2025-10-16" },
    { nameSearch: "%Mak Kam Choon%",  leaveType: "sick",    startDate: "2025-10-16", endDate: "2025-10-16" },
    { nameSearch: "%Latifah%",        leaveType: "off_day", startDate: "2025-10-17", endDate: "2025-10-17" },
    { nameSearch: "%Suriakala%",      leaveType: "annual",  startDate: "2025-10-17", endDate: "2025-10-18" },
    { nameSearch: "%Narish Kumar%",   leaveType: "annual",  startDate: "2025-10-21", endDate: "2025-10-24" },
    { nameSearch: "%Beevi%",          leaveType: "off_day", startDate: "2025-10-23", endDate: "2025-10-23" },
    { nameSearch: "%Beevi%",          leaveType: "sick",    startDate: "2025-10-28", endDate: "2025-10-28" },
    { nameSearch: "%Kwan Tuck Fatt%", leaveType: "annual",  startDate: "2025-10-29", endDate: "2025-10-29" },
    { nameSearch: "%Mak Kam Choon%",  leaveType: "sick",    startDate: "2025-10-30", endDate: "2025-10-30" },
  ]);
}

// ─── NOVEMBER 2025 ────────────────────────────────────────────────────────────
export async function runBackfillNov2025Action(): Promise<BackfillResult[]> {
  const supabase = await createClient();
  return processEntries(supabase, [
    { nameSearch: "%Goh Kah Kim%",    leaveType: "annual",  startDate: "2025-11-03", endDate: "2025-11-03" },
    { nameSearch: "%Leong Peng%",     leaveType: "annual",  startDate: "2025-11-03", endDate: "2025-11-03" },
    { nameSearch: "%Ng Bee Eng%",     leaveType: "sick",    startDate: "2025-11-04", endDate: "2025-11-04" },
    { nameSearch: "%Latifah%",        leaveType: "annual",  startDate: "2025-11-04", endDate: "2025-11-04" },
    { nameSearch: "%Mak Kam Choon%",  leaveType: "annual",  startDate: "2025-11-07", endDate: "2025-11-07" },
    { nameSearch: "%Goh Kah Kim%",    leaveType: "sick",    startDate: "2025-11-10", endDate: "2025-11-10" },
    { nameSearch: "%Sabina%",         leaveType: "sick",    startDate: "2025-11-13", endDate: "2025-11-13" },
    { nameSearch: "%Beevi%",          leaveType: "off_day", startDate: "2025-11-14", endDate: "2025-11-14" },
    { nameSearch: "%Latifah%",        leaveType: "sick",    startDate: "2025-11-18", endDate: "2025-11-19" },
    { nameSearch: "%Ng Bee Eng%",     leaveType: "annual",  startDate: "2025-11-21", endDate: "2025-11-21" },
    { nameSearch: "%Kwan Tuck Fatt%", leaveType: "sick",    startDate: "2025-11-24", endDate: "2025-11-25" },
    { nameSearch: "%Thashini%",       leaveType: "annual",  startDate: "2025-11-28", endDate: "2025-11-28" },
    { nameSearch: "%Jumari%",         leaveType: "annual",  startDate: "2025-11-28", endDate: "2025-11-28" },
  ]);
}

// ─── DECEMBER 2025 ────────────────────────────────────────────────────────────
export async function runBackfillDec2025Action(): Promise<BackfillResult[]> {
  const supabase = await createClient();
  return processEntries(supabase, [
    { nameSearch: "%Suriakala%",      leaveType: "annual",  startDate: "2025-12-01", endDate: "2025-12-01" },
    { nameSearch: "%Thang Mun Mang%", leaveType: "sick",    startDate: "2025-12-01", endDate: "2025-12-01" },
    { nameSearch: "%Thashini%",       leaveType: "annual",  startDate: "2025-12-02", endDate: "2025-12-02", halfDay: true },
    { nameSearch: "%Mak Kam Choon%",  leaveType: "sick",    startDate: "2025-12-03", endDate: "2025-12-03" },
    { nameSearch: "%Beevi%",          leaveType: "sick",    startDate: "2025-12-03", endDate: "2025-12-03" },
    { nameSearch: "%Mak Kam Choon%",  leaveType: "annual",  startDate: "2025-12-04", endDate: "2025-12-04" },
    { nameSearch: "%Jumari%",         leaveType: "sick",    startDate: "2025-12-05", endDate: "2025-12-05" },
    { nameSearch: "%Peh Lian Sin%",   leaveType: "sick",    startDate: "2025-12-08", endDate: "2025-12-10" },
    { nameSearch: "%Jumari%",         leaveType: "sick",    startDate: "2025-12-09", endDate: "2025-12-09" },
    { nameSearch: "%Kan%Meng%",       leaveType: "annual",  startDate: "2025-12-10", endDate: "2025-12-10" },
    { nameSearch: "%Beevi%",          leaveType: "sick",    startDate: "2025-12-11", endDate: "2025-12-11" },
    { nameSearch: "%Cheok Soon Teck%",leaveType: "annual",  startDate: "2025-12-13", endDate: "2025-12-15" },
    { nameSearch: "%Ng Bee Eng%",     leaveType: "annual",  startDate: "2025-12-15", endDate: "2025-12-15", halfDay: true },
    { nameSearch: "%Leong Peng%",     leaveType: "annual",  startDate: "2025-12-16", endDate: "2025-12-16" },
    { nameSearch: "%Latifah%",        leaveType: "annual",  startDate: "2025-12-16", endDate: "2025-12-26" },
    { nameSearch: "%Leong Peng%",     leaveType: "annual",  startDate: "2025-12-19", endDate: "2025-12-22" },
    { nameSearch: "%Leong Peng%",     leaveType: "sick",    startDate: "2025-12-23", endDate: "2025-12-23" },
    { nameSearch: "%Thashini%",       leaveType: "annual",  startDate: "2025-12-22", endDate: "2025-12-26" },
    { nameSearch: "%Kwan Tuck Fatt%", leaveType: "sick",    startDate: "2025-12-24", endDate: "2025-12-26" },
    { nameSearch: "%Ng Bee Eng%",     leaveType: "annual",  startDate: "2025-12-24", endDate: "2025-12-24" },
    { nameSearch: "%Ng Bee Eng%",     leaveType: "annual",  startDate: "2025-12-26", endDate: "2025-12-26" },
    { nameSearch: "%Latifah%",        leaveType: "sick",    startDate: "2025-12-29", endDate: "2025-12-30" },
    { nameSearch: "%Wan Chee Seng%",  leaveType: "annual",  startDate: "2025-12-29", endDate: "2025-12-31" },
  ]);
}

// ─── 2026 UPCOMING LEAVE ──────────────────────────────────────────────────────
export async function runBackfill2026UpcomingAction(): Promise<BackfillResult[]> {
  const supabase = await createClient();
  return processEntries(supabase, [
    { nameSearch: "%Jumari%",   leaveType: "no_pay",  startDate: "2026-07-07", endDate: "2026-07-07" },
    { nameSearch: "%Jumari%",   leaveType: "no_pay",  startDate: "2026-07-09", endDate: "2026-07-09" },
    { nameSearch: "%Babu%",     leaveType: "annual",  startDate: "2026-07-11", endDate: "2026-07-11" },
    { nameSearch: "%Jumari%",   leaveType: "no_pay",  startDate: "2026-07-17", endDate: "2026-07-17" },
    { nameSearch: "%Ng Bee Eng%",leaveType: "annual", startDate: "2026-07-29", endDate: "2026-07-29" },
    { nameSearch: "%Jumari%",   leaveType: "no_pay",  startDate: "2026-08-24", endDate: "2026-08-24" },
    { nameSearch: "%Wang Ying%", leaveType: "annual", startDate: "2026-08-05", endDate: "2026-08-28" },
    { nameSearch: "%Latifah%",  leaveType: "annual",  startDate: "2026-10-09", endDate: "2026-10-13" },
    { nameSearch: "%Jumari%",   leaveType: "no_pay",  startDate: "2026-12-11", endDate: "2026-12-11" },
  ]);
}
