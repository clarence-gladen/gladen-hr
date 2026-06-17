"use client";

import { useActionState, useTransition, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { useLanguage } from "@/lib/i18n/language-provider";
import { approveLeaveRequestAction, rejectLeaveRequestAction, cancelLeaveRequestAction, editLeaveRequestAction } from "./actions";
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

const inputClass = "w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";
const labelClass = "mb-1 block text-xs font-medium text-foreground/60";

function PendingCard({ request, leaveTypeLabel }: { request: LeaveRequestRow; leaveTypeLabel: Record<LeaveType, string> }) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [isPending, startTransition] = useTransition();
  const [editState, editAction, isEditing] = useActionState(editLeaveRequestAction.bind(null, request.id), {} as { error?: string });
  const wasEditing = useRef(false);
  useEffect(() => {
    if (wasEditing.current && !isEditing && !editState?.error) setMode("view");
    wasEditing.current = isEditing;
  }, [isEditing, editState]);

  function handleApprove() { startTransition(() => { approveLeaveRequestAction(request.id); }); }
  function handleReject() { startTransition(() => { rejectLeaveRequestAction(request.id); }); }

  if (mode === "edit") {
    return (
      <li className="rounded-xl bg-white p-4 shadow-sm">
        <p className="mb-1 font-semibold text-foreground">{employeeName(request)}</p>
        <p className="mb-3 text-xs text-foreground/50">{t("leave.editRequest")}</p>
        <form action={editAction} className="space-y-3">
          <div>
            <label className={labelClass}>{t("leave.leaveType")}</label>
            <select name="leaveType" defaultValue={request.leave_type} required className={inputClass}>
              <option value="annual">{leaveTypeLabel.annual}</option>
              <option value="sick">{leaveTypeLabel.sick}</option>
              <option value="hospitalization">{leaveTypeLabel.hospitalization}</option>
              <option value="no_pay">{leaveTypeLabel.no_pay}</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>{t("leave.startDate")}</label>
              <input name="startDate" type="date" defaultValue={request.start_date} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t("leave.endDate")}</label>
              <input name="endDate" type="date" defaultValue={request.end_date} required className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>{t("leave.reason")}</label>
            <textarea name="reason" rows={2} defaultValue={request.reason ?? ""} className={inputClass} />
          </div>
          {editState?.error && <p className="text-sm text-red-600">{editState.error}</p>}
          <div className="flex gap-2">
            <button type="submit" className="flex-1 rounded-lg bg-brand py-2 text-sm font-semibold text-white">
              {t("leave.saveChanges")}
            </button>
            <button type="button" onClick={() => setMode("view")} className="flex-1 rounded-lg bg-black/5 py-2 text-sm font-semibold text-foreground">
              {t("leave.cancelEdit")}
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="rounded-xl bg-white p-4 shadow-sm">
      <p className="font-semibold text-foreground">{employeeName(request)}</p>
      <p className="mt-1 text-sm text-foreground/60">
        {leaveTypeLabel[request.leave_type]} · {request.days} {t("leave.days")}
      </p>
      <p className="mt-1 text-sm text-foreground/60">{request.start_date} – {request.end_date}</p>
      {request.reason && (
        <p className="mt-1 text-sm text-foreground/60">{t("leave.reason")}: {request.reason}</p>
      )}
      <div className="mt-3 flex gap-2">
        <button type="button" disabled={isPending} onClick={handleApprove}
          className="flex-1 rounded-lg bg-brand py-2 text-sm font-semibold text-white disabled:opacity-60">
          {t("leave.approve")}
        </button>
        <button type="button" disabled={isPending} onClick={handleReject}
          className="flex-1 rounded-lg bg-black/5 py-2 text-sm font-semibold text-foreground disabled:opacity-60">
          {t("leave.reject")}
        </button>
        <button type="button" disabled={isPending} onClick={() => setMode("edit")}
          className="rounded-lg border border-black/10 px-3 py-2 text-sm font-medium text-foreground/60 disabled:opacity-60">
          {t("leave.editRequest")}
        </button>
      </div>
    </li>
  );
}

