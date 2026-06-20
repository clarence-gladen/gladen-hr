"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  isOnProbation,
  getAvailableAnnualLeave,
  getAvailableSickLeave,
  getAvailableHospitalizationLeave,
} from "@/lib/leave/entitlement";

function countWorkingDays(start: string, end: string, workDays: 5 | 6 = 5): number {
  const cur = new Date(start);
  const endDate = new Date(end);
  if (endDate < cur) return 0;
  let count = 0;
  while (cur <= endDate) {
    const day = cur.getDay();
    if (workDays === 6 ? day !== 0 : day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export async function submitLeaveRequestAction(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Not authenticated." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("employee_id")
    .eq("id", auth.user.id)
    .maybeSingle();

  const employeeId = profile?.employee_id;
  if (!employeeId) return { error: "No employee record linked." };

  const leaveType = formData.get("leaveType") as string;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;
  const reason = (formData.get("reason") as string | null) || null;

  if (!leaveType || !startDate || !endDate) return { error: "All fields are required." };
  if (endDate < startDate) return { error: "End date must be on or after start date." };

  const { data: emp } = await supabase
    .from("employees")
    .select("employment_start_date, work_days_per_week")
    .eq("id", employeeId)
    .maybeSingle();

  const workDays: 5 | 6 = emp?.work_days_per_week === 6 ? 6 : 5;
  const days = countWorkingDays(startDate, endDate, workDays);
  if (days === 0) return { error: "No working days in selected range." };

  if (leaveType !== "no_pay") {
    const empStartDate = emp?.employment_start_date;
    if (!empStartDate) return { error: "Employment start date not found." };

    // Probation check: based on today (not leave start date)
    const today = new Date().toISOString().slice(0, 10);
    if (isOnProbation(empStartDate, today)) {
      return { error: "You are on probation. Only no-pay leave is available during probation." };
    }

    // Balance check: entitlement is computed as of the leave start date (what they'll have accrued)
    const { data: bal } = await supabase
      .from("leave_balances")
      .select("annual_used, sick_used, hospitalization_used")
      .eq("employee_id", employeeId)
      .lte("year_start", startDate)
      .gte("year_end", startDate)
      .maybeSingle();

    if (leaveType === "annual") {
      const accrued = getAvailableAnnualLeave(empStartDate, startDate);
      const used = Number(bal?.annual_used ?? 0);
      if (days > accrued - used) {
        return {
          error: `Insufficient annual leave. You have ${Math.max(0, accrued - used)} day(s) available.`,
        };
      }
    } else if (leaveType === "sick") {
      const entitlement = getAvailableSickLeave(empStartDate, startDate);
      const used = Number(bal?.sick_used ?? 0);
      if (days > entitlement - used) {
        return {
          error: `Insufficient sick leave. You have ${Math.max(0, entitlement - used)} day(s) available.`,
        };
      }
    } else if (leaveType === "hospitalization") {
      const entitlement = getAvailableHospitalizationLeave(empStartDate, startDate);
      const used = Number(bal?.hospitalization_used ?? 0);
      if (days > entitlement - used) {
        return {
          error: `Insufficient hospitalisation leave. You have ${Math.max(0, entitlement - used)} day(s) available.`,
        };
      }
    }
  }

  const { error } = await supabase.from("leave_requests").insert({
    employee_id: employeeId,
    leave_type: leaveType,
    start_date: startDate,
    end_date: endDate,
    days,
    reason,
    status: "pending",
  });

  if (error) return { error: error.message };
  revalidatePath("/employee/leave");
  return {};
}

export async function editLeaveRequestAction(
  requestId: string,
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Not authenticated." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("employee_id")
    .eq("id", auth.user.id)
    .maybeSingle();

  const leaveType = formData.get("leaveType") as string;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;
  const reason = (formData.get("reason") as string | null) || null;

  if (!leaveType || !startDate || !endDate) return { error: "All fields are required." };
  if (endDate < startDate) return { error: "End date must be on or after start date." };

  const { data: emp } = await supabase
    .from("employees")
    .select("work_days_per_week")
    .eq("id", profile?.employee_id ?? "")
    .maybeSingle();

  const workDays: 5 | 6 = emp?.work_days_per_week === 6 ? 6 : 5;
  const days = countWorkingDays(startDate, endDate, workDays);
  if (days === 0) return { error: "No working days in selected range." };

  const { error } = await supabase
    .from("leave_requests")
    .update({ leave_type: leaveType, start_date: startDate, end_date: endDate, days, reason })
    .eq("id", requestId)
    .eq("status", "pending");

  if (error) return { error: error.message };
  revalidatePath("/employee/leave");
  return {};
}

export async function cancelLeaveRequestAction(requestId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_leave_request", { request_id: requestId });
  if (error) return { error: error.message };
  revalidatePath("/employee/leave");
  return {};
}
