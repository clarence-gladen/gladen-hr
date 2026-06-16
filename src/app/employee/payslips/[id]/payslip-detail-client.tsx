"use client";

import Link from "next/link";
import { Header } from "@/components/header";
import { useLanguage } from "@/lib/i18n/language-provider";

export interface PayslipDetail {
  id: string;
  basic_salary: number;
  transport_allowance: number;
  allowances: number;
  overtime_amount: number;
  mid_month_payment: number;
  salary_advance_deduction: number;
  deductions: number;
  cpf_employee: number;
  cpf_employer: number;
  net_pay: number;
  month: number | null;
  year: number | null;
}

export function PayslipDetailClient({ slip, downloadUrl }: { slip: PayslipDetail; downloadUrl?: string }) {
  const { t } = useLanguage();

  const periodLabel = slip.month && slip.year
    ? new Date(slip.year, slip.month - 1).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : "—";

  const periodRange = slip.month && slip.year
    ? (() => {
        const lastDay = new Date(slip.year!, slip.month!, 0).getDate();
        const start = new Date(slip.year!, slip.month! - 1, 1).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
        const end = new Date(slip.year!, slip.month! - 1, lastDay).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
        return `${start} – ${end}`;
      })()
    : null;

  function LineItem({
    label,
    amount,
    deduction,
    bold,
  }: {
    label: string;
    amount: number;
    deduction?: boolean;
    bold?: boolean;
  }) {
    if (amount === 0) return null;
    return (
      <div className={`flex items-center justify-between px-4 py-3 ${bold ? "border-t border-black/5" : ""}`}>
        <span className={`text-sm ${bold ? "font-semibold text-foreground" : "text-foreground/70"}`}>
          {label}
        </span>
        <span className={`text-sm ${bold ? "font-semibold text-foreground" : deduction ? "text-red-600" : "text-foreground"}`}>
          {deduction ? "−" : ""}S${amount.toFixed(2)}
        </span>
      </div>
    );
  }

  const hasDeductions =
    slip.cpf_employee > 0 ||
    slip.mid_month_payment > 0 ||
    slip.salary_advance_deduction > 0 ||
    slip.deductions > 0;

  return (
    <>
      <Header title={`${t("payslips.payslipFor")} – ${periodLabel}`} />
      <main className="flex-1 px-4 py-6">
        <div className="mb-4 overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="bg-brand px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
              {t("payslips.period")}
            </p>
            <p className="text-lg font-semibold text-white">{periodLabel}</p>
            {periodRange && (
              <p className="text-xs text-white/60">{periodRange}</p>
            )}
          </div>

          <div className="divide-y divide-black/5">
            {/* Earnings */}
            <div className="px-4 py-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40">
                {t("payslips.earnings")}
              </p>
            </div>
            <LineItem label={t("payroll.basicSalary")} amount={slip.basic_salary} />
            <LineItem label={t("payroll.transportAllowance")} amount={slip.transport_allowance} />
            <LineItem label={t("payroll.otherAllowance")} amount={slip.allowances} />
            <LineItem label={t("payroll.overtime")} amount={slip.overtime_amount} />

            {/* Deductions */}
            {hasDeductions && (
              <>
                <div className="px-4 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40">
                    {t("payroll.deductions")}
                  </p>
                </div>
                <LineItem label={t("payroll.cpfEmployee")} amount={slip.cpf_employee} deduction />
                <LineItem label={t("payroll.midMonthPayment")} amount={slip.mid_month_payment} deduction />
                <LineItem label={t("payroll.salaryLoan")} amount={slip.salary_advance_deduction} deduction />
                <LineItem label={t("payroll.otherDeductions")} amount={slip.deductions} deduction />
              </>
            )}

            {/* Employer contributions */}
            {slip.cpf_employer > 0 && (
              <>
                <div className="px-4 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40">
                    {t("payslips.employerContributions")}
                  </p>
                </div>
                <LineItem label={t("payroll.cpfEmployer")} amount={slip.cpf_employer} />
              </>
            )}

            <div className="bg-brand/5 px-4 py-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">{t("payroll.netPay")}</span>
                <span className="text-xl font-bold text-brand">S${slip.net_pay.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {downloadUrl && (
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-3 block w-full rounded-lg bg-brand py-3 text-center text-sm font-semibold text-white"
          >
            {t("payslips.download")}
          </a>
        )}

        <Link href="/employee/payslips" className="block text-center text-sm font-medium text-brand">
          ← {t("payslips.backToPayslips")}
        </Link>
      </main>
    </>
  );
}
