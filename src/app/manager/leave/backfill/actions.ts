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

function countWorkingDays(start: string, end: string, workDays: 5 | 6 = 5): number {
  const cur = new Date(start + "T00:00:00");
  const endDate = new Date(end + "T00:00:00");
  if (endDate < cur) return 0;
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

async function processEntries(
  supabase: Awaited<ReturnType<typeof createClient>>,
  entries: LeaveEntry[]
): Promise<BackfillResult[]> {
  const results: BackfillResult[] = [];
  const employeeCache: Record<string, { id: string; full_name: string; work_days_per_week: number } | null> = {};

  for (const entry of entries) {
    // Look up employee by name search (cached)
    if (!(entry.nameSearch in employeeCache)) {
      const { data } = await supabase
        .from("employees")
        .select("id, full_name, work_days_per_week")
        .ilike("full_name", entry.nameSearch)
        .maybeSingle();
      employeeCache[entry.nameSearch] = data;
    }
    const emp = employeeCache[entry.nameSearch];

    if (!emp) {
      results.push({
        name: entry.nameSearch,
        leaveType: entry.leaveType,
        startDate: entry.startDate,
        endDate: entry.endDate,
        days: 0,
        status: "skipped",
        message: "Employee not found",
      });
      continue;
    }

    const workDays: 5 | 6 = emp.work_days_per_week === 6 ? 6 : 5;

    let days: number;
    if (entry.halfDay) {
      days = 0.5;
    } else if (entry.leaveType === "hospitalization" || entry.leaveType === "off_day") {
      days = countCalendarDays(entry.startDate, entry.endDate);
    } else {
      days = countWorkingDays(entry.startDate, entry.endDate, workDays);
    }

    if (days === 0) {
      results.push({
        name: emp.full_name,
        leaveType: entry.leaveType,
        startDate: entry.startDate,
        endDate: entry.endDate,
        days: 0,
        status: "skipped",
        message: `0 working days (${workDays}-day worker, weekend-only range)`,
      });
      continue;
    }

    // Insert leave request
    const { data: request, error: insertError } = await supabase
      .from("leave_requests")
      .insert({
        employee_id: emp.id,
        leave_type: entry.leaveType,
        start_date: entry.startDate,
        end_date: entry.endDate,
        days,
        reason: "Backfill",
        status: "pending",
      })
      .select("id")
      .single();

    if (insertError || !request) {
      results.push({
        name: emp.full_name,
        leaveType: entry.leaveType,
        startDate: entry.startDate,
        endDate: entry.endDate,
        days,
        status: "error",
        message: insertError?.message ?? "Insert failed",
      });
      continue;
    }

    // Approve it
    const { error: approveError } = await supabase.rpc("approve_leave_request", {
      request_id: request.id,
    });

    if (approveError) {
      results.push({
        name: emp.full_name,
        leaveType: entry.leaveType,
        startDate: entry.startDate,
        endDate: entry.endDate,
        days,
        status: "error",
        message: `Inserted but approve failed: ${approveError.message}`,
      });
      continue;
    }

    results.push({
      name: emp.full_name,
      leaveType: entry.leaveType,
      startDate: entry.startDate,
      endDate: entry.endDate,
      days,
      status: "ok",
    });
  }

  return results;
}

// ─── JANUARY 2026 ────────────────────────────────────────────────────────────

export async function runBackfillJan2026Action(): Promise<BackfillResult[]> {
  const supabase = await createClient();
  const entries: LeaveEntry[] = [
    { nameSearch: "%Jumari%",         leaveType: "annual",          startDate: "2026-01-02", endDate: "2026-01-02" },
    { nameSearch: "%Thashini%",       leaveType: "no_pay",          startDate: "2026-01-02", endDate: "2026-01-12" },
    { nameSearch: "%Ragini%",         leaveType: "annual",          startDate: "2026-01-08", endDate: "2026-01-08" },
    { nameSearch: "%Heng Tao Nee%",   leaveType: "sick",            startDate: "2026-01-09", endDate: "2026-01-09" },
    { nameSearch: "%Mak Kam Choon%",  leaveType: "annual",          startDate: "2026-01-09", endDate: "2026-01-14" },
    { nameSearch: "%Leong Peng%",     leaveType: "annual",          startDate: "2026-01-12", endDate: "2026-01-12" },
    { nameSearch: "%Kan%Meng%",       leaveType: "sick",            startDate: "2026-01-15", endDate: "2026-01-15" },
    { nameSearch: "%Narish Kumar%",   leaveType: "annual",          startDate: "2026-01-15", endDate: "2026-01-15" },
    { nameSearch: "%Narish Kumar%",   leaveType: "sick",            startDate: "2026-01-16", endDate: "2026-01-16" },
    { nameSearch: "%Beevi%",          leaveType: "annual",          startDate: "2026-01-16", endDate: "2026-01-16" },
    { nameSearch: "%Beevi%",          leaveType: "sick",            startDate: "2026-01-19", endDate: "2026-01-20" },
    { nameSearch: "%Mak Kam Choon%",  leaveType: "sick",            startDate: "2026-01-20", endDate: "2026-01-20" },
    { nameSearch: "%Mak Kam Choon%",  leaveType: "sick",            startDate: "2026-01-21", endDate: "2026-01-21" },
    { nameSearch: "%Suriakala%",      leaveType: "annual",          startDate: "2026-01-21", endDate: "2026-01-21", halfDay: true },
    { nameSearch: "%Thashini%",       leaveType: "sick",            startDate: "2026-01-23", endDate: "2026-01-23" },
    { nameSearch: "%Chan Yan Siew%",  leaveType: "annual",          startDate: "2026-01-23", endDate: "2026-01-23" },
    { nameSearch: "%Jumari%",         leaveType: "annual",          startDate: "2026-01-26", endDate: "2026-01-26" },
    { nameSearch: "%Leong Peng%",     leaveType: "annual",          startDate: "2026-01-26", endDate: "2026-01-26" },
    { nameSearch: "%Kwan Tuck Fatt%", leaveType: "sick",            startDate: "2026-01-27", endDate: "2026-01-28" },
    { nameSearch: "%Mak Kam Choon%",  leaveType: "sick",            startDate: "2026-01-27", endDate: "2026-01-27" },
    { nameSearch: "%Thashini%",       leaveType: "annual",          startDate: "2026-01-27", endDate: "2026-01-27" },
    { nameSearch: "%Wang Yifan%",     leaveType: "no_pay",          startDate: "2026-01-29", endDate: "2026-01-29" },
    { nameSearch: "%Ng Bee Eng%",     leaveType: "annual",          startDate: "2026-01-30", endDate: "2026-01-30" },
  ];
  return processEntries(supabase, entries);
}

// ─── FEBRUARY 2026 ───────────────────────────────────────────────────────────

export async function runBackfillFeb2026Action(): Promise<BackfillResult[]> {
  const supabase = await createClient();
  const entries: LeaveEntry[] = [
    { nameSearch: "%Narish Kumar%",   leaveType: "annual",          startDate: "2026-02-03", endDate: "2026-02-03" },
    { nameSearch: "%Ng Bee Eng%",     leaveType: "sick",            startDate: "2026-02-03", endDate: "2026-02-04" },
    { nameSearch: "%Leong Peng%",     leaveType: "sick",            startDate: "2026-02-04", endDate: "2026-02-06" },
    { nameSearch: "%Latifah%",        leaveType: "no_pay",          startDate: "2026-02-06", endDate: "2026-02-06" },
    { nameSearch: "%Wang Yifan%",     leaveType: "no_pay",          startDate: "2026-02-09", endDate: "2026-02-10" },
    { nameSearch: "%Latifah%",        leaveType: "sick",            startDate: "2026-02-09", endDate: "2026-02-09" },
    { nameSearch: "%Leong Peng%",     leaveType: "annual",          startDate: "2026-02-16", endDate: "2026-02-16" },
    { nameSearch: "%Cheok Soon Teck%",leaveType: "annual",          startDate: "2026-02-19", endDate: "2026-02-19" },
    { nameSearch: "%Vickneswari%",    leaveType: "no_pay",          startDate: "2026-02-19", endDate: "2026-02-19" },
    { nameSearch: "%Kwan Tuck Fatt%", leaveType: "annual",          startDate: "2026-02-19", endDate: "2026-02-19" },
    { nameSearch: "%Mak Kam Choon%",  leaveType: "annual",          startDate: "2026-02-19", endDate: "2026-02-20" },
    { nameSearch: "%Heng Tao Nee%",   leaveType: "annual",          startDate: "2026-02-19", endDate: "2026-02-20" },
    { nameSearch: "%Wan Chee Seng%",  leaveType: "sick",            startDate: "2026-02-20", endDate: "2026-02-20" },
    { nameSearch: "%Leong Peng%",     leaveType: "annual",          startDate: "2026-02-19", endDate: "2026-02-20" },
    { nameSearch: "%Leong Peng%",     leaveType: "annual",          startDate: "2026-02-23", endDate: "2026-02-24" },
    { nameSearch: "%Beevi%",          leaveType: "sick",            startDate: "2026-02-24", endDate: "2026-02-24" },
    { nameSearch: "%Thang Mun Mang%", leaveType: "sick",            startDate: "2026-02-24", endDate: "2026-02-24" },
    { nameSearch: "%Ng Bee Eng%",     leaveType: "annual",          startDate: "2026-02-25", endDate: "2026-02-25" },
    { nameSearch: "%Suriakala%",      leaveType: "annual",          startDate: "2026-02-26", endDate: "2026-02-26" },
    { nameSearch: "%Thashini%",       leaveType: "annual",          startDate: "2026-02-26", endDate: "2026-02-26" },
    { nameSearch: "%Beevi%",          leaveType: "sick",            startDate: "2026-02-26", endDate: "2026-02-27" },
    { nameSearch: "%Mak Kam Choon%",  leaveType: "sick",            startDate: "2026-02-27", endDate: "2026-02-27" },
    { nameSearch: "%Wang Zhen%",      leaveType: "annual",          startDate: "2026-02-24", endDate: "2026-03-17" },
  ];
  return processEntries(supabase, entries);
}

// ─── MARCH 2026 ──────────────────────────────────────────────────────────────

export async function runBackfillMar2026Action(): Promise<BackfillResult[]> {
  const supabase = await createClient();
  const entries: LeaveEntry[] = [
    { nameSearch: "%Goh Kah Kim%",    leaveType: "annual",          startDate: "2026-03-02", endDate: "2026-03-09" },
    { nameSearch: "%Peh Lian Sin%",   leaveType: "annual",          startDate: "2026-03-03", endDate: "2026-03-03" },
    { nameSearch: "%Kan%Meng%",       leaveType: "annual",          startDate: "2026-03-03", endDate: "2026-03-13" },
    { nameSearch: "%Ng Bee Eng%",     leaveType: "sick",            startDate: "2026-03-06", endDate: "2026-03-06" },
    { nameSearch: "%Narish Kumar%",   leaveType: "annual",          startDate: "2026-03-06", endDate: "2026-03-07" },
    { nameSearch: "%Sabina%",         leaveType: "annual",          startDate: "2026-03-07", endDate: "2026-03-23" },
    { nameSearch: "%Leong Peng%",     leaveType: "sick",            startDate: "2026-03-09", endDate: "2026-03-09" },
    { nameSearch: "%Kwan Tuck Fatt%", leaveType: "sick",            startDate: "2026-03-09", endDate: "2026-03-09" },
    { nameSearch: "%Thashini%",       leaveType: "sick",            startDate: "2026-03-10", endDate: "2026-03-10" },
    { nameSearch: "%Jumari%",         leaveType: "sick",            startDate: "2026-03-13", endDate: "2026-03-13" },
    { nameSearch: "%Jumari%",         leaveType: "sick",            startDate: "2026-03-16", endDate: "2026-03-16" },
    { nameSearch: "%Beevi%",          leaveType: "sick",            startDate: "2026-03-16", endDate: "2026-03-16" },
    { nameSearch: "%Latifah%",        leaveType: "sick",            startDate: "2026-03-18", endDate: "2026-03-19" },
    { nameSearch: "%Peh Lian Sin%",   leaveType: "annual",          startDate: "2026-03-18", endDate: "2026-03-27" },
    { nameSearch: "%Beevi%",          leaveType: "annual",          startDate: "2026-03-20", endDate: "2026-03-20" },
    { nameSearch: "%Jumari%",         leaveType: "annual",          startDate: "2026-03-23", endDate: "2026-03-24" },
    { nameSearch: "%Leong Peng%",     leaveType: "off_day",         startDate: "2026-03-23", endDate: "2026-03-23" },
    { nameSearch: "%Beevi%",          leaveType: "annual",          startDate: "2026-03-24", endDate: "2026-03-27" },
    { nameSearch: "%Thashini%",       leaveType: "no_pay",          startDate: "2026-03-26", endDate: "2026-03-26" },
    { nameSearch: "%Sri Anghala%",    leaveType: "no_pay",          startDate: "2026-03-27", endDate: "2026-03-27" },
    { nameSearch: "%Peh Lian Sin%",   leaveType: "annual",          startDate: "2026-03-31", endDate: "2026-03-31" },
  ];
  return processEntries(supabase, entries);
}

// ─── APRIL 2026 ──────────────────────────────────────────────────────────────

export async function runBackfillApr2026Action(): Promise<BackfillResult[]> {
  const supabase = await createClient();
  const entries: LeaveEntry[] = [
    { nameSearch: "%Sri Anghala%",    leaveType: "no_pay",          startDate: "2026-04-01", endDate: "2026-04-01" },
    { nameSearch: "%Peh Lian Sin%",   leaveType: "annual",          startDate: "2026-04-01", endDate: "2026-04-01" },
    { nameSearch: "%Ng Bee Eng%",     leaveType: "off_day",         startDate: "2026-04-02", endDate: "2026-04-02" },
    { nameSearch: "%Ragini%",         leaveType: "annual",          startDate: "2026-04-02", endDate: "2026-04-02" },
    { nameSearch: "%Narish Kumar%",   leaveType: "annual",          startDate: "2026-04-02", endDate: "2026-04-02" },
    { nameSearch: "%Kwan Tuck Fatt%", leaveType: "off_day",         startDate: "2026-04-06", endDate: "2026-04-06" },
    { nameSearch: "%Beevi%",          leaveType: "annual",          startDate: "2026-04-06", endDate: "2026-04-06" },
    { nameSearch: "%Leong Peng%",     leaveType: "annual",          startDate: "2026-04-06", endDate: "2026-04-06" },
    { nameSearch: "%Heng Tao Nee%",   leaveType: "sick",            startDate: "2026-04-07", endDate: "2026-04-07" },
    { nameSearch: "%Dewi Shinta%",    leaveType: "sick",            startDate: "2026-04-07", endDate: "2026-04-07" },
    { nameSearch: "%Latifah%",        leaveType: "off_day",         startDate: "2026-04-07", endDate: "2026-04-07" },
    { nameSearch: "%Latifah%",        leaveType: "off_day",         startDate: "2026-04-08", endDate: "2026-04-08" },
    { nameSearch: "%Ragini%",         leaveType: "annual",          startDate: "2026-04-10", endDate: "2026-04-13" },
    { nameSearch: "%Mak Kam Choon%",  leaveType: "off_day",         startDate: "2026-04-10", endDate: "2026-04-10" },
    { nameSearch: "%Thang Mun Mang%", leaveType: "off_day",         startDate: "2026-04-12", endDate: "2026-04-12" },
    { nameSearch: "%Sri Anghala%",    leaveType: "annual",          startDate: "2026-04-13", endDate: "2026-04-15" },
    { nameSearch: "%Beevi%",          leaveType: "annual",          startDate: "2026-04-14", endDate: "2026-04-14" },
    { nameSearch: "%Mak Kam Choon%",  leaveType: "sick",            startDate: "2026-04-15", endDate: "2026-04-15" },
    { nameSearch: "%Goh Kah Kim%",    leaveType: "sick",            startDate: "2026-04-15", endDate: "2026-04-16" },
    { nameSearch: "%Thang Mun Mang%", leaveType: "annual",          startDate: "2026-04-15", endDate: "2026-04-30" },
    { nameSearch: "%Goh Kah Kim%",    leaveType: "sick",            startDate: "2026-04-17", endDate: "2026-04-17" },
    { nameSearch: "%Wan Chee Seng%",  leaveType: "annual",          startDate: "2026-04-20", endDate: "2026-04-21" },
    { nameSearch: "%Narish Kumar%",   leaveType: "annual",          startDate: "2026-04-20", endDate: "2026-04-20" },
    { nameSearch: "%Mak Kam Choon%",  leaveType: "sick",            startDate: "2026-04-22", endDate: "2026-04-22" },
    { nameSearch: "%Beevi%",          leaveType: "sick",            startDate: "2026-04-22", endDate: "2026-04-22" },
    { nameSearch: "%Hisam%",          leaveType: "sick",            startDate: "2026-04-23", endDate: "2026-04-24" },
    { nameSearch: "%Ng Bee Eng%",     leaveType: "annual",          startDate: "2026-04-24", endDate: "2026-04-24" },
    { nameSearch: "%Puventhiran%",    leaveType: "no_pay",          startDate: "2026-04-25", endDate: "2026-04-25" },
    { nameSearch: "%Narish Kumar%",   leaveType: "annual",          startDate: "2026-04-27", endDate: "2026-04-27" },
    { nameSearch: "%Sri Anghala%",    leaveType: "no_pay",          startDate: "2026-04-30", endDate: "2026-04-30" },
  ];
  return processEntries(supabase, entries);
}

// ─── MAY 2026 ────────────────────────────────────────────────────────────────

export async function runBackfillMay2026Action(): Promise<BackfillResult[]> {
  const supabase = await createClient();
  const entries: LeaveEntry[] = [
    { nameSearch: "%Zin Thu Htet%",       leaveType: "annual",          startDate: "2026-05-02", endDate: "2026-05-02" },
    { nameSearch: "%Narish Kumar%",       leaveType: "annual",          startDate: "2026-05-02", endDate: "2026-05-02" },
    { nameSearch: "%Sri Anghala%",        leaveType: "no_pay",          startDate: "2026-05-02", endDate: "2026-05-02" },
    { nameSearch: "%Narish Kumar%",       leaveType: "annual",          startDate: "2026-05-04", endDate: "2026-05-04" },
    { nameSearch: "%Wang Yifan%",         leaveType: "off_day",         startDate: "2026-05-04", endDate: "2026-05-04" },
    { nameSearch: "%Leong Peng%",         leaveType: "annual",          startDate: "2026-05-04", endDate: "2026-05-04" },
    { nameSearch: "%Goh Kah Kim%",        leaveType: "sick",            startDate: "2026-05-04", endDate: "2026-05-04" },
    { nameSearch: "%Beevi%",              leaveType: "annual",          startDate: "2026-05-07", endDate: "2026-05-07" },
    { nameSearch: "%Latifah%",            leaveType: "off_day",         startDate: "2026-05-08", endDate: "2026-05-08" },
    { nameSearch: "%Ng Bee Eng%",         leaveType: "annual",          startDate: "2026-05-08", endDate: "2026-05-08" },
    { nameSearch: "%Kwan Tuck Fatt%",     leaveType: "annual",          startDate: "2026-05-08", endDate: "2026-05-08" },
    { nameSearch: "%Goh Kah Kim%",        leaveType: "sick",            startDate: "2026-05-11", endDate: "2026-05-11" },
    { nameSearch: "%Nguyen Trung Thang%", leaveType: "annual",          startDate: "2026-05-11", endDate: "2026-05-27" },
    { nameSearch: "%Mak Kam Choon%",      leaveType: "sick",            startDate: "2026-05-11", endDate: "2026-05-11" },
    { nameSearch: "%Hisam%",              leaveType: "sick",            startDate: "2026-05-11", endDate: "2026-05-12" },
    { nameSearch: "%Thang Mun Mang%",     leaveType: "sick",            startDate: "2026-05-14", endDate: "2026-05-14" },
    { nameSearch: "%Wang Yifan%",         leaveType: "sick",            startDate: "2026-05-14", endDate: "2026-05-15" },
    { nameSearch: "%Ng Bee Eng%",         leaveType: "sick",            startDate: "2026-05-14", endDate: "2026-05-14" },
    { nameSearch: "%Beevi%",              leaveType: "annual",          startDate: "2026-05-15", endDate: "2026-05-15" },
    { nameSearch: "%Ng Bee Eng%",         leaveType: "annual",          startDate: "2026-05-18", endDate: "2026-05-26" },
    { nameSearch: "%Jumari%",             leaveType: "hospitalization", startDate: "2026-05-18", endDate: "2026-06-02" },
    { nameSearch: "%Thashini%",           leaveType: "annual",          startDate: "2026-05-19", endDate: "2026-05-20" },
    { nameSearch: "%Mak Kam Choon%",      leaveType: "sick",            startDate: "2026-05-20", endDate: "2026-05-20" },
    { nameSearch: "%Peh Lian Sin%",       leaveType: "sick",            startDate: "2026-05-20", endDate: "2026-05-22" },
    { nameSearch: "%Sri Anghala%",        leaveType: "no_pay",          startDate: "2026-05-25", endDate: "2026-05-25" },
    { nameSearch: "%Beevi%",              leaveType: "sick",            startDate: "2026-05-26", endDate: "2026-05-26" },
    { nameSearch: "%Heng Tao Nee%",       leaveType: "sick",            startDate: "2026-05-28", endDate: "2026-05-28" },
    { nameSearch: "%Hisam%",              leaveType: "off_day",         startDate: "2026-05-28", endDate: "2026-05-28" },
    { nameSearch: "%Ng Bee Eng%",         leaveType: "sick",            startDate: "2026-05-28", endDate: "2026-05-29" },
    { nameSearch: "%Latifah%",            leaveType: "no_pay",          startDate: "2026-05-29", endDate: "2026-05-29" },
  ];
  return processEntries(supabase, entries);
}