function HistoryCard({ request, leaveTypeLabel, statusLabel }: {
  request: LeaveRequestRow;
  leaveTypeLabel: Record<LeaveType, string>;
  statusLabel: Record<ApprovalStatus, string>;
}) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<"view" | "cancelConfirm">("view");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCancel() {
    setCancelError(null);
    startTransition(async () => {
      try {
        await cancelLeaveRequestAction(request.id);
      } catch (e) {
        setCancelError(e instanceof Error ? e.message : "Failed to cancel leave.");
      }
    });
  }

  if (mode === "cancelConfirm") {
    return (
      <li className="rounded-xl border border-red-200 bg-red-50 p-4">
        <p className="mb-1 font-semibold text-foreground">{employeeName(request)}</p>
        <p className="mb-3 text-sm text-red-700">{t("leave.cancelApprovedConfirm")}</p>
        <div className="flex gap-2">
          <button type="button" disabled={isPending} onClick={handleCancel}
            className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {isPending ? t("common.loading") : t("leave.cancelApprovedYes")}
          </button>
          <button type="button" onClick={() => setMode("view")}
            className="flex-1 rounded-lg bg-black/5 py-2 text-sm font-semibold text-foreground">
            {t("common.back")}
          </button>
        </div>
        {cancelError && <p className="mt-2 text-sm text-red-700">{cancelError}</p>}
      </li>
    );
  }

  return (
    <li className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-foreground">{employeeName(request)}</p>
          <p className="mt-1 text-sm text-foreground/60">
            {leaveTypeLabel[request.leave_type]} · {request.days} {t("leave.days")}
          </p>
          <p className="mt-1 text-sm text-foreground/60">{request.start_date} – {request.end_date}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
          request.status === "approved" ? "bg-brand/10 text-brand" : "bg-black/5 text-foreground/60"
        }`}>
          {statusLabel[request.status]}
        </span>
      </div>
      {request.status === "approved" && (
        <button type="button" onClick={() => setMode("cancelConfirm")}
          className="mt-3 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600">
          {t("leave.cancelApproved")}
        </button>
      )}
    </li>
  );
}

export function LeaveApprovalsClient({
  requests,
  calendarEntries,
}: {
  requests: LeaveRequestRow[];
  calendarEntries: LeaveCalendarEntry[];
}) {
  const { t } = useLanguage();

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

  return (
    <>
      <Header titleKey="leave.managerTitle" />
      <main className="flex-1 px-4 py-6">
        <Link href="/manager/leave/record"
          className="mb-4 block rounded-lg bg-brand py-3 text-center text-base font-semibold text-white">
          {t("leave.recordLeaveTitle")}
        </Link>

        <h2 className="mb-2 text-sm font-semibold text-foreground/60">{t("leave.peopleOnLeave")}</h2>
        <div className="mb-6">
          <LeaveCalendar entries={calendarEntries} />
        </div>

        <h2 className="mb-2 text-sm font-semibold text-foreground/60">{t("leave.pendingRequests")}</h2>
        {pendingRequests.length === 0 ? (
          <p className="mb-6 text-sm text-foreground/60">{t("leave.noPendingRequests")}</p>
        ) : (
          <ul className="mb-6 space-y-3">
            {pendingRequests.map((request) => (
              <PendingCard key={request.id} request={request} leaveTypeLabel={leaveTypeLabel} />
            ))}
          </ul>
        )}

        <h2 className="mb-2 text-sm font-semibold text-foreground/60">{t("leave.history")}</h2>
        {history.length === 0 ? (
          <p className="text-sm text-foreground/60">{t("leave.noHistory")}</p>
        ) : (
          <ul className="space-y-3">
            {history.map((request) => (
              <HistoryCard key={request.id} request={request} leaveTypeLabel={leaveTypeLabel} statusLabel={statusLabel} />
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
