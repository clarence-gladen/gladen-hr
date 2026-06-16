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
      "id, basic_salary, transport_allowance, allowances, overtime_amount, mid_month_payment, salary_advance_deduction, deductions, cpf_employee, cpf_employer, net_pay, pdf_url, payroll_runs(month, year)"
    )
    .eq("id", id)
    .eq("employee_id", employeeId)
    .maybeSingle();

  if (!slip) notFound();

  const run = Array.isArray(slip.payroll_runs) ? slip.payroll_runs[0] : slip.payroll_runs;
  const periodLabel = run
    ? new Date(run.year, run.month - 1).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : "—";

  let downloadUrl: string | undefined;
  if (slip.pdf_url) {
    const { data: signed } = await supabase.storage
      .from("payslips")
      .createSignedUrl(slip.pdf_url, 3600);
    downloadUrl = signed?.signedUrl;
  }

  return (
    <PayslipDetailClient
      slip={{
        id: slip.id,
        basic_salary: Number(slip.basic_salary),
        transport_allowance: Number(slip.transport_allowance),
        allowances: Number(slip.allowances),
        overtime_amount: Number(slip.overtime_amount),
        mid_month_payment: Number(slip.mid_month_payment),
        salary_advance_deduction: Number(slip.salary_advance_deduction),
        deductions: Number(slip.deductions),
        cpf_employee: Number(slip.cpf_employee),
        cpf_employer: Number(slip.cpf_employer),
        net_pay: Number(slip.net_pay),
        periodLabel,
      }}
      downloadUrl={downloadUrl}
    />
  );
}
