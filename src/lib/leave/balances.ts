import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getEmploymentYearNumber,
  getEmploymentYearBounds,
  getAnnualLeaveForYear,
  getAvailableAnnualLeave,
  getAvailableSickLeave,
  getAvailableHospitalizationLeave,
  SICK_LEAVE_PER_YEAR,
  HOSPITALIZATION_PER_YEAR,
} from "./entitlement";

export interface LeaveYearHistory {
  employmentYear: number;
  yearStart: string;
  yearEnd: string;
  isCurrent: boolean;
  annual: { entitlement: number; used: number; unused: number };
  sick: { entitlement: number; used: number; unused: number };
  hospitalization: { entitlement: number; used: number; unused: number };
}

/**
 * Ensures leave_balances rows exist for every employment year from year 1 up to
 * and including the current employment year. Safe to call on every page load.
 *
 * For newly created rows, used counts are computed from approved leave_requests
 * so that pre-approved future leaves (e.g. Oct backfill) are correctly captured
 * when the employment year row is first created.
 */
export async function ensureLeaveBalances(
  supabase: SupabaseClient,
  employeeId: string,
  employmentStartDate: string
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const currentYear = getEmploymentYearNumber(employmentStartDate, today);

  const allYears = Array.from({ length: currentYear }, (_, i) => {
    const yr = i + 1;
    const { yearStart, yearEnd } = getEmploymentYearBounds(employmentStartDate, yr);
    return { yr, yearStart, yearEnd };
  });

  const { data: existing } = await supabase
    .from("leave_balances")
    .select("year_start")
    .eq("employee_id", employeeId);

  const existingStarts = new Set((existing ?? []).map((r) => r.year_start as string));
  const missing = allYears.filter(({ yearStart }) => !existingStarts.has(yearStart));

  if (missing.length === 0) return;

  // Compute used counts from leave_requests for each missing year so that
  // already-approved leaves are not lost when the row is first created.
  const newRows = await Promise.all(
    missing.map(async ({ yr, yearStart, yearEnd }) => {
      const { data: reqs } = await supabase
        .from("leave_requests")
        .select("leave_type, days")
        .eq("employee_id", employeeId)
        .eq("status", "approved")
        .gte("start_date", yearStart)
        .lte("start_date", yearEnd);

      let annual_used = 0;
      let sick_used = 0;
      let hospitalization_used = 0;
      for (const req of reqs ?? []) {
        const d = Number(req.days);
        if (req.leave_type === "annual") annual_used += d;
        else if (req.leave_type === "sick") sick_used += d;
        else if (req.leave_type === "hospitalization") hospitalization_used += d;
      }

      return {
        employee_id: employeeId,
        year_start: yearStart,
        year_end: yearEnd,
        employment_year: yr,
        annual_used,
        sick_used,
        hospitalization_used,
      };
    })
  );

  await supabase.from("leave_balances").insert(newRows);
}

/**
 * Returns the last `count` employment-year rows for an employee, enriched with
 * computed entitlements. Latest year first.
 */
export async function getLeaveHistory(
  supabase: SupabaseClient,
  employeeId: string,
  employmentStartDate: string,
  count = 3
): Promise<LeaveYearHistory[]> {
  const today = new Date().toISOString().slice(0, 10);
  const currentEmpYear = getEmploymentYearNumber(employmentStartDate, today);

  const { data: rows } = await supabase
    .from("leave_balances")
    .select("employment_year, year_start, year_end, annual_used, sick_used, hospitalization_used")
    .eq("employee_id", employeeId)
    .order("year_start", { ascending: false })
    .limit(count);

  if (!rows || rows.length === 0) return [];

  return rows.map((row) => {
    const isCurrent = row.employment_year === currentEmpYear;
    const yearNum = row.employment_year as number;

    // Annual: current Year 1 shows accrued; all other years show full entitlement
    const annualEntitlement =
      isCurrent && yearNum === 1
        ? getAvailableAnnualLeave(employmentStartDate, today)
        : getAnnualLeaveForYear(yearNum);

    const annualUsed = Number(row.annual_used);
    const sickUsed = Number(row.sick_used);
    const hospitalizationUsed = Number(row.hospitalization_used);

    return {
      employmentYear: yearNum,
      yearStart: row.year_start as string,
      yearEnd: row.year_end as string,
      isCurrent,
      annual: {
        entitlement: annualEntitlement,
        used: annualUsed,
        unused: Math.max(0, annualEntitlement - annualUsed),
      },
      sick: {
        entitlement: SICK_LEAVE_PER_YEAR,
        // Per MOM: hospitalisation leave consumes sick leave concurrently.
        used: Math.min(sickUsed + hospitalizationUsed, SICK_LEAVE_PER_YEAR),
        unused: Math.max(0, SICK_LEAVE_PER_YEAR - sickUsed - hospitalizationUsed),
      },
      hospitalization: {
        entitlement: HOSPITALIZATION_PER_YEAR,
        used: hospitalizationUsed,
        unused: Math.max(0, HOSPITALIZATION_PER_YEAR - hospitalizationUsed),
      },
    };
  });
}

/**
 * Returns used counts for the employment year that contains referenceDate.
 * Returns null if no balance row exists yet.
 */
export async function getCurrentLeaveUsed(
  supabase: SupabaseClient,
  employeeId: string,
  referenceDate: string
): Promise<{ annual_used: number; sick_used: number; hospitalization_used: number } | null> {
  const { data } = await supabase
    .from("leave_balances")
    .select("annual_used, sick_used, hospitalization_used")
    .eq("employee_id", employeeId)
    .lte("year_start", referenceDate)
    .gte("year_end", referenceDate)
    .maybeSingle();

  if (!data) return null;
  return {
    annual_used: Number(data.annual_used),
    sick_used: Number(data.sick_used),
    hospitalization_used: Number(data.hospitalization_used),
  };
}

export {
  getAvailableAnnualLeave,
  getAvailableSickLeave,
  getAvailableHospitalizationLeave,
};
