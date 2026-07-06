"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { useLanguage } from "@/lib/i18n/language-provider";
import {
  deletePayrollRunAction,
  downloadCpfSubmissionAction,
  downloadGiroAction,
  downloadPayrollExcelAction,
  finalisePayrollAction,
  generatePayslipsAction,
  updatePayslipAction,
} from "../actions";
import type { PayrollStatus } from "@/lib/types/database";

interface PayslipRow {
  id: string;
  employee_id: string;
  basic_salary: number;
  transport_allowance: number;
  allowances: number;
  overtime_amount: number;
  bonus: number;
  reimbursement: number;
  mid_month_payment: number;
  salary_advance_deduction: number;
  deductions: number;
  cpf_employee: number;
  cpf_employer: number;
  net_pay: number;
  pdf_url?: string | null;
  employees: { full_name: string } | { full_name: string }[] | null;
}

interface PayrollRunInfo {
  id: string;
  month: number;
  year: number;
  status: PayrollStatus;
}

function employeeName(row: PayslipRow): string {
  const e = Array.isArray(row.employees) ? row.employees[0] : row.employees;
  return e?.full_name ?? "—";
}

const monthNames = Array.from({ length: 12 }, (_, i) =>
  new Date(2024, i, 1).toLocaleDateString(undefined, { month: "long" })
);

const inputClass =
  "w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";
const labelClass = "mb-1 block text-xs font-medium text-foreground/60";
const sectionLabel = "mb-2 text-[10px] font-bold uppercase tracking-wider text-foreground/40";

function SummaryCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg bg-black/[0.03] px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground/40">{label}</p>
      <p className={`mt-1 text-lg font-bold ${highlight ? "text-brand" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

function PayrollSummaryBar({ payslips }: { payslips: PayslipRow[] }) {
  const totalGross = payslips.reduce(
    (sum, p) =>
      sum +
      Number(p.basic_salary) +
      Number(p.transport_allowance) +
      Number(p.allowances) +
      Number(p.overtime_amount) +
      Number(p.bonus) +
      Number(p.reimbursement),
    0
  );
  const totalNet = payslips.reduce((sum, p) => sum + Number(p.net_pay), 0);
  const totalCpfEmployer = payslips.reduce((sum, p) => sum + Number(p.cpf_employer), 0);
  const totalCpfEmployee = payslips.reduce((sum, p) => sum + Number(p.cpf_employee), 0);

  return (
    <div className="rounded-xl bg-white p-3 shadow-sm space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <SummaryCell label={`${payslips.length} Employee${payslips.length !== 1 ? "s" : ""} — Gross`} value={`S$ ${totalGross.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
        <SummaryCell label="CPF Employer" value={`S$ ${totalCpfEmployer.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <SummaryCell label="CPF Employee" value={`S$ ${totalCpfEmployee.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
        <SummaryCell label="Total Net Pay" value={`S$ ${totalNet.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} highlight />
      </div>
    </div>
  );
}

function PayslipCard({ payslip, downloadUrl, locked }: { payslip: PayslipRow; downloadUrl?: string; locked: boolean }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, startSaveTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaveError(null);
    const formData = new FormData(e.currentTarget);
    startSaveTransition(async () => {
      const result = await updatePayslipAction(payslip.id, {}, formData);
      if (result?.error) setSaveError(result.error);
      else router.refresh();
    });
  }

  const gross =
    Number(payslip.basic_salary) +
    Number(payslip.transport_allowance) +
    Number(payslip.allowances) +
    Number(payslip.overtime_amount) +
    Number(payslip.bonus) +
    Number(payslip.reimbursement);

  return (
    <li className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex flex-1 items-start justify-between gap-3 text-left"
        >
          <span className="font-semibold text-foreground">{employeeName(payslip)}</span>
          <div className="shrink-0 text-right">
            <p className="text-xs text-foreground/40">Gross S$ {gross.toFixed(2)}</p>
            <p className="text-sm font-bold text-brand">Net S$ {Number(payslip.net_pay).toFixed(2)}</p>
          </div>
        </button>
        {downloadUrl && (
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand"
          >
            PDF
          </a>
        )}
      </div>

      {expanded && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Earnings */}
          <div>
            <p className={sectionLabel}>{t("payroll.earningsSection")}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass} htmlFor={`basicSalary-${payslip.id}`}>
                  {t("payroll.basicSalary")}
                </label>
                <input id={`basicSalary-${payslip.id}`} name="basicSalary" type="text" inputMode="decimal"
                  defaultValue={payslip.basic_salary} className={inputClass} disabled={locked} />
              </div>
              <div>
                <label className={labelClass} htmlFor={`transportAllowance-${payslip.id}`}>
                  {t("payroll.transportAllowance")}
                </label>
                <input id={`transportAllowance-${payslip.id}`} name="transportAllowance" type="text" inputMode="decimal"
                  defaultValue={payslip.transport_allowance} className={inputClass} disabled={locked} />
              </div>
              <div>
                <label className={labelClass} htmlFor={`allowances-${payslip.id}`}>
                  {t("payroll.otherAllowance")}
                </label>
                <input id={`allowances-${payslip.id}`} name="allowances" type="text" inputMode="decimal"
                  defaultValue={payslip.allowances} className={inputClass} disabled={locked} />
              </div>
              <div>
                <label className={labelClass} htmlFor={`overtimeAmount-${payslip.id}`}>
                  {t("payroll.overtime")}
                </label>
                <input id={`overtimeAmount-${payslip.id}`} name="overtimeAmount" type="text" inputMode="decimal"
                  defaultValue={payslip.overtime_amount} className={inputClass} disabled={locked} />
              </div>
              <div className="col-span-2">
                <label className={labelClass} htmlFor={`bonus-${payslip.id}`}>
                  Bonus (AW — CPF applies)
                </label>
                <input id={`bonus-${payslip.id}`} name="bonus" type="text" inputMode="decimal"
                  defaultValue={payslip.bonus} className={inputClass} disabled={locked} />
              </div>
              <div className="col-span-2">
                <label className={labelClass} htmlFor={`reimbursement-${payslip.id}`}>
                  Reimbursement (Tax-Exempt)
                </label>
                <input id={`reimbursement-${payslip.id}`} name="reimbursement" type="text" inputMode="decimal"
                  defaultValue={payslip.reimbursement} className={inputClass} disabled={locked} />
              </div>
            </div>
          </div>

          {/* Deductions */}
          <div>
            <p className={sectionLabel}>{t("payroll.deductionsSection")}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass} htmlFor={`midMonthPayment-${payslip.id}`}>
                  {t("payroll.midMonthPayment")}
                </label>
                <input id={`midMonthPayment-${payslip.id}`} name="midMonthPayment" type="text" inputMode="decimal"
                  defaultValue={payslip.mid_month_payment} className={inputClass} disabled={locked} />
              </div>
              <div>
                <label className={labelClass} htmlFor={`salaryAdvanceDeduction-${payslip.id}`}>
                  {t("payroll.salaryLoan")}
                </label>
                <input id={`salaryAdvanceDeduction-${payslip.id}`} name="salaryAdvanceDeduction" type="text" inputMode="decimal"
                  defaultValue={payslip.salary_advance_deduction} className={inputClass} disabled={locked} />
              </div>
              <div className="col-span-2">
                <label className={labelClass} htmlFor={`deductions-${payslip.id}`}>
                  {t("payroll.otherDeductions")}
                </label>
                <input id={`deductions-${payslip.id}`} name="deductions" type="text" inputMode="decimal"
                  defaultValue={payslip.deductions} className={inputClass} disabled={locked} />
              </div>
            </div>
          </div>

          {/* Auto-calculated totals */}
          <div className="rounded-lg bg-black/[0.04] p-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-foreground/60">
              <span>Gross Pay</span>
              <span>S$ {gross.toFixed(2)}</span>
            </div>
            {Number(payslip.cpf_employee) > 0 && (
              <div className="flex justify-between text-foreground/60">
                <span>{t("payroll.cpfEmployee")}</span>
                <span>− S$ {Number(payslip.cpf_employee).toFixed(2)}</span>
              </div>
            )}
            {Number(payslip.cpf_employer) > 0 && (
              <div className="flex justify-between text-foreground/60">
                <span>{t("payroll.cpfEmployer")} (cost)</span>
                <span>S$ {Number(payslip.cpf_employer).toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-black/10 pt-1.5 flex justify-between font-bold text-foreground">
              <span>{t("payroll.netPay")}</span>
              <span className="text-brand">S$ {Number(payslip.net_pay).toFixed(2)}</span>
            </div>
          </div>

          {saveError && <p className="text-sm text-red-600">{saveError}</p>}

          {!locked && (
            <button type="submit" disabled={saving}
              className="w-full rounded-lg bg-brand py-2 text-sm font-semibold text-white transition disabled:opacity-60">
              {saving ? t("common.loading") : t("payroll.save")}
            </button>
          )}
        </form>
      )}
    </li>
  );
}

export function PayrollRunClient({
  run,
  payslips,
  signedUrls = {},
}: {
  run: PayrollRunInfo;
  payslips: PayslipRow[];
  signedUrls?: Record<string, string>;
}) {
  const { t } = useLanguage();
  const [isPending, startTransition] = useTransition();
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [finaliseMsg, setFinaliseMsg] = useState<{ error?: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);
  const [excelError, setExcelError] = useState<string | null>(null);
  const [excelPending, startExcelTransition] = useTransition();
  const [cpfError, setCpfError] = useState<string | null>(null);
  const [cpfPending, startCpfTransition] = useTransition();
  const [giroError, setGiroError] = useState<string | null>(null);
  const [giroPending, startGiroTransition] = useTransition();

  const isCompleted = run.status === "completed";
  const hasPayslips = payslips.length > 0;

  function handleGenerate() {
    setGenerateError(null);
    startTransition(async () => {
      const result = await generatePayslipsAction(run.id);
      if (result?.error) setGenerateError(result.error);
    });
  }

  function handleFinalise() {
    setFinaliseMsg(null);
    startTransition(async () => {
      const result = await finalisePayrollAction(run.id);
      if (result.error) setFinaliseMsg(result);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deletePayrollRunAction(run.id);
      if (result?.error) setDeleteMsg(result.error);
    });
  }

  function triggerXlsxDownload(base64: string, filename: string) {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleDownloadExcel() {
    setExcelError(null);
    startExcelTransition(async () => {
      const result = await downloadPayrollExcelAction(run.id);
      if (result.error) { setExcelError(result.error); return; }
      triggerXlsxDownload(result.base64!, result.filename!);
    });
  }

  function handleDownloadCpf() {
    setCpfError(null);
    startCpfTransition(async () => {
      const result = await downloadCpfSubmissionAction(run.id);
      if (result.error) { setCpfError(result.error); return; }
      triggerXlsxDownload(result.base64!, result.filename!);
    });
  }

  function handleDownloadGiro() {
    setGiroError(null);
    startGiroTransition(async () => {
      const result = await downloadGiroAction(run.id);
      if (result.error) { setGiroError(result.error); return; }
      triggerXlsxDownload(result.base64!, result.filename!);
    });
  }

  return (
    <>
      <Header title={`${monthNames[run.month - 1]} ${run.year}`} />
      <main className="flex-1 px-4 py-6 mx-auto w-full max-w-4xl">
        <Link href="/manager/payroll" className="mb-4 inline-block text-sm font-medium text-brand">
          ← {t("payroll.back")}
        </Link>

        {/* Status banner */}
        {isCompleted ? (
          <div className="mb-4 space-y-2">
            <div className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3">
              <span className="text-green-600">✓</span>
              <span className="text-sm font-semibold text-green-700">{t("payroll.completedBanner")}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled={excelPending}
                onClick={handleDownloadExcel}
                className="flex flex-col items-center justify-center gap-1 rounded-xl border border-brand/30 bg-brand/5 px-2 py-3 text-brand disabled:opacity-60"
              >
                <span className="text-lg">📊</span>
                <span className="text-center text-xs font-semibold leading-tight">
                  {excelPending ? "…" : "Payroll Report"}
                </span>
              </button>
              <button
                type="button"
                disabled={cpfPending}
                onClick={handleDownloadCpf}
                className="flex flex-col items-center justify-center gap-1 rounded-xl border border-brand/30 bg-brand/5 px-2 py-3 text-brand disabled:opacity-60"
              >
                <span className="text-lg">🏛️</span>
                <span className="text-center text-xs font-semibold leading-tight">
                  {cpfPending ? "…" : "CPF Submission"}
                </span>
              </button>
              <button
                type="button"
                disabled={giroPending}
                onClick={handleDownloadGiro}
                className="flex flex-col items-center justify-center gap-1 rounded-xl border border-brand/30 bg-brand/5 px-2 py-3 text-brand disabled:opacity-60"
              >
                <span className="text-lg">🏦</span>
                <span className="text-center text-xs font-semibold leading-tight">
                  {giroPending ? "…" : "GIRO Transfer"}
                </span>
              </button>
            </div>
            {(excelError || cpfError || giroError) && (
              <p className="text-center text-xs text-red-600">
                {excelError ?? cpfError ?? giroError}
              </p>
            )}
          </div>
        ) : (
          <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
            {/* Step indicators */}
            <div className="mb-4 flex items-center gap-2 text-xs">
              <StepDot done active={!hasPayslips} label="1" />
              <div className={`h-px flex-1 ${hasPayslips ? "bg-brand" : "bg-black/10"}`} />
              <StepDot done={hasPayslips} active={hasPayslips} label="2" />
              <div className="h-px flex-1 bg-black/10" />
              <StepDot done={false} active={false} label="3" />
            </div>
            <div className="mb-4 flex justify-between text-[10px] font-semibold uppercase tracking-wide text-foreground/40">
              <span>{t("payroll.step1")}</span>
              <span>{t("payroll.step2")}</span>
              <span>{t("payroll.step3")}</span>
            </div>

            {/* Step 1: Generate payslips (only if none exist) */}
            {!hasPayslips && (
              <div>
                <button type="button" disabled={isPending} onClick={handleGenerate}
                  className="w-full rounded-lg bg-brand py-3 text-sm font-semibold text-white disabled:opacity-60">
                  {isPending ? t("common.loading") : t("payroll.generatePayslips")}
                </button>
                {generateError && (
                  <p className="mt-2 text-center text-sm text-red-600">{generateError}</p>
                )}
              </div>
            )}

            {/* Step 3: Finalise (only if payslips exist) */}
            {hasPayslips && (
              <div>
                <button type="button" disabled={isPending} onClick={handleFinalise}
                  className="w-full rounded-lg bg-brand py-3 text-sm font-semibold text-white disabled:opacity-60">
                  {isPending ? t("common.loading") : t("payroll.finalise")}
                </button>
                {finaliseMsg?.error && (
                  <p className="mt-2 text-center text-sm text-red-600">{finaliseMsg.error}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Payslip list */}
        {payslips.length === 0 ? (
          <p className="text-center text-sm text-foreground/60">{t("payroll.noPayslips")}</p>
        ) : (
          <>
            <PayrollSummaryBar payslips={payslips} />
            <ul className="mt-3 space-y-3">
              {payslips.map((payslip) => (
                <PayslipCard
                  key={payslip.id}
                  payslip={payslip}
                  downloadUrl={signedUrls[payslip.id]}
                  locked={isCompleted}
                />
              ))}
            </ul>
          </>
        )}

        {/* Delete payroll run */}
        {!isCompleted && (
          <div className="mt-6">
            {!showDeleteConfirm ? (
              <button type="button" onClick={() => setShowDeleteConfirm(true)}
                className="w-full rounded-lg border border-red-200 py-3 text-sm font-medium text-red-500">
                {t("payroll.deleteRun")}
              </button>
            ) : (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="mb-3 text-sm font-semibold text-red-700">{t("payroll.deleteConfirm")}</p>
                <div className="flex gap-2">
                  <button type="button" disabled={isPending} onClick={handleDelete}
                    className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                    {isPending ? t("common.loading") : t("payroll.confirmDelete")}
                  </button>
                  <button type="button" onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 rounded-lg bg-black/5 py-2.5 text-sm font-semibold text-foreground">
                    {t("common.cancel")}
                  </button>
                </div>
                {deleteMsg && <p className="mt-2 text-sm text-red-600">{deleteMsg}</p>}
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}

function StepDot({ done, active, label }: { done: boolean; active: boolean; label: string }) {
  return (
    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold
      ${done || active ? "bg-brand text-white" : "bg-black/10 text-foreground/40"}`}>
      {label}
    </div>
  );
}
