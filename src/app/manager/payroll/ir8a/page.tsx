import { createClient } from "@/lib/supabase/server";
import { Ir8aClient, type EmployeeYearData } from "./ir8a-client";

export default async function Ir8aPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const year = Number(yearParam) || new Date().getFullYear() - 1;

  const supabase = await createClient();

  const { data: runs } = await supabase
    .from("payroll_runs")
    .select("id")
    .eq("year", year)
    .eq("status", "completed");

  const runIds = (runs ?? []).map((r) => r.id);

  let employees: EmployeeYearData[] = [];

  if (runIds.length > 0) {
    const { data: payslips } = await supabase
      .from("payslips")
      .select(
        "employee_id, basic_salary, transport_allowance, allowances, overtime_amount, bonus, reimbursement, cpf_employee, cpf_employer, employees(full_name, nric_last4, date_of_birth, designation, employment_start_date, employment_end_date)"
      )
      .in("payroll_run_id", runIds);

    const byEmployee = new Map<string, EmployeeYearData>();

    for (const p of payslips ?? []) {
      const emp = Array.isArray(p.employees) ? p.employees[0] : p.employees;
      if (!emp) continue;

      const existing = byEmployee.get(p.employee_id);
      const income =
        Number(p.basic_salary) +
        Number(p.transport_allowance) +
        Number(p.allowances) +
        Number(p.overtime_amount);

      if (existing) {
        existing.employmentIncome += income;
        existing.bonus += Number(p.bonus);
        existing.reimbursement += Number(p.reimbursement);
        existing.cpfEmployee += Number(p.cpf_employee);
        existing.cpfEmployer += Number(p.cpf_employer);
      } else {
        byEmployee.set(p.employee_id, {
          employeeId: p.employee_id,
          fullName: emp.full_name,
          nricLast4: emp.nric_last4 ?? "",
          dateOfBirth: emp.date_of_birth ?? `${year}-01-01`,
          designation: emp.designation ?? null,
          employmentStartDate: emp.employment_start_date ?? `${year}-01-01`,
          employmentEndDate: emp.employment_end_date ?? null,
          employmentIncome: income,
          bonus: Number(p.bonus),
          reimbursement: Number(p.reimbursement),
          cpfEmployee: Number(p.cpf_employee),
          cpfEmployer: Number(p.cpf_employer),
        });
      }
    }

    employees = Array.from(byEmployee.values()).sort((a, b) =>
      a.fullName.localeCompare(b.fullName)
    );
  }

  return <Ir8aClient year={year} employees={employees} />;
}
