"use server";

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
