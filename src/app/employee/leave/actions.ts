"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function countWorkingDays(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (endDate < startDate) return 0;
  let count = 0;
  const cur = new Date(startDate);
  while (cur <= endDate) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
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

  const days = countWorkingDays(startDate, endDate);
  if (days === 0) return { error: "No working days in selected range." };

  if (leaveType !== "no_pay") {
    const { data: emp } = await supabase
      .from("employees")
      .select("employment_start_date")
      .eq("id", employeeId)
      .maybeSingle();

    if (emp) {
      const confirmDate = new Date(emp.employment_start_date);
      confirmDate.setMonth(confirmDate.getMonth() + 3);
      if (new Date() < confirmDate) {
        return { error: "You are on probation. Only no-pay leave is available during probation." };
      }
    }

    const year = new Date(startDate).getFullYear();
    const { data: bal } = await supabase
      .from("leave_balances")
      .select("annual_entitlement, annual_used, sick_entitlement, sick_used, hospitalization_entitlement, hospitalization_used")
      .eq("employee_id", employeeId)
      .eq("year", year)
      .maybeSingle();

    if (bal) {
      const available =
        leaveType === "annual" ? bal.annual_entitlement - bal.annual_used
        : leaveType === "sick" ? bal.sick_entitlement - bal.sick_used
        : bal.hospitalization_entitlement - bal.hospitalization_used;
      if (days > available) {
        return { error: `Insufficient leave balance. You have ${Math.max(0, available)} day(s) available.` };
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

  const leaveType = formData.get("leaveType") as string;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;
  const reason = (formData.get("reason") as string | null) || null;

  if (!leaveType || !startDate || !endDate) return { error: "All fields are required." };
  if (endDate < startDate) return { error: "End date must be on or after start date." };

  const days = countWorkingDays(startDate, endDate);
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

export async function cancelLeaveRequestAction(requestId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("cancel_leave_request", { request_id: requestId });
  revalidatePath("/employee/leave");
}
