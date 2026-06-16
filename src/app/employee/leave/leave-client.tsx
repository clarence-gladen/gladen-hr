"use client";

import { useActionState, useTransition } from "react";
import { Header } from "@/components/header";
import { useLanguage } from "@/lib/i18n/language-provider";
import { submitLeaveRequestAction, cancelLeaveRequestAction } from "./actions";
import type { ApprovalStatus, LeaveType } from "@/lib/types/database";

export interface LeaveBalance {
  annual_entitlement: number;
  annual_used: number;
  sick_entitlement: number;
  sick_used: number;
  hospitalization_entitlement: number;
  hospitalization_used: number;
}

export interface LeaveRequestRow {
  id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  days: number;
  reason: string | null;
  status: ApprovalStatus;
  created_at: string;
}

const inputClass =
  "w-full rounded-lg border border-black/10 bg-white px-4 py-3 text-base focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";
const labelClass = "mb-1 block text-sm font-medium text-foreground";

export function LeaveClient({
  balance,
  requests,
  onProbation,
  confirmDateLabel,
}: {
  balance: LeaveBalance | null;
  requests: LeaveRequestRow[];
  onProbation?: boolean;
  confirmDateLabel?: string | null;
}) {
  const { t } = useLanguage();
  const [state, formAction, pending] = useActionState(submitLeaveRequestAction, {});
  const [isCancelling, startCancel] = useTransition();

  const leaveTypeLabel: Record<LeaveType, string> = {
    annual: t("leave.annual"),
    sick: t("leave.sick"),
    hospitalization: t("leave.hospitalization"),
  };

  const statusLabel: Record<ApprovalStatus, string> = {
    pending: t("leave.pending"),
    approved: t("leave.approved"),
    rejected: t("leave.rejected"),
  };

  const statusClass: Record<ApprovalStatus, string> = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-brand/10 text-brand",
    rejected: "bg-black/5 text-foreground/60",
  };

  function handleCancel(id: string) {
    startCancel(() => { cancelLeaveRequestAction(id); });
  }

  const balanceItems = balance
    ? [
        {
          label: t("leave.annual"),
          available: balance.annual_entitlement - balance.annual_used,
          used: balance.annual_used,
          entitlement: balance.annual_entitlement,
        },
        {
          label: t("leave.sick"),
          available: balance.sick_entitlement - balance.sick_used,
          used: balance.sick_used,
          entitlement: balance.sick_entitlement,
        },
        {
          label: t("leave.hospitalization"),
          available: balance.hospitalization_entitlement - balance.hospitalization_used,
          used: balance.hospitalization_used,
          entitlement: balance.hospitalization_entitlement,
        },
      ]
    : [];

  return (
    <>
      <Header titleKey="leave.employeeTitle" />
      <main className="flex-1 px-4 py-6">
        {onProbation && confirmDateLabel && (
          <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
            You are on probation until <span className="font-semibold">{confirmDateLabel}</span>. Leave entitlements are available after confirmation.
          </div>
        )}
        {balance && (
          <div className="mb-6">
            <h2 className="mb-2 text-sm font-semibold text-foreground/60">
              {t("leave.yourBalance")}
            </h2>
            <div className="space-y-2">
              {balanceItems.map((item) => (
                <div key={item.label} className="rounded-xl bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-sm text-foreground/60">
                      {item.used} {t("leave.used")}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/5">
                      <div
                        className="h-2 rounded-full bg-brand"
                        style={{
                          width: item.entitlement > 0
                            ? `${Math.min(100, (item.used / item.entitlement) * 100)}%`
                            : "0%",
                        }}
                      />
                    </div>
                    <p className="text-sm font-semibold text-brand">
                      {Math.max(0, item.available)} {t("leave.days")} {t("leave.available")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <h2 className="mb-2 text-sm font-semibold text-foreground/60">
          {t("leave.applyLeave")}
        </h2>
        <form action={formAction} className="mb-6 space-y-4 rounded-xl bg-white p-4 shadow-sm">
          <div>
            <label className={labelClass} htmlFor="leaveType">
              {t("leave.leaveType")}
            </label>
            <select id="leaveType" name="leaveType" className={inputClass} defaultValue="">
              <option value="" disabled>
                {t("leave.leaveType")}
              </option>
              <option value="annual">{t("leave.annual")}</option>
              <option value="sick">{t("leave.sick")}</option>
              <option value="hospitalization">{t("leave.hospitalization")}</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="startDate">
                {t("leave.startDate")}
              </label>
              <input id="startDate" name="startDate" type="date" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="endDate">
                {t("leave.endDate")}
              </label>
              <input id="endDate" name="endDate" type="date" required className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="reason">
              {t("leave.reason")}
            </label>
            <textarea id="reason" name="reason" rows={2} className={inputClass} />
          </div>

          {state.error && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-brand py-3 text-base font-semibold text-white transition disabled:opacity-60"
          >
            {pending ? t("common.loading") : t("leave.submitRequest")}
          </button>
        </form>

        <h2 className="mb-2 text-sm font-semibold text-foreground/60">
          {t("leave.myRequests")}
        </h2>
        {requests.length === 0 ? (
          <p className="text-sm text-foreground/60">{t("leave.noRequests")}</p>
        ) : (
          <ul className="space-y-3">
            {requests.map((req) => (
              <li key={req.id} className="rounded-xl bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">
                      {leaveTypeLabel[req.leave_type]}
                    </p>
                    <p className="mt-1 text-sm text-foreground/60">
                      {req.start_date} – {req.end_date} · {req.days} {t("leave.days")}
                    </p>
                    {req.reason && (
                      <p className="mt-1 text-sm text-foreground/60">{req.reason}</p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${statusClass[req.status]}`}
                  >
                    {statusLabel[req.status]}
                  </span>
                </div>
                {req.status === "pending" && (
                  <button
                    type="button"
                    disabled={isCancelling}
                    onClick={() => handleCancel(req.id)}
                    className="mt-3 rounded-full bg-black/5 px-3 py-1 text-xs font-medium text-foreground disabled:opacity-60"
                  >
                    {t("leave.cancelRequest")}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
