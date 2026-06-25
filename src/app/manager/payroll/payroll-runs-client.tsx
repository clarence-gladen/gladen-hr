"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Header } from "@/components/header";
import { useLanguage } from "@/lib/i18n/language-provider";
import { createPayrollRunAction } from "./actions";
import type { PayrollStatus } from "@/lib/types/database";

export interface PayrollRunRow {
  id: string;
  month: number;
  year: number;
  status: PayrollStatus;
  totalNetPay: number | null;
}

const inputClass =
  "w-full rounded-lg border border-black/10 bg-white px-4 py-3 text-base focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";
const labelClass = "mb-1 block text-sm font-medium text-foreground";

export function PayrollRunsClient({ runs }: { runs: PayrollRunRow[] }) {
  const { t } = useLanguage();
  const [state, formAction, pending] = useActionState(createPayrollRunAction, {});

  const statusLabel: Record<PayrollStatus, string> = {
    draft: t("payroll.draft"),
    processing: t("payroll.processing"),
    completed: t("payroll.completed"),
  };

  const now = new Date();
  const currentYear = now.getFullYear();
  const years = Array.from({ length: currentYear - 2025 + 2 }, (_, i) => 2025 + i);
  const monthNames = Array.from({ length: 12 }, (_, i) =>
    new Date(2024, i, 1).toLocaleDateString(undefined, { month: "long" })
  );

  return (
    <>
      <Header titleKey="payroll.title" />
      <main className="flex-1 px-4 py-6 mx-auto w-full max-w-4xl">
        <Link
          href="/manager/payroll/ir8a"
          className="mb-4 flex items-center justify-between rounded-xl bg-brand/5 px-4 py-3"
        >
          <div>
            <p className="text-sm font-semibold text-brand">IR8A / Yearly Report</p>
            <p className="text-xs text-brand/60">Annual income summary for IRAS filing</p>
          </div>
          <span className="text-brand/40">›</span>
        </Link>

        <h2 className="mb-2 text-sm font-semibold text-foreground/60">
          {t("payroll.newRun")}
        </h2>
        <form action={formAction} className="mb-6 space-y-3 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className={labelClass} htmlFor="month">
                {t("payroll.month")}
              </label>
              <select
                id="month"
                name="month"
                defaultValue={now.getMonth() + 1}
                className={inputClass}
              >
                {monthNames.map((name, index) => (
                  <option key={name} value={index + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className={labelClass} htmlFor="year">
                {t("payroll.year")}
              </label>
              <select
                id="year"
                name="year"
                defaultValue={currentYear}
                className={inputClass}
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-brand py-3 text-base font-semibold text-white transition disabled:opacity-60"
          >
            {pending ? t("common.loading") : t("payroll.startRun")}
          </button>
        </form>

        {runs.length === 0 ? (
          <p className="text-center text-sm text-foreground/60">{t("payroll.noRuns")}</p>
        ) : (
          <ul className="space-y-3">
            {runs.map((run) => (
              <li key={run.id}>
                <Link href={`/manager/payroll/${run.id}`} className="flex items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm">
                  <div>
                    <p className="font-semibold text-foreground">
                      {monthNames[run.month - 1]} {run.year}
                    </p>
                    {run.totalNetPay !== null && (
                      <p className="mt-0.5 text-sm text-foreground/50">
                        Net pay S${run.totalNetPay.toFixed(2)}
                      </p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                      run.status === "completed"
                        ? "bg-brand-surface text-brand"
                        : "bg-black/5 text-foreground/60"
                    }`}
                  >
                    {statusLabel[run.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
