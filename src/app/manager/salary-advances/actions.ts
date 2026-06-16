"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

interface SalaryAdvanceFormState {
  error?: string;
  success?: boolean;
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
  revalidatePath(`/manager/salary-advances/${advanceId}`);
}

export async function updateAdvanceAction(
  advanceId: string,
  _prevState: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();

  const notes = String(formData.get("notes") ?? "").trim() || null;
  const repaymentRaw = String(formData.get("repaymentAmountPerMonth") ?? "").trim();
  const repaymentAmountPerMonth = repaymentRaw ? Number(repaymentRaw) : null;

  const { error } = await supabase
    .from("salary_advances")
    .update({ notes, repayment_amount_per_month: repaymentAmountPerMonth })
    .eq("id", advanceId);

  if (error) return { error: error.message };

  revalidatePath(`/manager/salary-advances/${advanceId}`);
  revalidatePath("/manager/salary-advances");
  return { success: true };
}

export async function markFullyRepaidAction(
  advanceId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();

  // Fetch outstanding balance
  const { data: advance } = await supabase
    .from("salary_advances")
    .select("amount, salary_advance_repayments(amount)")
    .eq("id", advanceId)
    .single();

  if (!advance) return { error: "Advance not found." };

  const repayments = Array.isArray(advance.salary_advance_repayments)
    ? advance.salary_advance_repayments
    : [];
  const totalRepaid = repayments.reduce((sum: number, r: { amount: number }) => sum + Number(r.amount), 0);
  const outstanding = Number(advance.amount) - totalRepaid;

  if (outstanding <= 0.001) return {};

  // Insert a final repayment record for the remaining balance
  const { error } = await supabase.from("salary_advance_repayments").insert({
    salary_advance_id: advanceId,
    amount: outstanding,
  });

  if (error) return { error: error.message };

  revalidatePath(`/manager/salary-advances/${advanceId}`);
  revalidatePath("/manager/salary-advances");
  return {};
}
