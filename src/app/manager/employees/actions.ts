"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ensureLeaveBalance } from "@/lib/leave/balances";
import type { EmployeeStatus, ResidencyStatus, SkillLevel } from "@/lib/types/database";

interface EmployeeFormValues {
  fullName: string;
  nric: string;
  dateOfBirth: string;
  mobileNumber: string;
  residencyStatus: ResidencyStatus;
  designation: string;
  employmentStartDate: string;
  baseSalary: string;
  skillLevel: SkillLevel;
  bankName: string;
  bankAccountNumber: string;
}

function readForm(formData: FormData): EmployeeFormValues {
  return {
    fullName: String(formData.get("fullName") ?? "").trim(),
    nric: String(formData.get("nric") ?? "").trim(),
    dateOfBirth: String(formData.get("dateOfBirth") ?? ""),
    mobileNumber: String(formData.get("mobileNumber") ?? "").replace(/\D/g, ""),
    residencyStatus: String(formData.get("residencyStatus") ?? "citizen") as ResidencyStatus,
    designation: String(formData.get("designation") ?? "").trim(),
    employmentStartDate: String(formData.get("employmentStartDate") ?? ""),
    baseSalary: String(formData.get("baseSalary") ?? "0"),
    skillLevel: String(formData.get("skillLevel") ?? "basic_skilled") as SkillLevel,
    bankName: String(formData.get("bankName") ?? "").trim(),
    bankAccountNumber: String(formData.get("bankAccountNumber") ?? "").trim(),
  };
}

export async function createEmployeeAction(
  _prevState: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const values = readForm(formData);

  if (!values.fullName || !values.nric || !values.dateOfBirth || !values.mobileNumber || !values.employmentStartDate) {
    return { error: "Please fill in all required fields." };
  }

  const { data: encrypted, error: encryptError } = await supabase.rpc("encrypt_nric", {
    plain: values.nric,
    secret: process.env.NRIC_ENCRYPTION_KEY!,
  });

  if (encryptError) {
    return { error: encryptError.message };
  }

  const { data: employee, error } = await supabase
    .from("employees")
    .insert({
      full_name: values.fullName,
      nric_encrypted: encrypted,
      nric_last4: values.nric.slice(-4).toUpperCase(),
      date_of_birth: values.dateOfBirth,
      mobile_number: `65${values.mobileNumber}`,
      residency_status: values.residencyStatus,
      designation: values.designation || null,
      employment_start_date: values.employmentStartDate,
      base_salary: Number(values.baseSalary) || 0,
      skill_level: values.skillLevel,
      bank_name: values.bankName || null,
      bank_account_number: values.bankAccountNumber || null,
    })
    .select("id")
    .single();

  if (error || !employee) {
    return { error: error?.message ?? "Failed to create employee." };
  }

  await ensureLeaveBalance(
    supabase,
    employee.id,
    values.employmentStartDate,
    new Date().getFullYear()
  );

  revalidatePath("/manager/employees");
  redirect("/manager/employees");
}

export async function updateEmployeeAction(
  id: string,
  _prevState: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const values = readForm(formData);

  if (!values.fullName || !values.dateOfBirth || !values.mobileNumber || !values.employmentStartDate) {
    return { error: "Please fill in all required fields." };
  }

  const update: Record<string, unknown> = {
    full_name: values.fullName,
    date_of_birth: values.dateOfBirth,
    mobile_number: `65${values.mobileNumber}`,
    residency_status: values.residencyStatus,
    designation: values.designation || null,
    employment_start_date: values.employmentStartDate,
    base_salary: Number(values.baseSalary) || 0,
    skill_level: values.skillLevel,
    bank_name: values.bankName || null,
    bank_account_number: values.bankAccountNumber || null,
  };

  if (values.nric) {
    const { data: encrypted, error: encryptError } = await supabase.rpc("encrypt_nric", {
      plain: values.nric,
      secret: process.env.NRIC_ENCRYPTION_KEY!,
    });

    if (encryptError) {
      return { error: encryptError.message };
    }

    update.nric_encrypted = encrypted;
    update.nric_last4 = values.nric.slice(-4).toUpperCase();
  }

  const { error } = await supabase.from("employees").update(update).eq("id", id);

  if (error) {
    return { error: error.message };
  }

  await ensureLeaveBalance(
    supabase,
    id,
    values.employmentStartDate,
    new Date().getFullYear()
  );

  revalidatePath("/manager/employees");
  revalidatePath(`/manager/employees/${id}`);
  redirect(`/manager/employees/${id}`);
}

export async function setEmployeeStatusAction(
  id: string,
  status: EmployeeStatus
): Promise<void> {
  const supabase = await createClient();
  const update: Record<string, unknown> = { status };
  if (status === "active") update.employment_end_date = null;
  await supabase.from("employees").update(update).eq("id", id);
  revalidatePath("/manager/employees");
  revalidatePath(`/manager/employees/${id}`);
}

export async function offboardEmployeeAction(
  id: string,
  endDate: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("employees")
    .update({ status: "inactive", employment_end_date: endDate })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/manager/employees");
  revalidatePath(`/manager/employees/${id}`);
  return {};
}
