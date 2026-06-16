"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { useLanguage } from "@/lib/i18n/language-provider";
import { approveLeaveRequestAction, rejectLeaveRequestAction } from "./actions";
import { LeaveCalendar, type LeaveCalendarEntry } from "@/components/leave-calendar";
import type { ApprovalStatus, LeaveType } from "@/lib/types/database";

export interface LeaveRequestRow {
  id: string;
  employee_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  days: number;
  reason: string | null;
  status: ApprovalStatus;
  created_at: string;
  employees: { full_name: string } | { full_name: string }[] | null;
}

function employeeName(row: LeaveRequestRow): string {
  const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;
  return employee?.full_name ?? "—";
}

export function LeaveApprovalsClient({
  requests,
  calendarEntries,
}: {
  requests: LeaveRequestRow[];
  calendarEntries: LeaveCalendarEntry[];
}) {
  const { t } = useLanguage();
  const [isPending, startTransition] = useTransition();

  const leaveTypeLabel: Record<LeaveType, string> = {
    annual: t("leave.annual"),
    sick: t("leave.sick"),
    hospitalization: t("leave.hospitalization"),
    no_pay: t("leave.noPay"),
  };

  const statusLabel: Record<ApprovalStatus, string> = {
    pending: t("leave.pending"),
    approved: t("leave.approved"),
    rejected: t("leave.rejected"),
  };

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const history = requests.filter((r) => r.status !== "pending");

  function handleApprove(id: string) {
    startTransition(() => {
      approveLeaveRequestAction(id);
    });
  }

  function handleReject(id: string) {
    startTransition(() => {
      rejectLeaveRequestAction(id);
    });
  }

  return (
    <>
      <Header titleKey="leave.managerTitle" />
      <main className="flex-1 px-4 py-6">
        <Link
          href="/manager/leave/record"
          className="mb-4 block rounded-lg bg-brand py-3 text-center text-base font-semibold text-white"
        >
          {t("leave.recordLeaveTitle")}
        </Link>

        <h2 className="mb-2 text-sm font-semibold text-foreground/60">
          {t("leave.peopleOnLeave")}
        </h2>
        <div className="mb-6">
          <LeaveCalendar entries={calendarEntries} />
        </div>

        <h2 className="mb-2 text-sm font-semibold text-foreground/60">
          {t("leave.pendingRequests")}
        </h2>
        {pendingRequests.length === 0 ? (
          <p className="mb-6 text-sm text-foreground/60">
            {t("leave.noPendingRequests")}
          </p>
        ) : (
          <ul className="mb-6 space-y-3">
            {pendingRequests.map((request) => (
              <li key={request.id} className="rounded-xl bg-white p-4 shadow-sm">
                <p className="font-semibold text-foreground">{employeeName(request)}</p>
                <p className="mt-1 text-sm text-foreground/60">
                  {leaveTypeLabel[request.leave_type]} · {request.days} {t("leave.days")}
                </p>
                <p className="mt-1 text-sm text-foreground/60">
                  {request.start_date} – {request.end_date}
                </p>
                {request.reason && (
                  <p className="mt-1 text-sm text-foreground/60">
                    {t("leave.reason")}: {request.reason}
                  </p>
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleApprove(request.id)}
                    className="flex-1 rounded-lg bg-brand py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {t("leave.approve")}
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleReject(request.id)}
                    className="flex-1 rounded-lg bg-black/5 py-2 text-sm font-semibold text-foreground disabled:opacity-60"
                  >
                    {t("leave.reject")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <h2 className="mb-2 text-sm font-semibold text-foreground/60">
          {t("leave.history")}
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-foreground/60">{t("leave.noHistory")}</p>
        ) : (
          <ul className="space-y-3">
            {history.map((request) => (
              <li key={request.id} className="rounded-xl bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{employeeName(request)}</p>
                    <p className="mt-1 text-sm text-foreground/60">
                      {leaveTypeLabel[request.leave_type]} · {request.days} {t("leave.days")}
                    </p>
                    <p className="mt-1 text-sm text-foreground/60">
                      {request.start_date} – {request.end_date}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                      request.status === "approved"
                        ? "bg-brand-surface text-brand"
                        : "bg-black/5 text-foreground/60"
                    }`}
                  >
                    {statusLabel[request.status]}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
