"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ContractStatus, ExpenseType } from "@/lib/types/database";

interface ContractFormState {
  error?: string;
}

function readContractForm(formData: FormData) {
  return {
    client_name: String(formData.get("clientName") ?? "").trim(),
    site_name: String(formData.get("siteName") ?? "").trim(),
    start_date: String(formData.get("startDate") ?? ""),
    end_date: String(formData.get("endDate") ?? "") || null,
    monthly_value: Number(formData.get("monthlyValue")) || 0,
    status: String(formData.get("status") ?? "active") as ContractStatus,
  };
}

export async function createContractAction(
  _prevState: ContractFormState,
  formData: FormData
): Promise<ContractFormState> {
  const supabase = await createClient();
  const values = readContractForm(formData);

  if (!values.client_name || !values.site_name || !values.start_date) {
    return { error: "Please fill in all required fields." };
  }

  const { data, error } = await supabase
    .from("contracts")
    .insert(values)
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Failed to create contract." };
  }

  redirect(`/manager/contracts/${data.id}`);
}

export async function updateContractAction(
  id: string,
  _prevState: ContractFormState,
  formData: FormData
): Promise<ContractFormState> {
  const supabase = await createClient();
  const values = readContractForm(formData);

  if (!values.client_name || !values.site_name || !values.start_date) {
    return { error: "Please fill in all required fields." };
  }

  const { error } = await supabase.from("contracts").update(values).eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/manager/contracts/${id}`);
  revalidatePath("/manager/contracts");
  redirect(`/manager/contracts/${id}`);
}

export async function addAssignmentAction(
  contractId: string,
  _prevState: ContractFormState,
  formData: FormData
): Promise<ContractFormState> {
  const supabase = await createClient();
  const employeeId = String(formData.get("employeeId") ?? "");
  const roleOnSite = String(formData.get("roleOnSite") ?? "").trim() || null;

  if (!employeeId) {
    return { error: "Please select an employee." };
  }

  const { error } = await supabase.from("contract_assignments").insert({
    contract_id: contractId,
    employee_id: employeeId,
    role_on_site: roleOnSite,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/manager/contracts/${contractId}`);
  return {};
}

export async function removeAssignmentAction(
  contractId: string,
  assignmentId: string
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("contract_assignments")
    .update({ assigned_to: new Date().toISOString().slice(0, 10) })
    .eq("id", assignmentId);

  revalidatePath(`/manager/contracts/${contractId}`);
}

export async function addExpenseAction(
  contractId: string,
  _prevState: ContractFormState,
  formData: FormData
): Promise<ContractFormState> {
  const supabase = await createClient();
  const description = String(formData.get("description") ?? "").trim();
  const amount = Number(formData.get("amount")) || 0;
  const expenseType = String(formData.get("expenseType") ?? "fixed") as ExpenseType;
  const expenseDate = String(formData.get("expenseDate") ?? "") || undefined;

  if (!description || amount <= 0) {
    return { error: "Please enter a description and a valid amount." };
  }

  const { error } = await supabase.from("contract_expenses").insert({
    contract_id: contractId,
    description,
    amount,
    expense_type: expenseType,
    ...(expenseDate ? { expense_date: expenseDate } : {}),
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/manager/contracts/${contractId}`);
  return {};
}

export async function deleteExpenseAction(contractId: string, expenseId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("contract_expenses").delete().eq("id", expenseId);
  revalidatePath(`/manager/contracts/${contractId}`);
}
