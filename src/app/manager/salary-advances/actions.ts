"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

interface SalaryAdvanceFormState {
  error?: string;
}

export async function createSalaryAdvanceAction(
  _prevState: SalaryAdvanceFormState,
  formData: FormData
): Promise<SalaryAdvanceFormState> {
  const supabase = await createClient();

  const employeeId = String(formData.get("employeeId") ?? "");
  const amount = Number(formData.get("amount"));
  const repaymentRaw = String(formData.get("repaymentAmountPerMonth") ?? "").trim();
  const repaymentAmountPerMonth = repaymentRaw ? Number(repaymentRaw) : null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!employeeId || !amount || amount <= 0) {
    return { error: "Please select an employee and enter a valid amount." };
  }

  const { data: userRes } = await supabase.auth.getUser();

  const { error } = await supabase.from("salary_advances").insert({
    employee_id: employeeId,
    amount,
    repayment_amount_per_month: repaymentAmountPerMonth,
    notes,
    status: "approved",
    approved_by: userRes.user?.id,
    status_updated_at: new Date().toISOString(),
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/manager/salary-advances");
  return {};
}

export async function cancelSalaryAdvanceAction(advanceId: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("salary_advances")
    .update({ status: "rejected", status_updated_at: new Date().toISOString() })
    .eq("id", advanceId)
    .eq("status", "approved");
  revalidatePath("/manager/salary-advances");
}
