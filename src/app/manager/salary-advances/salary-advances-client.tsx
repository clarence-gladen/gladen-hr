"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Header } from "@/components/header";
import { useLanguage } from "@/lib/i18n/language-provider";
import { createSalaryAdvanceAction } from "./actions";
import type { ApprovalStatus } from "@/lib/types/database";
import { fmtTimestamp } from "@/lib/utils/date";

interface Repayment {
  id: string;
  amount: number;
  created_at: string;
}

interface AdvanceRow {
  id: string;
  employee_id: string;
  amount: number;
  repayment_amount_per_month: number | null;
  status: ApprovalStatus;
  notes: string | null;
  created_at: string;
  employees: { full_name: string } | { full_name: string }[] | null;
  salary_advance_repayments: Repayment[];
  repaid: number;
  outstanding: number;
}

interface EmployeeOption {
  id: string;
  full_name: string;
}

function employeeName(row: AdvanceRow): string {
  const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;
  return employee?.full_name ?? "—";
}

function groupByMonth(advances: AdvanceRow[]) {
  const map = new Map<string, { monthKey: string; label: string; items: AdvanceRow[] }>();
  for (const advance of advances) {
    const monthKey = advance.created_at.slice(0, 7); // "2026-07"
    if (!map.has(monthKey)) {
      const d = new Date(advance.created_at);
      map.set(monthKey, {
        monthKey,
        label: d.toLocaleDateString("en-SG", { month: "long", year: "numeric" }),
        items: [],
      });
    }
    map.get(monthKey)!.items.push(advance);
  }
  // Newest month first; items within keep the created_at desc order from the query
  return [...map.values()].sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}

const inputClass =
  "w-full rounded-lg border border-black/10 bg-white px-4 py-3 text-base focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";
const labelClass = "mb-1 block text-sm font-medium text-foreground";

export function SalaryAdvancesClient({
  advances,
  employees,
}: {
  advances: AdvanceRow[];
  employees: EmployeeOption[];
}) {
  const { t } = useLanguage();
  const [state, formAction, pending] = useActionState(createSalaryAdvanceAction, {});

  const statusLabel: Record<ApprovalStatus, string> = {
    pending: t("salaryAdvances.pending"),
    approved: t("salaryAdvances.approved"),
    rejected: t("salaryAdvances.rejected"),
    cancelled: t("salaryAdvances.cancelled"),
  };

  const statusClass: Record<ApprovalStatus, string> = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-brand/10 text-brand",
    rejected: "bg-black/5 text-foreground/60",
    cancelled: "bg-black/5 text-foreground/60",
  };

  const totalOutstanding = advances
    .filter((advance) => advance.status === "approved")
    .reduce((sum, advance) => sum + Math.max(advance.outstanding, 0), 0);

  return (
    <>
      <Header titleKey="salaryAdvances.title" />
      <main className="flex-1 px-4 py-6">
        <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
          <p className="text-2xl font-semibold text-brand">
            S${totalOutstanding.toFixed(2)}
          </p>
          <p className="mt-1 text-sm text-foreground/60">
            {t("salaryAdvances.totalOutstanding")}
          </p>
        </div>

        <h2 className="mb-2 text-sm font-semibold text-foreground/60">
          {t("salaryAdvances.newAdvance")}
        </h2>
        <form action={formAction} className="mb-6 space-y-4 rounded-xl bg-white p-4 shadow-sm">
          <div>
            <label className={labelClass} htmlFor="employeeId">
              {t("salaryAdvances.employee")}
            </label>
            <select id="employeeId" name="employeeId" className={inputClass} defaultValue="">
              <option value="" disabled>
                {t("salaryAdvances.employee")}
              </option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="amount">
              {t("salaryAdvances.amount")}
            </label>
            <input
              id="amount"
              name="amount"
              type="number"
              min="0"
              step="0.01"
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="repaymentAmountPerMonth">
              {t("salaryAdvances.repaymentPerMonth")}
            </label>
            <input
              id="repaymentAmountPerMonth"
              name="repaymentAmountPerMonth"
              type="number"
              min="0"
              step="0.01"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-foreground/50">{t("salaryAdvances.repaymentHint")}</p>
          </div>

          <div>
            <label className={labelClass} htmlFor="notes">
              {t("salaryAdvances.notes")}
            </label>
            <textarea id="notes" name="notes" rows={2} className={inputClass} />
          </div>

          {state.error && <p className="text-sm text-red-600">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-brand py-3 text-base font-semibold text-white transition disabled:opacity-60"
          >
            {pending ? t("common.loading") : t("salaryAdvances.record")}
          </button>
        </form>

        {advances.length === 0 ? (
          <p className="text-center text-sm text-foreground/60">{t("salaryAdvances.noAdvances")}</p>
        ) : (
          <div className="space-y-5">
            {groupByMonth(advances).map(({ monthKey, label, items }) => (
              <div key={monthKey}>
                <div className="mb-2 rounded-lg bg-brand px-4 py-2.5">
                  <h3 className="text-sm font-bold tracking-wide text-white">{label}</h3>
                </div>
                <ul className="space-y-3">
                  {items.map((advance) => (
                    <li key={advance.id}>
                      <Link
                        href={`/manager/salary-advances/${advance.id}`}
                        className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm"
                      >
                        <div>
                          <p className="font-semibold text-foreground">{employeeName(advance)}</p>
                          <p className="text-sm text-foreground/60">
                            S${Number(advance.amount).toFixed(2)}
                            {advance.repayment_amount_per_month != null
                              ? ` · S$${Number(advance.repayment_amount_per_month).toFixed(2)}/mo`
                              : ""}
                          </p>
                          <p className="text-xs text-foreground/40">
                            {t("salaryAdvances.requestedOn")} {fmtTimestamp(advance.created_at)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusClass[advance.status]}`}>
                            {statusLabel[advance.status]}
                          </span>
                          <span className="text-sm font-semibold text-foreground">
                            {advance.outstanding > 0.001
                              ? `S$${advance.outstanding.toFixed(2)}`
                              : t("salaryAdvances.fullyRepaid")}
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
