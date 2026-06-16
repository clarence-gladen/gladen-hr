import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PayslipDetailClient } from "./payslip-detail-client";

export default async function EmployeePayslipDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("employee_id")
    .eq("id", auth.user!.id)
    .maybeSingle();

  const employeeId = profile?.employee_id;
  if (!employeeId) notFound();

  const { data: slip } = await supabase
    .from("payslips")
    .select(
      "id, basic_salary, overtime_amount, allowances, reimbursements, deductions, salary_advance_deduction, cpf_employee, cpf_employer, fwl_amount, sdl_amount, net_pay, payroll_runs(month, year)"
    )
    .eq("id", id)
    .eq("employee_id", employeeId)
    .maybeSingle();

  if (!slip) notFound();

  const run = Array.isArray(slip.payroll_runs) ? slip.payroll_runs[0] : slip.payroll_runs;
  const periodLabel = run
    ? new Date(run.year, run.month - 1).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : "—";

  return (
    <PayslipDetailClient
      slip={{
        id: slip.id,
        basic_salary: Number(slip.basic_salary),
        overtime_amount: Number(slip.overtime_amount),
        allowances: Number(slip.allowances),
        reimbursements: Number(slip.reimbursements),
        deductions: Number(slip.deductions),
        salary_advance_deduction: Number(slip.salary_advance_deduction),
        cpf_employee: Number(slip.cpf_employee),
        cpf_employer: Number(slip.cpf_employer),
        fwl_amount: Number(slip.fwl_amount),
        sdl_amount: Number(slip.sdl_amount),
        net_pay: Number(slip.net_pay),
        periodLabel,
      }}
    />
  );
}
