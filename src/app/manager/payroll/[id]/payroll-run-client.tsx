"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { Header } from "@/components/header";
import { useLanguage } from "@/lib/i18n/language-provider";
import {
  finalizePayrollRunAction,
  generatePayslipsAction,
  generatePdfsAction,
  updatePayslipAction,
} from "../actions";
import type { PayrollStatus } from "@/lib/types/database";

interface PayslipRow {
  id: string;
  employee_id: string;
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
  employees: { full_name: string } | { full_name: string }[] | null;
}

interface PayrollRunInfo {
  id: string;
  month: number;
  year: number;
  status: PayrollStatus;
}

function employeeName(row: PayslipRow): string {
  const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;
  return employee?.full_name ?? "—";
}

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const inputClass =
  "w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";
const labelClass = "mb-1 block text-xs font-medium text-foreground/60";

function PayslipCard({ payslip }: { payslip: PayslipRow }) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [state, formAction, pending] = useActionState(
    updatePayslipAction.bind(null, payslip.id),
    {}
  );

  return (
    <li className="rounded-xl bg-white p-4 shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="font-semibold text-foreground">{employeeName(payslip)}</span>
        <span className="shrink-0 text-sm font-semibold text-brand">
          S${Number(payslip.net_pay).toFixed(2)}
        </span>
      </button>

      {expanded && (
        <form action={formAction} className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor={`basicSalary-${payslip.id}`}>
                {t("payroll.basicSalary")}
              </label>
              <input
                id={`basicSalary-${payslip.id}`}
                name="basicSalary"
                type="number"
                step="0.01"
                defaultValue={payslip.basic_salary}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor={`overtimeAmount-${payslip.id}`}>
                {t("payroll.overtime")}
              </label>
              <input
                id={`overtimeAmount-${payslip.id}`}
                name="overtimeAmount"
                type="number"
                step="0.01"
                defaultValue={payslip.overtime_amount}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor={`allowances-${payslip.id}`}>
                {t("payroll.allowances")}
              </label>
              <input
                id={`allowances-${payslip.id}`}
                name="allowances"
                type="number"
                step="0.01"
                defaultValue={payslip.allowances}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor={`reimbursements-${payslip.id}`}>
                {t("payroll.reimbursements")}
              </label>
              <input
                id={`reimbursements-${payslip.id}`}
                name="reimbursements"
                type="number"
                step="0.01"
                defaultValue={payslip.reimbursements}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor={`deductions-${payslip.id}`}>
                {t("payroll.deductions")}
              </label>
              <input
                id={`deductions-${payslip.id}`}
                name="deductions"
                type="number"
                step="0.01"
                defaultValue={payslip.deductions}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor={`salaryAdvanceDeduction-${payslip.id}`}>
                {t("payroll.salaryAdvance")}
              </label>
              <input
                id={`salaryAdvanceDeduction-${payslip.id}`}
                name="salaryAdvanceDeduction"
                type="number"
                step="0.01"
                defaultValue={payslip.salary_advance_deduction}
                className={inputClass}
              />
            </div>
          </div>

          <div className="space-y-1 rounded-lg bg-black/5 p-3 text-sm text-foreground/60">
            <div className="flex justify-between">
              <span>{t("payroll.cpfEmployee")}</span>
              <span>S${Number(payslip.cpf_employee).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>{t("payroll.cpfEmployer")}</span>
              <span>S${Number(payslip.cpf_employer).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>{t("payroll.fwl")}</span>
              <span>S${Number(payslip.fwl_amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>{t("payroll.sdl")}</span>
              <span>S${Number(payslip.sdl_amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold text-foreground">
              <span>{t("payroll.netPay")}</span>
              <span>S${Number(payslip.net_pay).toFixed(2)}</span>
            </div>
          </div>

          {state.error && <p className="text-sm text-red-600">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-brand py-2 text-sm font-semibold text-white transition disabled:opacity-60"
          >
            {pending ? t("common.loading") : t("payroll.save")}
          </button>
        </form>
      )}
    </li>
  );
}

export function PayrollRunClient({
  run,
  payslips,
}: {
  run: PayrollRunInfo;
  payslips: PayslipRow[];
}) {
  const { t } = useLanguage();
  const [isPending, startTransition] = useTransition();
  const [pdfMessage, setPdfMessage] = useState<string | null>(null);

  function handleGenerate() {
    startTransition(() => {
      generatePayslipsAction(run.id);
    });
  }

  function handleFinalize() {
    startTransition(() => {
      finalizePayrollRunAction(run.id);
    });
  }

  function handleGeneratePdfs() {
    setPdfMessage(null);
    startTransition(async () => {
      const result = await generatePdfsAction(run.id);
      setPdfMessage(result.error ?? t("payroll.pdfsGenerated"));
    });
  }

  return (
    <>
      <Header title={`${monthNames[run.month - 1]} ${run.year}`} />
      <main className="flex-1 px-4 py-6">
        <Link href="/manager/payroll" className="mb-4 inline-block text-sm font-medium text-brand">
          ← {t("payroll.back")}
        </Link>
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={handleGenerate}
            className="flex-1 rounded-lg bg-brand py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {t("payroll.generatePayslips")}
          </button>
          {run.status !== "completed" && (
            <button
              type="button"
              disabled={isPending}
              onClick={handleFinalize}
              className="flex-1 rounded-lg bg-black/5 py-3 text-sm font-semibold text-foreground disabled:opacity-60"
            >
              {t("payroll.finalize")}
            </button>
          )}
        </div>
        {payslips.length > 0 && (
          <div className="mb-4">
            <button
              type="button"
              disabled={isPending}
              onClick={handleGeneratePdfs}
              className="w-full rounded-lg border border-brand py-3 text-sm font-semibold text-brand disabled:opacity-60"
            >
              {isPending ? t("common.loading") : t("payroll.generatePdfs")}
            </button>
            {pdfMessage && (
              <p className="mt-2 text-center text-sm text-foreground/60">{pdfMessage}</p>
            )}
          </div>
        )}

        {payslips.length === 0 ? (
          <p className="text-center text-sm text-foreground/60">{t("payroll.noPayslips")}</p>
        ) : (
          <ul className="space-y-3">
            {payslips.map((payslip) => (
              <PayslipCard key={payslip.id} payslip={payslip} />
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
