"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { countWorkingDays, countCalendarDays } from "@/lib/leave/counting";
import {
  getEmploymentYearNumber,
  getEmploymentYearBounds,
  getAnnualLeaveForYear,
  SICK_LEAVE_PER_YEAR,
  HOSPITALIZATION_PER_YEAR,
} from "@/lib/leave/entitlement";

export async function approveLeaveRequestAction(
  id: string,
  annualChargeOffset = 0
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_leave_request", {
    request_id: id,
    p_annual_charge_offset: annualChargeOffset,
  });
  if (error) return { error: error.message };
  revalidatePath("/manager/leave");
  return {};
}

export async function rejectLeaveRequestAction(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("reject_leave_request", { request_id: id });
  if (error) return { error: error.message };
  revalidatePath("/manager/leave");
  return {};
}

export async function cancelLeaveRequestAction(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_leave_request", { request_id: id });
  if (error) return { error: error.message };
  revalidatePath("/manager/leave");
  return {};
}

export async function editLeaveRequestAction(
  requestId: string,
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const leaveType = formData.get("leaveType") as string;
  const startDate = formData.get("startDate") as string;
  const halfDay = formData.get("halfDay") === "true";
  const endDate = halfDay ? startDate : (formData.get("endDate") as string);
  const reason = (formData.get("reason") as string | null) || null;

  if (!leaveType || !startDate || !endDate) return { error: "All fields are required." };
  if (endDate < startDate) return { error: "End date must be on or after start date." };

  const { data: req } = await supabase
    .from("leave_requests")
    .select("employee_id")
    .eq("id", requestId)
    .maybeSingle();

  const { workDays, restDay } = await getEmployeeWorkSchedule(supabase, req?.employee_id);
  const { data: phData } = await supabase.from("public_holidays").select("date")
    .gte("year", parseInt(startDate.slice(0, 4))).lte("year", parseInt(endDate.slice(0, 4)));
  const publicHolidays = new Set<string>((phData ?? []).map((r) => r.date as string));
  const days = halfDay ? 0.5 : countWorkingDays(startDate, endDate, workDays, restDay, publicHolidays);
  if (days === 0) return { error: "No working days in selected range." };

  const { error } = await supabase
    .from("leave_requests")
    .update({ leave_type: leaveType, start_date: startDate, end_date: endDate, days, reason })
    .eq("id", requestId)
    .eq("status", "pending");

  if (error) return { error: error.message };
  return {};
}

export async function editApprovedLeaveRequestAction(
  requestId: string,
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const leaveType = formData.get("leaveType") as string;
  const startDate = formData.get("startDate") as string;
  const halfDay = formData.get("halfDay") === "true";
  const endDate = halfDay ? startDate : (formData.get("endDate") as string);
  const reason = (formData.get("reason") as string | null) || null;

  if (!leaveType || !startDate || !endDate) return { error: "All fields are required." };
  if (endDate < startDate) return { error: "End date must be on or after start date." };

  const { data: req } = await supabase
    .from("leave_requests")
    .select("employee_id")
    .eq("id", requestId)
    .maybeSingle();

  const { workDays, restDay } = await getEmployeeWorkSchedule(supabase, req?.employee_id);
  const { data: phData1 } = await supabase.from("public_holidays").select("date")
    .gte("year", parseInt(startDate.slice(0, 4))).lte("year", parseInt(endDate.slice(0, 4)));
  const publicHolidays1 = new Set<string>((phData1 ?? []).map((r) => r.date as string));
  const days = halfDay ? 0.5
    : leaveType === "off_day"
    ? countCalendarDays(startDate, endDate)
    : countWorkingDays(startDate, endDate, workDays, restDay, publicHolidays1);
  if (days === 0) return { error: "No working days in selected range." };

  const { error } = await supabase.rpc("edit_approved_leave_request", {
    p_request_id: requestId,
    p_leave_type: leaveType,
    p_start_date: startDate,
    p_end_date: endDate,
    p_days: days,
    p_reason: reason,
    p_annual_charge_offset:
      leaveType === "annual" ? Number(formData.get("annualChargeOffset") ?? 0) : 0,
  });

  if (error) return { error: error.message };
  return {};
}

