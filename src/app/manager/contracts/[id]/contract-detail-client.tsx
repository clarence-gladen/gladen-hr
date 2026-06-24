"use client";

import Link from "next/link";
import { useActionState, useTransition } from "react";
import { Header } from "@/components/header";
import { useLanguage } from "@/lib/i18n/language-provider";
import { fmtDate } from "@/lib/utils/date";
import {
  addAssignmentAction,
  addExpenseAction,
  deleteExpenseAction,
  removeAssignmentAction,
} from "../actions";
import type { ContractStatus, ExpenseType } from "@/lib/types/database";

interface AssignmentRow {
  id: string;
  employee_id: string;
  role_on_site: string | null;
  assigned_from: string;
  assigned_to: string | null;
  employees: { full_name: string; base_salary: number } | { full_name: string; base_salary: number }[] | null;
}

interface ExpenseRow {
  id: string;
  description: string;
  amount: number;
  expense_type: ExpenseType;
  expense_date: string;
}

interface EmployeeOption {
  id: string;
  full_name: string;
}

interface ContractInfo {
  id: string;
  client_name: string;
  site_name: string;
  start_date: string;
  end_date: string | null;
  monthly_value: number;
  status: ContractStatus;
}

function employeeOf(row: AssignmentRow) {
  return Array.isArray(row.employees) ? row.employees[0] : row.employees;
}

const inputClass =
  "w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";
const labelClass = "mb-1 block text-xs font-medium text-foreground/60";

