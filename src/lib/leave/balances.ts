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
 */
export async function ensureLeaveBalances(
  supabase: SupabaseClient,
  employeeId: string,
  employmentStartDate: string
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const currentYear = getEmploymentYearNumber(employmentStartDate, today);

  const rows = [];
  for (let yr = 1; yr <= currentYear; yr++) {
    const { yearStart, yearEnd } = getEmploymentYearBounds(employmentStartDate, yr);
    rows.push({
      employee_id: employeeId,
      year_start: yearStart,
      year_end: yearEnd,
      employment_year: yr,
    });
  }

  await supabase
    .from("leave_balances")
    .upsert(rows, { onConflict: "employee_id,year_start", ignoreDuplicates: true });
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
        used: sickUsed,
        unused: Math.max(0, SICK_LEAVE_PER_YEAR - sickUsed),
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
