import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmployeeDetailClient } from "./employee-detail-client";
import type { EmployeeDetail, ResidencyStatus, SkillLevel, EmployeeStatus } from "@/lib/types/database";

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("employees")
    .select(
      "id, full_name, nric_last4, date_of_birth, mobile_number, residency_status, designation, employment_start_date, employment_end_date, base_salary, skill_level, bank_name, bank_account_number, status"
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();

  const employee: EmployeeDetail = {
    id: data.id,
    full_name: data.full_name,
    nric_last4: data.nric_last4,
    date_of_birth: data.date_of_birth,
    mobile_number: data.mobile_number,
    residency_status: data.residency_status as ResidencyStatus,
    designation: data.designation,
    employment_start_date: data.employment_start_date,
    employment_end_date: data.employment_end_date,
    base_salary: Number(data.base_salary),
    skill_level: data.skill_level as SkillLevel,
    bank_name: data.bank_name,
    bank_account_number: data.bank_account_number,
    status: data.status as EmployeeStatus,
  };

  return <EmployeeDetailClient employee={employee} />;
}