export function ContractDetailClient({
  contract,
  assignments,
  expenses,
  employees,
}: {
  contract: ContractInfo;
  assignments: AssignmentRow[];
  expenses: ExpenseRow[];
  employees: EmployeeOption[];
}) {
  const { t } = useLanguage();
  const [isPending, startTransition] = useTransition();
  const [assignState, assignFormAction, assignPending] = useActionState(
    addAssignmentAction.bind(null, contract.id),
    {}
  );
  const [expenseState, expenseFormAction, expensePending] = useActionState(
    addExpenseAction.bind(null, contract.id),
    {}
  );

  const statusLabel: Record<ContractStatus, string> = {
    active: t("contracts.active"),
    completed: t("contracts.completed"),
    terminated: t("contracts.terminated"),
  };

  const staffingCost = assignments.reduce((sum, row) => {
    const employee = employeeOf(row);
    return sum + (employee ? Number(employee.base_salary) : 0);
  }, 0);

  const fixedExpenses = expenses
    .filter((expense) => expense.expense_type === "fixed")
    .reduce((sum, expense) => sum + Number(expense.amount), 0);

  const oneOffExpenses = expenses.filter((expense) => expense.expense_type === "one_off");

  const revenue = Number(contract.monthly_value);
  const monthlyMargin = revenue - staffingCost - fixedExpenses;

  function handleUnassign(assignmentId: string) {
    startTransition(() => {
      removeAssignmentAction(contract.id, assignmentId);
    });
  }

  function handleDeleteExpense(expenseId: string) {
    startTransition(() => {
      deleteExpenseAction(contract.id, expenseId);
    });
  }

  return (
    <>
      <Header title={contract.client_name} />
      <main className="flex-1 px-4 py-6">
        <Link href="/manager/contracts" className="mb-4 inline-block text-sm font-medium text-brand">
          ← {t("contracts.back")}
        </Link>

        <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-foreground">{contract.site_name}</p>
              <p className="mt-1 text-sm text-foreground/60">
                {fmtDate(contract.start_date)} – {fmtDate(contract.end_date) ?? "—"}
              </p>
              <p className="mt-1 text-sm text-foreground/60">
                S${revenue.toFixed(2)} / mo
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                contract.status === "active"
                  ? "bg-brand-surface text-brand"
                  : "bg-black/5 text-foreground/60"
              }`}
            >
              {statusLabel[contract.status]}
            </span>
          </div>
          <Link
            href={`/manager/contracts/${contract.id}/edit`}
            className="mt-3 inline-block text-sm font-medium text-brand"
          >
            {t("contracts.editContract")}
          </Link>
        </div>

        <h2 className="mb-2 text-sm font-semibold text-foreground/60">{t("contracts.plSummary")}</h2>
        <div className="mb-6 space-y-1 rounded-xl bg-white p-4 text-sm shadow-sm">
          <div className="flex justify-between">
            <span className="text-foreground/60">{t("contracts.revenue")}</span>
            <span>S${revenue.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-foreground/60">{t("contracts.staffingCost")}</span>
            <span>S${staffingCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-foreground/60">{t("contracts.fixedExpenses")}</span>
            <span>S${fixedExpenses.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t border-black/5 pt-1 font-semibold text-foreground">
            <span>{t("contracts.monthlyMargin")}</span>
            <span>S${monthlyMargin.toFixed(2)}</span>
          </div>
        </div>

        <h2 className="mb-2 text-sm font-semibold text-foreground/60">{t("contracts.assignments")}</h2>
        {assignments.length === 0 ? (
          <p className="mb-4 text-sm text-foreground/60">{t("contracts.noAssignments")}</p>
        ) : (
          <ul className="mb-4 space-y-2">
            {assignments.map((assignment) => {
              const employee = employeeOf(assignment);
              return (
                <li key={assignment.id} className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 shadow-sm">
                  <div>
                    <p className="font-medium text-foreground">{employee?.full_name ?? "—"}</p>
                    {assignment.role_on_site && (
                      <p className="text-sm text-foreground/60">{assignment.role_on_site}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleUnassign(assignment.id)}
                    className="shrink-0 rounded-full bg-black/5 px-3 py-1 text-xs font-medium text-foreground disabled:opacity-60"
                  >
                    {t("contracts.unassign")}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <form action={assignFormAction} className="mb-6 space-y-3 rounded-xl bg-white p-4 shadow-sm">
          <div>
            <label className={labelClass} htmlFor="employeeId">
              {t("contracts.employee")}
            </label>
            <select id="employeeId" name="employeeId" className={inputClass} defaultValue="">
              <option value="" disabled>
                {t("contracts.employee")}
              </option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="roleOnSite">
              {t("contracts.roleOnSite")}
            </label>
            <input id="roleOnSite" name="roleOnSite" type="text" className={inputClass} />
          </div>
          {assignState.error && <p className="text-sm text-red-600">{assignState.error}</p>}
          <button
            type="submit"
            disabled={assignPending}
            className="w-full rounded-lg bg-brand py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {t("contracts.addAssignment")}
          </button>
        </form>

        <h2 className="mb-2 text-sm font-semibold text-foreground/60">{t("contracts.expenses")}</h2>
        {expenses.length === 0 ? (
          <p className="mb-4 text-sm text-foreground/60">{t("contracts.noExpenses")}</p>
        ) : (
          <ul className="mb-4 space-y-2">
            {expenses.map((expense) => (
              <li key={expense.id} className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 shadow-sm">
                <div>
                  <p className="font-medium text-foreground">{expense.description}</p>
                  <p className="text-sm text-foreground/60">
                    {expense.expense_type === "fixed" ? t("contracts.fixed") : t("contracts.oneOff")} ·{" "}
                    {expense.expense_date} · S${Number(expense.amount).toFixed(2)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleDeleteExpense(expense.id)}
                  className="shrink-0 rounded-full bg-black/5 px-3 py-1 text-xs font-medium text-foreground disabled:opacity-60"
                >
                  {t("contracts.delete")}
                </button>
              </li>
            ))}
          </ul>
        )}

        {oneOffExpenses.length > 0 && (
          <p className="mb-4 text-sm text-foreground/60">
            {t("contracts.oneOff")}: S$
            {oneOffExpenses.reduce((sum, e) => sum + Number(e.amount), 0).toFixed(2)}
          </p>
        )}

        <form action={expenseFormAction} className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
          <div>
            <label className={labelClass} htmlFor="description">
              {t("contracts.description")}
            </label>
            <input id="description" name="description" type="text" required className={inputClass} />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className={labelClass} htmlFor="amount">
                {t("contracts.amount")}
              </label>
              <input id="amount" name="amount" type="number" step="0.01" min="0" required className={inputClass} />
            </div>
            <div className="flex-1">
              <label className={labelClass} htmlFor="expenseType">
                {t("contracts.expenseType")}
              </label>
              <select id="expenseType" name="expenseType" defaultValue="fixed" className={inputClass}>
                <option value="fixed">{t("contracts.fixed")}</option>
                <option value="one_off">{t("contracts.oneOff")}</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor="expenseDate">
              {t("contracts.expenseDate")}
            </label>
            <input
              id="expenseDate"
              name="expenseDate"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className={inputClass}
            />
          </div>
          {expenseState.error && <p className="text-sm text-red-600">{expenseState.error}</p>}
          <button
            type="submit"
            disabled={expensePending}
            className="w-full rounded-lg bg-brand py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {t("contracts.addExpense")}
          </button>
        </form>
      </main>
    </>
  );
}