export async function createLeaveForEmployeeAction(
  _prev: { error?: string; warning?: string },
  formData: FormData
): Promise<{ error?: string; warning?: string }> {
  const supabase = await createClient();

  const employeeId = formData.get("employeeId") as string;
  const leaveType = formData.get("leaveType") as string;
  const startDate = formData.get("startDate") as string;
  const halfDay = formData.get("halfDay") === "true";
  const endDate = halfDay ? startDate : (formData.get("endDate") as string);
  const reason = (formData.get("reason") as string | null) || null;
  const annualChargeOffset =
    leaveType === "annual" ? Number(formData.get("annualChargeOffset") ?? 0) : 0;

  if (!employeeId || !leaveType || !startDate || !endDate) return { error: "All fields are required." };
  if (endDate < startDate) return { error: "End date must be on or after start date." };

  const { workDays, restDay } = await getEmployeeWorkSchedule(supabase, employeeId);
  const { data: phData2 } = await supabase.from("public_holidays").select("date")
    .gte("year", parseInt(startDate.slice(0, 4))).lte("year", parseInt(endDate.slice(0, 4)));
  const publicHolidays2 = new Set<string>((phData2 ?? []).map((r) => r.date as string));
  const days = halfDay ? 0.5
    : leaveType === "off_day"
    ? countCalendarDays(startDate, endDate)
    : countWorkingDays(startDate, endDate, workDays, restDay, publicHolidays2);
  if (days === 0) return { error: "No working days in selected range." };

  const { data: request, error: insertError } = await supabase
    .from("leave_requests")
    .insert({ employee_id: employeeId, leave_type: leaveType, start_date: startDate, end_date: endDate, days, reason, status: "pending" })
    .select("id")
    .single();

  if (insertError || !request) return { error: insertError?.message ?? "Failed to create request." };

  const { error: approveError } = await supabase.rpc("approve_leave_request", {
    request_id: request.id,
    p_annual_charge_offset: annualChargeOffset,
  });
  if (approveError) return { error: approveError.message };

  // Warning (still recorded): the charged period's balance is now over entitlement.
  const warning = await overBalanceWarning(supabase, employeeId, leaveType, startDate, annualChargeOffset);

  revalidatePath("/manager/leave");
  if (warning) return { warning };
  redirect("/manager/leave");
}

/**
 * Returns a warning string if the given (already-approved) leave has pushed the
 * charged employment year's usage over its entitlement. Annual/sick/hospitalisation only.
 */
async function overBalanceWarning(
  supabase: Awaited<ReturnType<typeof createClient>>,
  employeeId: string,
  leaveType: string,
  startDate: string,
  annualChargeOffset: number
): Promise<string | undefined> {
  if (!["annual", "sick", "hospitalization"].includes(leaveType)) return undefined;

  const { data: emp } = await supabase
    .from("employees")
    .select("employment_start_date")
    .eq("id", employeeId)
    .maybeSingle();
  const empStart = emp?.employment_start_date as string | undefined;
  if (!empStart) return undefined;

  const offset = leaveType === "annual" ? annualChargeOffset : 0;
  const naturalYear = getEmploymentYearNumber(empStart, startDate);
  const targetYear = Math.max(1, naturalYear + offset);
  const { yearStart } = getEmploymentYearBounds(empStart, targetYear);

  const { data: bal } = await supabase
    .from("leave_balances")
    .select("annual_used, sick_used, hospitalization_used")
    .eq("employee_id", employeeId)
    .eq("year_start", yearStart)
    .maybeSingle();
  if (!bal) return undefined;

  if (leaveType === "annual") {
    const ent = getAnnualLeaveForYear(targetYear);
    if (Number(bal.annual_used) > ent) {
      return `Recorded. Note: this employee's annual leave for the charged period is now over the ${ent}-day entitlement.`;
    }
  } else if (leaveType === "sick") {
    const used = Number(bal.sick_used) + Number(bal.hospitalization_used);
    if (used > SICK_LEAVE_PER_YEAR) {
      return `Recorded. Note: sick leave is now over the ${SICK_LEAVE_PER_YEAR}-day entitlement — consider changing the excess to no-pay leave.`;
    }
  } else {
    if (Number(bal.hospitalization_used) > HOSPITALIZATION_PER_YEAR) {
      return `Recorded. Note: hospitalisation leave is now over the ${HOSPITALIZATION_PER_YEAR}-day entitlement — consider changing the excess to no-pay leave.`;
    }
  }
  return undefined;
}

async function getEmployeeWorkSchedule(
  supabase: Awaited<ReturnType<typeof createClient>>,
  employeeId: string | undefined | null
): Promise<{ workDays: 5 | 6; restDay: 0 | 6 }> {
  if (!employeeId) return { workDays: 5, restDay: 0 };
  const { data } = await supabase
    .from("employees")
    .select("work_days_per_week, work_rest_day")
    .eq("id", employeeId)
    .maybeSingle();
  return {
    workDays: data?.work_days_per_week === 6 ? 6 : 5,
    restDay: (data?.work_rest_day as number) === 6 ? 6 : 0,
  };
}

