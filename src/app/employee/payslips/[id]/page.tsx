import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/header";

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
    ? new Date(run.year, run.month - 1).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      })
    : "—";

  function LineItem({
    label,
    amount,
    highlight,
    deduction,
  }: {
    label: string;
    amount: number;
    highlight?: boolean;
    deduction?: boolean;
  }) {
    if (amount === 0) return null;
    return (
      <div
        className={`flex items-center justify-between px-4 py-3 ${
          highlight ? "border-t border-black/5 font-semibold" : ""
        }`}
      >
        <span className={`text-sm ${highlight ? "text-foreground" : "text-foreground/70"}`}>
          {label}
        </span>
        <span
          className={`text-sm ${
            highlight ? "text-foreground" : deduction ? "text-red-600" : "text-foreground"
          }`}
        >
          {deduction ? "−" : ""}S${amount.toFixed(2)}
        </span>
      </div>
    );
  }

  return (
    <>
      <Header title={`Payslip – ${periodLabel}`} />
      <main className="flex-1 px-4 py-6">
        <div className="mb-4 overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="bg-brand px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
              Pay Period
            </p>
            <p className="text-lg font-semibold text-white">{periodLabel}</p>
          </div>

          <div className="divide-y divide-black/5">
            <div className="px-4 py-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40">
                Earnings
              </p>
            </div>
            <LineItem label="Basic Salary" amount={Number(slip.basic_salary)} />
            <LineItem label="Overtime" amount={Number(slip.overtime_amount)} />
            <LineItem label="Allowances" amount={Number(slip.allowances)} />
            <LineItem label="Reimbursements" amount={Number(slip.reimbursements)} />

            {(Number(slip.deductions) > 0 ||
              Number(slip.salary_advance_deduction) > 0 ||
              Number(slip.cpf_employee) > 0) && (
              <>
                <div className="px-4 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40">
                    Deductions
                  </p>
                </div>
                <LineItem label="Deductions" amount={Number(slip.deductions)} deduction />
                <LineItem
                  label="Salary Advance"
                  amount={Number(slip.salary_advance_deduction)}
                  deduction
                />
                <LineItem label="CPF (Employee)" amount={Number(slip.cpf_employee)} deduction />
              </>
            )}

            {(Number(slip.cpf_employer) > 0 ||
              Number(slip.fwl_amount) > 0 ||
              Number(slip.sdl_amount) > 0) && (
              <>
                <div className="px-4 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40">
                    Employer Contributions
                  </p>
                </div>
                <LineItem label="CPF (Employer)" amount={Number(slip.cpf_employer)} />
                <LineItem label="Foreign Worker Levy" amount={Number(slip.fwl_amount)} />
                <LineItem label="SDL" amount={Number(slip.sdl_amount)} />
              </>
            )}

            <div className="bg-brand/5 px-4 py-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">Net Pay</span>
                <span className="text-xl font-bold text-brand">
                  S${Number(slip.net_pay).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <Link
          href="/employee/payslips"
          className="block text-center text-sm font-medium text-brand"
        >
          ← Back to Payslips
        </Link>
      </main>
    </>
  );
}
