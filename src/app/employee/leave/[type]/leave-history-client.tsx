"use client";

import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/language-provider";
import { Header } from "@/components/header";
import type { ApprovalStatus, LeaveType } from "@/lib/types/database";

export interface BalanceByYear {
  year: number;
  entitlement: number;
  used: number;
}

export interface LeaveHistoryRow {
  id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  days: number;
  reason: string | null;
  status: ApprovalStatus;
}

const statusClass: Record<ApprovalStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-brand/10 text-brand",
  rejected: "bg-black/5 text-foreground/60",
};

export function LeaveHistoryClient({
  leaveType,
  balancesByYear,
  allRequests,
  onProbation,
  confirmDateLabel,
}: {
  leaveType: LeaveType;
  balancesByYear: BalanceByYear[];
  allRequests: LeaveHistoryRow[];
  onProbation: boolean;
  confirmDateLabel: string | null;
}) {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const statusLabel: Record<ApprovalStatus, string> = {
    pending: t("leave.pending"),
    approved: t("leave.approved"),
    rejected: t("leave.rejected"),
  };

  const leaveTypeLabel: Record<LeaveType, string> = {
    annual: t("leave.annual"),
    sick: t("leave.sick"),
    hospitalization: t("leave.hospitalization"),
    no_pay: t("leave.noPay"),
  };

  const title = leaveTypeLabel[leaveType];

  const balance = balancesByYear.find((b) => b.year === selectedYear);
  const available = onProbation && selectedYear === currentYear
    ? 0
    : balance
      ? Math.max(0, balance.entitlement - balance.used)
      : null;

  const yearRequests = allRequests.filter((r) => {
    const year = new Date(r.start_date).getFullYear();
    return year === selectedYear && r.leave_type === leaveType;
  });

  const years = balancesByYear.map((b) => b.year).sort((a, b) => b - a);
  if (years.length === 0) years.push(currentYear);

  return (
    <>
      <Header title={title} />
      <main className="flex-1 px-4 py-6">
        {onProbation && confirmDateLabel && selectedYear === currentYear && (
          <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {t("leave.probationUntil")} <span className="font-semibold">{confirmDateLabel}</span>. {t("leave.leaveAvailableAfter")}
          </div>
        )}

        <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
          <p className="text-3xl font-bold text-brand">
            {available !== null ? `${available}` : "—"}
          </p>
          <p className="mt-1 text-sm text-foreground/60">
            {t("leave.daysAvailable")}
            {balance && !onProbation
              ? ` · ${balance.used} ${t("leave.used")} of ${balance.entitlement}`
              : ""}
          </p>
          {balance && !onProbation && balance.entitlement > 0 && (
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/5">
              <div
                className="h-2 rounded-full bg-brand"
                style={{ width: `${Math.min(100, (balance.used / balance.entitlement) * 100)}%` }}
              />
            </div>
          )}
        </div>

        <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
          {years.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => setSelectedYear(y)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                y === selectedYear
                  ? "bg-brand text-white"
                  : "bg-black/5 text-foreground/60"
              }`}
            >
              {y}
            </button>
          ))}
        </div>

        <h2 className="mb-2 text-sm font-semibold text-foreground/60">
          {t("leave.leaveTakenIn")} {selectedYear}
        </h2>
        {yearRequests.length === 0 ? (
          <p className="text-sm text-foreground/60">{t("leave.noRequests")}</p>
        ) : (
          <ul className="space-y-3">
            {yearRequests.map((req) => (
              <li key={req.id} className="rounded-xl bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">
                      {req.start_date} – {req.end_date}
                    </p>
                    <p className="mt-1 text-sm text-foreground/60">
                      {req.days} {t("leave.days")}
                      {req.reason ? ` · ${req.reason}` : ""}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${statusClass[req.status]}`}>
                    {statusLabel[req.status]}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6">
          <Link href="/employee/leave" className="block text-center text-sm font-medium text-brand">
            ← {t("leave.applyLeave")}
          </Link>
        </div>
      </main>
    </>
  );
}
