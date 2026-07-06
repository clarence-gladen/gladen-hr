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

  const { data: rawPayslips } = await supabase
    .from("payslips")
    .select(
      "id, employee_id, basic_salary, transport_allowance, allowances, overtime_amount, bonus, reimbursement, mid_month_payment, salary_advance_deduction, deductions, cpf_employee, cpf_employer, net_pay, pdf_url, employees(full_name)"
    )
    .eq("payroll_run_id", id);

  const payslips = (rawPayslips ?? []).sort((a, b) => {
    const emp = (e: typeof a.employees) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Array.isArray(e) ? (e as any[])[0]?.full_name : (e as any)?.full_name) ?? "";
    return emp(a.employees).localeCompare(emp(b.employees));
  });

  const signedUrls = new Map<string, string>();
  if (payslips) {
    await Promise.all(
      payslips
        .filter((p) => p.pdf_url)
        .map(async (p) => {
          const { data } = await supabase.storage
            .from("payslips")
            .createSignedUrl(p.pdf_url!, 3600);
          if (data?.signedUrl) signedUrls.set(p.id, data.signedUrl);
        })
    );
  }

  return (
    <PayrollRunClient
      run={run}
      payslips={payslips ?? []}
      signedUrls={Object.fromEntries(signedUrls)}
    />
  );
}
