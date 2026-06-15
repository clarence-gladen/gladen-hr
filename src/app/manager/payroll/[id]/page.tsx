import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PayrollRunClient } from "./payroll-run-client";

export default async function PayrollRunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: run } = await supabase
    .from("payroll_runs")
    .select("id, month, year, status")
    .eq("id", id)
    .single();

  if (!run) {
    notFound();
  }

  const { data: payslips } = await supabase
    .from("payslips")
    .select(
      "id, employee_id, basic_salary, overtime_amount, allowances, reimbursements, deductions, salary_advance_deduction, cpf_employee, cpf_employer, fwl_amount, sdl_amount, net_pay, employees(full_name)"
    )
    .eq("payroll_run_id", id);

  return <PayrollRunClient run={run} payslips={payslips ?? []} />;
}
