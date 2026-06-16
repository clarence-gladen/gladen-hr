"use client";

import Link from "next/link";
import { useActionState, useTransition } from "react";
import { Header } from "@/components/header";
import { useLanguage } from "@/lib/i18n/language-provider";
import {
  cancelSalaryAdvanceAction,
  markFullyRepaidAction,
  updateAdvanceAction,
} from "../actions";
import type { ApprovalStatus } from "@/lib/types/database";

interface Repayment {
  id: string;
  amount: number;
  created_at: string;
}

interface AdvanceDetail {
  id: string;
  employeeName: string;
  amount: number;
  repayment_amount_per_month: number | null;
  status: ApprovalStatus;
  notes: string;
  created_at: string;
  outstanding: number;
  repayments: Repayment[];
}

const inputClass =
  "w-full rounded-lg border border-black/10 bg-white px-4 py-3 text-base focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";
const labelClass = "mb-1 block text-sm font-medium text-foreground";

export function AdvanceDetailClient({ advance }: { advance: AdvanceDetail }) {
  const { t } = useLanguage();
  const [state, formAction, saving] = useActionState(
    updateAdvanceAction.bind(null, advance.id),
    {}
  );
  const [isPending, startTransition] = useTransition();

  const isFullyRepaid = advance.outstanding <= 0.001;

  const statusLabel: Record<ApprovalStatus, string> = {
    pending: t("salaryAdvances.pending"),
    approved: t("salaryAdvances.approved"),
    rejected: t("salaryAdvances.rejected"),
  };
  const statusClass: Record<ApprovalStatus, string> = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-brand/10 text-brand",
    rejected: "bg-black/5 text-foreground/60",
  };

  function handleMarkRepaid() {
    startTransition(async () => {
      await markFullyRepaidAction(advance.id);
    });
  }

  function handleCancel() {
    startTransition(async () => {
      await cancelSalaryAdvanceAction(advance.id);
    });
  }

  return (
    <>
      <Header title={t("salaryAdvances.title")} />
      <main className="flex-1 px-4 py-6">
        <Link
          href="/manager/salary-advances"
          className="mb-4 inline-block text-sm font-medium text-brand"
        >
          ← {t("salaryAdvances.back")}
        </Link>

        {/* Summary card */}
        <div className="mb-4 overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="bg-brand px-4 py-3">
            <p className="text-lg font-semibold text-white">{advance.employeeName}</p>
            <p className="text-sm text-white/70">
              {t("salaryAdvances.requestedOn")}{" "}
              {new Date(advance.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="divide-y divide-black/5">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-foreground/60">{t("salaryAdvances.amount")}</span>
              <span className="font-semibold">S${advance.amount.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-foreground/60">{t("salaryAdvances.outstanding")}</span>
              <span className={`font-semibold ${isFullyRepaid ? "text-green-600" : "text-foreground"}`}>
                {isFullyRepaid ? t("salaryAdvances.fullyRepaid") : `S$${advance.outstanding.toFixed(2)}`}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-foreground/60">{t("salaryAdvances.status")}</span>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusClass[advance.status]}`}>
                {statusLabel[advance.status]}
              </span>
            </div>
          </div>
        </div>

        {/* Edit form */}
        {advance.status === "approved" && (
          <form action={formAction} className="mb-4 space-y-4 rounded-xl bg-white p-4 shadow-sm">
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
                defaultValue={advance.repayment_amount_per_month ?? ""}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-foreground/50">
                {t("salaryAdvances.repaymentHint")}
              </p>
            </div>

            <div>
              <label className={labelClass} htmlFor="notes">
                {t("salaryAdvances.notes")}
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                defaultValue={advance.notes}
                className={inputClass}
              />
            </div>

            {state.error && <p className="text-sm text-red-600">{state.error}</p>}
            {state.success && (
              <p className="text-sm text-green-600">{t("salaryAdvances.saved")}</p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-brand py-3 text-base font-semibold text-white disabled:opacity-60"
            >
              {saving ? t("common.loading") : t("common.save")}
            </button>
          </form>
        )}

        {/* Repayment history */}
        {advance.repayments.length > 0 && (
          <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-foreground/60">
              {t("salaryAdvances.repaymentHistory")}
            </p>
            <ul className="divide-y divide-black/5">
              {advance.repayments.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-foreground/60">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                  <span className="font-medium text-foreground">S${r.amount.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        {advance.status === "approved" && !isFullyRepaid && (
          <div className="space-y-2">
            <button
              type="button"
              disabled={isPending}
              onClick={handleMarkRepaid}
              className="w-full rounded-lg bg-green-600 py-3 text-base font-semibold text-white disabled:opacity-60"
            >
              {t("salaryAdvances.markFullyRepaid")}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={handleCancel}
              className="w-full rounded-lg bg-black/5 py-3 text-base font-semibold text-foreground/70 disabled:opacity-60"
            >
              {t("salaryAdvances.cancelAdvance")}
            </button>
          </div>
        )}
      </main>
    </>
  );
}
