import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmployeeForm, type EmployeeFormDefaults } from "../../employee-form";
import { updateEmployeeAction } from "../../actions";

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: employee } = await supabase
    .from("employees")
    .select(
      "full_name, date_of_birth, mobile_number, residency_status, designation, employment_start_date, base_salary, skill_level, bank_name, bank_account_number, work_days_per_week"
    )
    .eq("id", id)
    .maybeSingle();

  if (!employee) notFound();

  const defaultValues: EmployeeFormDefaults = {
    fullName: employee.full_name,
    nric: "",
    dateOfBirth: employee.date_of_birth,
    mobileNumber: employee.mobile_number.replace(/^65/, ""),
    residencyStatus: employee.residency_status,
    designation: employee.designation ?? "",
    employmentStartDate: employee.employment_start_date,
    baseSalary: String(employee.base_salary),
    skillLevel: employee.skill_level,
    bankName: employee.bank_name ?? "",
    bankAccountNumber: employee.bank_account_number ?? "",
    workDaysPerWeek: (employee.work_days_per_week === 6 ? 6 : 5) as 5 | 6,
  };

  return (
    <EmployeeForm
      titleKey="employees.editEmployee"
      action={updateEmployeeAction.bind(null, id)}
      defaultValues={defaultValues}
      isEdit
    />
  );
}
