"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function approveLeaveRequestAction(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_leave_request", { request_id: id });
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
  const endDate = formData.get("endDate") as string;
  const reason = (formData.get("reason") as string | null) || null;

  if (!leaveType || !startDate || !endDate) return { error: "All fields are required." };
  if (endDate < startDate) return { error: "End date must be on or after start date." };

  const { data: req } = await supabase
    .from("leave_requests")
    .select("employee_id")
    .eq("id", requestId)
    .maybeSingle();

  const workDays = await getEmployeeWorkDays(supabase, req?.employee_id);
  const days = countWorkingDays(startDate, endDate, workDays);
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
  const endDate = formData.get("endDate") as string;
  const reason = (formData.get("reason") as string | null) || null;

  if (!leaveType || !startDate || !endDate) return { error: "All fields are required." };
  if (endDate < startDate) return { error: "End date must be on or after start date." };

  const { data: req } = await supabase
    .from("leave_requests")
    .select("employee_id")
    .eq("id", requestId)
    .maybeSingle();

  const workDays = await getEmployeeWorkDays(supabase, req?.employee_id);
  const days = countWorkingDays(startDate, endDate, workDays);
  if (days === 0) return { error: "No working days in selected range." };

  const { error } = await supabase.rpc("edit_approved_leave_request", {
    p_request_id: requestId,
    p_leave_type: leaveType,
    p_start_date: startDate,
    p_end_date: endDate,
    p_days: days,
    p_reason: reason,
  });

  if (error) return { error: error.message };
  return {};
}

export async function createLeaveForEmployeeAction(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const employeeId = formData.get("employeeId") as string;
  const leaveType = formData.get("leaveType") as string;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;
  const reason = (formData.get("reason") as string | null) || null;

  if (!employeeId || !leaveType || !startDate || !endDate) return { error: "All fields are required." };
  if (endDate < startDate) return { error: "End date must be on or after start date." };

  const workDays = await getEmployeeWorkDays(supabase, employeeId);
  const days = countWorkingDays(startDate, endDate, workDays);
  if (days === 0) return { error: "No working days in selected range." };

  const { data: request, error: insertError } = await supabase
    .from("leave_requests")
    .insert({ employee_id: employeeId, leave_type: leaveType, start_date: startDate, end_date: endDate, days, reason, status: "pending" })
    .select("id")
    .single();

  if (insertError || !request) return { error: insertError?.message ?? "Failed to create request." };

  const { error: approveError } = await supabase.rpc("approve_leave_request", { request_id: request.id });
  if (approveError) return { error: approveError.message };

  revalidatePath("/manager/leave");
  redirect("/manager/leave");
}

async function getEmployeeWorkDays(
  supabase: Awaited<ReturnType<typeof createClient>>,
  employeeId: string | undefined | null
): Promise<5 | 6> {
  if (!employeeId) return 5;
  const { data } = await supabase
    .from("employees")
    .select("work_days_per_week")
    .eq("id", employeeId)
    .maybeSingle();
  return data?.work_days_per_week === 6 ? 6 : 5;
}

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
