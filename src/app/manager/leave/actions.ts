"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function approveLeaveRequestAction(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_leave_request", { request_id: id });
  if (error) throw error;
  revalidatePath("/manager/leave");
}

export async function rejectLeaveRequestAction(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("reject_leave_request", { request_id: id });
  if (error) throw error;
  revalidatePath("/manager/leave");
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

  let count = 0;
  const cur = new Date(startDate);
  const end = new Date(endDate);
  while (cur <= end) {
    const d = cur.getDay();
    if (d !== 0 && d !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  if (count === 0) return { error: "No working days in selected range." };

  const { error } = await supabase
    .from("leave_requests")
    .update({ leave_type: leaveType, start_date: startDate, end_date: endDate, days: count, reason })
    .eq("id", requestId)
    .eq("status", "pending");

  if (error) return { error: error.message };
  revalidatePath("/manager/leave");
  return {};
}

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

  const days = countWorkingDays(startDate, endDate);
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
