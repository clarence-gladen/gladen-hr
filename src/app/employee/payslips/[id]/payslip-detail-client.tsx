"use client";

import Link from "next/link";
import { Header } from "@/components/header";
import { useLanguage } from "@/lib/i18n/language-provider";

export interface PayslipDetail {
  id: string;
  basic_salary: number;
  overtime_amount: number;
  allowances: number;
  reimbursements: number;
  deductions: number;
  salary_advance_deduction: number;
  cpf_employee: number;
  cpf_employer: number;
  fwl_amount: number;
  sdl_amount: number;
  net_pay: number;
  periodLabel: string;
}

export function PayslipDetailClient({ slip }: { slip: PayslipDetail }) {
  const { t } = useLanguage();

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

  return (
    <>
      <Header title={`${t("payslips.payslipFor")} – ${slip.periodLabel}`} />
      <main className="flex-1 px-4 py-6">
        <div className="mb-4 overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="bg-brand px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
              {t("payslips.period")}
            </p>
            <p className="text-lg font-semibold text-white">{slip.periodLabel}</p>
          </div>

          <div className="divide-y divide-black/5">
            <div className="px-4 py-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40">
                {t("payslips.earnings")}
              </p>
            </div>
            <LineItem label={t("payroll.basicSalary")} amount={slip.basic_salary} />
            <LineItem label={t("payroll.overtime")} amount={slip.overtime_amount} />
            <LineItem label={t("payroll.allowances")} amount={slip.allowances} />
            <LineItem label={t("payroll.reimbursements")} amount={slip.reimbursements} />

            {(slip.deductions > 0 || slip.salary_advance_deduction > 0 || slip.cpf_employee > 0) && (
              <>
                <div className="px-4 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40">
                    {t("payroll.deductions")}
                  </p>
                </div>
                <LineItem label={t("payroll.deductions")} amount={slip.deductions} deduction />
                <LineItem label={t("payroll.salaryAdvance")} amount={slip.salary_advance_deduction} deduction />
                <LineItem label={t("payroll.cpfEmployee")} amount={slip.cpf_employee} deduction />
              </>
            )}

            {(slip.cpf_employer > 0 || slip.fwl_amount > 0 || slip.sdl_amount > 0) && (
              <>
                <div className="px-4 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40">
                    {t("payslips.employerContributions")}
                  </p>
                </div>
                <LineItem label={t("payroll.cpfEmployer")} amount={slip.cpf_employer} />
                <LineItem label={t("payroll.fwl")} amount={slip.fwl_amount} />
                <LineItem label={t("payroll.sdl")} amount={slip.sdl_amount} />
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

        <Link href="/employee/payslips" className="block text-center text-sm font-medium text-brand">
          ← {t("payslips.backToPayslips")}
        </Link>
      </main>
    </>
  );
}
