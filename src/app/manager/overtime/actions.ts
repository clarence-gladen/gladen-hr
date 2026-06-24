"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createOvertimeRecordAction(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const employeeId = formData.get("employeeId") as string;
  const workDate = formData.get("workDate") as string;
  const remarks = (formData.get("remarks") as string | null) || null;
  const amount = Number(formData.get("amount"));

  if (!employeeId || !workDate) return { error: "Employee and date are required." };
  if (isNaN(amount) || amount <= 0) return { error: "Amount must be greater than 0." };

  const d = new Date(workDate + "T00:00:00");
  const month = d.getMonth() + 1;
  const year = d.getFullYear();

  const { data: run } = await supabase
    .from("payroll_runs")
    .select("status")
    .eq("month", month)
    .eq("year", year)
    .maybeSingle();

  if (run?.status === "completed") {
    return { error: `Payroll for ${d.toLocaleString("en-SG", { month: "long", year: "numeric" })} is already finalised. OT cannot be added.` };
  }

  const { error } = await supabase
    .from("overtime_records")
    .insert({ employee_id: employeeId, work_date: workDate, remarks, amount });

  if (error) return { error: error.message };

  revalidatePath("/manager/overtime");
  return {};
}

export async function deleteOvertimeRecordAction(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: record } = await supabase
    .from("overtime_records")
    .select("work_date")
    .eq("id", id)
    .maybeSingle();

  if (!record) return { error: "Record not found." };

  const d = new Date(record.work_date + "T00:00:00");
  const month = d.getMonth() + 1;
  const year = d.getFullYear();

  const { data: run } = await supabase
    .from("payroll_runs")
    .select("status")
    .eq("month", month)
    .eq("year", year)
    .maybeSingle();

  if (run?.status === "completed") {
    return { error: "Cannot delete OT from a finalised payroll month." };
  }

  const { error } = await supabase.from("overtime_records").delete().eq("id", id);
  if (error) return { error: error.message };

  return {};
}
