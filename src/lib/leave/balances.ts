import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getAnnualLeaveEntitlement,
  getHospitalizationEntitlement,
  getSickLeaveEntitlement,
} from "./entitlement";

/**
 * Ensures a leave_balances row exists for the given employee/year with the
 * correct entitlements, without disturbing any leave already taken
 * (annual_used / sick_used / hospitalization_used are left untouched).
 */
export async function ensureLeaveBalance(
  supabase: SupabaseClient,
  employeeId: string,
  employmentStartDate: string,
  year: number
) {
  const { data, error } = await supabase
    .from("leave_balances")
    .upsert(
      {
        employee_id: employeeId,
        year,
        annual_entitlement: getAnnualLeaveEntitlement(employmentStartDate, year),
        sick_entitlement: getSickLeaveEntitlement(employmentStartDate, year),
        hospitalization_entitlement: getHospitalizationEntitlement(
          employmentStartDate,
          year
        ),
      },
      { onConflict: "employee_id,year" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}
