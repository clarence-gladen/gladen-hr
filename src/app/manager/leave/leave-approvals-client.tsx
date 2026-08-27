"use client";

import { useActionState, useTransition, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/header";
import { useLanguage } from "@/lib/i18n/language-provider";
import { approveLeaveRequestAction, rejectLeaveRequestAction, cancelLeaveRequestAction, editLeaveRequestAction, editApprovedLeaveRequestAction } from "./actions";
import { LeaveCalendar, type LeaveCalendarEntry } from "@/components/leave-calendar";
import { useToast } from "@/components/toast";
import type { ApprovalStatus, LeaveType } from "@/lib/types/database";
import { fmtDateRange, todaySG, todaySGPlusDays } from "@/lib/utils/date";
import { ChargePeriodField, chargePeriodTag } from "@/components/charge-period-field";

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
  annual_charge_offset?: number | null;
  employees: { full_name: string } | { full_name: string }[] | null;
}

function employeeName(row: LeaveRequestRow): string {
  const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;
  return employee?.full_name ?? "—";
}

/** Which pill a status gets. Navy is reserved for the brand, never for state. */
const STATUS_PILL: Record<ApprovalStatus, string> = {
  pending: "g-pill-attention",
  approved: "g-pill-positive",
  rejected: "g-pill-critical",
  cancelled: "g-pill-neutral",
};

const inputClass = "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";
const dateInputClass = "w-full rounded-lg border border-line bg-white px-1 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";
const labelClass = "mb-1 block text-xs font-medium text-muted";

// 44px tall — the minimum comfortable touch target.
const primaryButton = "flex-1 rounded-lg bg-brand py-2.5 text-sm font-semibold text-white disabled:opacity-60";
const quietButton = "flex-1 rounded-lg border border-line bg-white py-2.5 text-sm font-semibold text-foreground disabled:opacity-60";
/** Rejecting is the rarer choice, so it is outlined rather than filled — it
    should be findable, not louder than approving. */
const rejectButton = "flex-1 rounded-lg border border-line bg-white py-2.5 text-sm font-semibold text-critical disabled:opacity-60";

function PendingCard({
  request,
  leaveTypeLabel,
  annualAvailable,
}: {
  request: LeaveRequestRow;
  leaveTypeLabel: Record<LeaveType, string>;
  annualAvailable?: number;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const { addToast } = useToast();
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [actionError, setActionError] = useState<string | null>(null);
  const [chargeOffset, setChargeOffset] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [editState, editAction, isEditing] = useActionState(editLeaveRequestAction.bind(null, request.id), {} as { error?: string });
  const wasEditing = useRef(false);
  useEffect(() => {
    if (wasEditing.current && !isEditing && !editState?.error) {
      setMode("view");
      router.refresh();
    }
    wasEditing.current = isEditing;
  }, [isEditing, editState, router]);

  function handleApprove() {
    setActionError(null);
    startTransition(async () => {
      const result = await approveLeaveRequestAction(
        request.id,
        request.leave_type === "annual" ? chargeOffset : 0
      );
      if (result?.error) setActionError(result.error);
      else { addToast("Leave approved"); router.refresh(); }
    });
  }
  function handleReject() {
    setActionError(null);
    startTransition(async () => {
      const result = await rejectLeaveRequestAction(request.id);
      if (result?.error) setActionError(result.error);
      else { addToast("Leave rejected"); router.refresh(); }
    });
  }

  if (mode === "edit") {
    return (
      <li className="g-card p-4">
        <p className="mb-1 font-semibold">{employeeName(request)}</p>
        <p className="mb-3 text-xs text-muted">{t("leave.editRequest")}</p>
        <form action={editAction} className="space-y-3">
          <div>
            <label className={labelClass}>{t("leave.leaveType")}</label>
            <select name="leaveType" defaultValue={request.leave_type} required className={inputClass}>
              <option value="annual">{leaveTypeLabel.annual}</option>
              <option value="sick">{leaveTypeLabel.sick}</option>
              <option value="hospitalization">{leaveTypeLabel.hospitalization}</option>
              <option value="no_pay">{leaveTypeLabel.no_pay}</option>
              <option value="off_day">{leaveTypeLabel.off_day}</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="min-w-0">
              <label className={labelClass}>{t("leave.startDate")}</label>
              <input name="startDate" type="date" defaultValue={request.start_date} required className={dateInputClass} />
            </div>
            <div className="min-w-0">
              <label className={labelClass}>{t("leave.endDate")}</label>
              <input name="endDate" type="date" defaultValue={request.end_date} required className={dateInputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>{t("leave.reason")}</label>
            <textarea name="reason" rows={2} defaultValue={request.reason ?? ""} className={inputClass} />
          </div>
          {editState?.error && <p className="text-sm text-critical">{editState.error}</p>}
          <div className="flex gap-2">
            <button type="submit" className={primaryButton}>{t("leave.saveChanges")}</button>
            <button type="button" onClick={() => setMode("view")} className={quietButton}>
              {t("leave.cancelEdit")}
            </button>
          </div>
        </form>
      </li>
    );
  }

  // Only meaningful for the default charge period — charging a different
  // period draws down a different balance than the one shown here.
  const showBalanceAfter =
    request.leave_type === "annual" && annualAvailable !== undefined && chargeOffset === 0;
  const balanceAfter = Math.max(0, (annualAvailable ?? 0) - request.days);

  return (
    <li className="g-card border-attention-line p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold">{employeeName(request)}</p>
          <p className="mt-0.5 text-[12.5px] text-muted">
            {leaveTypeLabel[request.leave_type]} · {fmtDateRange(request.start_date, request.end_date)} ·{" "}
            {request.days} {t(request.days === 1 ? "leave.day" : "leave.days")}
          </p>
          {showBalanceAfter && (
            <p className="mt-0.5 text-[12.5px] text-muted">
              {t("leave.balanceAfter")}: {balanceAfter} {t(balanceAfter === 1 ? "leave.day" : "leave.days")}
            </p>
          )}
          {request.reason && (
            <p className="mt-0.5 text-[12.5px] text-muted">{t("leave.reasonLabel")}: {request.reason}</p>
          )}
        </div>
        <span className={`g-pill ${STATUS_PILL.pending}`}>{t("leave.pending")}</span>
      </div>

      {request.leave_type === "annual" && (
        <div className="mt-3 rounded-lg border border-line-soft bg-[#fbfcfd] p-3">
          <p className="mb-1.5 text-xs font-medium text-muted">Charge annual leave to</p>
          <div className="flex flex-col gap-1">
            {[
              { v: 0, label: "Current period (default)" },
              { v: -1, label: "Previous period" },
              { v: 1, label: "Upcoming period" },
            ].map((o) => (
              <label key={o.v} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={`charge-${request.id}`}
                  checked={chargeOffset === o.v}
                  onChange={() => setChargeOffset(o.v)}
                  className="h-4 w-4 accent-brand"
                />
                {o.label}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3.5 flex gap-2">
        <button type="button" disabled={isPending} onClick={handleApprove} className={primaryButton}>
          {isPending ? t("common.loading") : t("leave.approve")}
        </button>
        <button type="button" disabled={isPending} onClick={handleReject} className={rejectButton}>
          {t("leave.reject")}
        </button>
        <button type="button" disabled={isPending} onClick={() => setMode("edit")}
          className="rounded-lg border border-line bg-white px-3 py-2.5 text-sm font-medium text-muted disabled:opacity-60">
          {t("leave.editRequest")}
        </button>
      </div>
      {actionError && <p className="mt-2 text-sm text-critical">{actionError}</p>}
    </li>
  );
}

function HistoryCard({ request, leaveTypeLabel, statusLabel }: {
  request: LeaveRequestRow;
  leaveTypeLabel: Record<LeaveType, string>;
  statusLabel: Record<ApprovalStatus, string>;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "edit" | "cancelConfirm">("view");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [editState, editAction, isEditing] = useActionState(
    editApprovedLeaveRequestAction.bind(null, request.id),
    {} as { error?: string }
  );
  const wasEditing = useRef(false);
  useEffect(() => {
    if (wasEditing.current && !isEditing && !editState?.error) {
      setMode("view");
      router.refresh();
    }
    wasEditing.current = isEditing;
  }, [isEditing, editState, router]);

  function handleCancel() {
    setCancelError(null);
    startTransition(async () => {
      const result = await cancelLeaveRequestAction(request.id);
      if (result?.error) {
        setCancelError(result.error);
      } else {
        setMode("view");
        router.refresh();
      }
    });
  }

  if (mode === "edit") {
    return (
      <li className="g-card p-4">
        <p className="mb-1 font-semibold">{employeeName(request)}</p>
        <p className="mb-3 text-xs text-muted">{t("leave.editRequest")}</p>
        <form action={editAction} className="space-y-3">
          <div>
            <label className={labelClass}>{t("leave.leaveType")}</label>
            <select name="leaveType" defaultValue={request.leave_type} required className={inputClass}>
              <option value="annual">{leaveTypeLabel.annual}</option>
              <option value="sick">{leaveTypeLabel.sick}</option>
              <option value="hospitalization">{leaveTypeLabel.hospitalization}</option>
              <option value="no_pay">{leaveTypeLabel.no_pay}</option>
              <option value="off_day">{leaveTypeLabel.off_day}</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="min-w-0">
              <label className={labelClass}>{t("leave.startDate")}</label>
              <input name="startDate" type="date" defaultValue={request.start_date} required className={dateInputClass} />
            </div>
            <div className="min-w-0">
              <label className={labelClass}>{t("leave.endDate")}</label>
              <input name="endDate" type="date" defaultValue={request.end_date} required className={dateInputClass} />
            </div>
          </div>
          {request.leave_type === "annual" && (
            <ChargePeriodField defaultOffset={request.annual_charge_offset ?? 0} />
          )}
          <div>
            <label className={labelClass}>{t("leave.reason")}</label>
            <textarea name="reason" rows={2} defaultValue={request.reason ?? ""} className={inputClass} />
          </div>
          {editState?.error && <p className="text-sm text-critical">{editState.error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={isEditing} className={primaryButton}>
              {isEditing ? t("common.loading") : t("leave.saveChanges")}
            </button>
            <button type="button" onClick={() => setMode("view")} className={quietButton}>
              {t("leave.cancelEdit")}
            </button>
          </div>
        </form>
      </li>
    );
  }

  if (mode === "cancelConfirm") {
    return (
      <li className="rounded-[0.625rem] border border-critical/30 bg-critical-soft p-4">
        <p className="mb-1 font-semibold">{employeeName(request)}</p>
        <p className="mb-3 text-sm text-critical">{t("leave.cancelApprovedConfirm")}</p>
        <div className="flex gap-2">
          <button type="button" disabled={isPending} onClick={handleCancel}
            className="flex-1 rounded-lg bg-critical py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {isPending ? t("common.loading") : t("leave.cancelApprovedYes")}
          </button>
          <button type="button" onClick={() => setMode("view")} className={quietButton}>
            {t("common.back")}
          </button>
        </div>
        {cancelError && <p className="mt-2 text-sm text-critical">{cancelError}</p>}
      </li>
    );
  }

  return (
    <li className="g-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold">{employeeName(request)}</p>
          <p className="mt-0.5 text-[12.5px] text-muted">
            {leaveTypeLabel[request.leave_type]} · {fmtDateRange(request.start_date, request.end_date)} ·{" "}
            {request.days} {t(request.days === 1 ? "leave.day" : "leave.days")}
          </p>
          {request.reason && (
            <p className="mt-0.5 text-[12.5px] text-muted">{t("leave.reasonLabel")}: {request.reason}</p>
          )}
          {chargePeriodTag(request.annual_charge_offset) && (
            <span className="g-pill g-pill-brand mt-1.5">
              {chargePeriodTag(request.annual_charge_offset)}
            </span>
          )}
        </div>
        <span className={`g-pill ${STATUS_PILL[request.status]}`}>{statusLabel[request.status]}</span>
      </div>
      {request.status === "approved" && (
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => setMode("edit")}
            className="rounded-full bg-brand-surface px-3 py-1.5 text-xs font-semibold text-brand">
            {t("leave.editRequest")}
          </button>
          <button type="button" onClick={() => setMode("cancelConfirm")}
            className="rounded-full bg-critical-soft px-3 py-1.5 text-xs font-semibold text-critical">
            {t("leave.cancelApproved")}
          </button>
        </div>
      )}
    </li>
  );
}

export function LeaveApprovalsClient({
  requests,
  calendarEntries,
  publicHolidays,
  annualAvailable = {},
}: {
  requests: LeaveRequestRow[];
  calendarEntries: LeaveCalendarEntry[];
  publicHolidays: { date: string; name: string }[];
  annualAvailable?: Record<string, number>;
}) {
  const { t } = useLanguage();

  const leaveTypeLabel: Record<LeaveType, string> = {
    annual: t("leave.annual"),
    sick: t("leave.sick"),
    hospitalization: t("leave.hospitalization"),
    no_pay: t("leave.noPay"),
    off_day: t("leave.offDay"),
  };

  const statusLabel: Record<ApprovalStatus, string> = {
    pending: t("leave.pending"),
    approved: t("leave.approved"),
    rejected: t("leave.rejected"),
    cancelled: t("leave.cancelled"),
  };

  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [employeeFilter, setEmployeeFilter] = useState<string>("");
  const [showMore, setShowMore] = useState(false);

  const today = todaySG();

  // Pending always shows in Upcoming regardless of date (needs action)
  const pendingRequests = requests.filter((r) => r.status === "pending");
  const nonPending = requests.filter((r) => r.status !== "pending");

  // Split non-pending by whether the leave has ended
  const upcomingNonPending = nonPending.filter((r) => r.end_date >= today);
  const allPastRequests = nonPending.filter((r) => r.end_date < today);

  const sortedPending = [...pendingRequests].sort((a, b) => a.start_date.localeCompare(b.start_date));
  const sortedUpcomingNonPending = [...upcomingNonPending].sort((a, b) => a.start_date.localeCompare(b.start_date));

  // Past: most recently started first (DESC)
  const allPastSorted = [...allPastRequests].sort((a, b) => b.start_date.localeCompare(a.start_date));

  // Employee list for filter dropdown (derived from all non-pending)
  const allNonPendingEmployees = [...upcomingNonPending, ...allPastRequests];
  const employeeList = Array.from(
    new Map(allNonPendingEmployees.map((r) => [r.employee_id, employeeName(r)])).entries()
  ).sort((a, b) => a[1].localeCompare(b[1]));

  // The employee filter never hides pending requests — they still need a decision.
  const filteredSettled = employeeFilter
    ? sortedUpcomingNonPending.filter((r) => r.employee_id === employeeFilter)
    : sortedUpcomingNonPending;

  const filteredPast = employeeFilter
    ? allPastSorted.filter((r) => r.employee_id === employeeFilter)
    : allPastSorted;

  // Past tab windowing: default 6 months, expandable to 2 years
  const sixMonthsCutoff = todaySGPlusDays(-182);
  const twoYearsCutoff = todaySGPlusDays(-730);
  const pastWithinTwoYears = filteredPast.filter((r) => r.start_date >= twoYearsCutoff);
  const pastWithinSixMonths = pastWithinTwoYears.filter((r) => r.start_date >= sixMonthsCutoff);
  const hasMore = pastWithinTwoYears.length > pastWithinSixMonths.length;
  const visiblePast = showMore ? pastWithinTwoYears : pastWithinSixMonths;

  const pendingCount = sortedPending.length;

  function switchTab(next: "upcoming" | "past") {
    setTab(next);
    setShowMore(false);
  }

  return (
    <>
      <Header titleKey="leave.managerTitle" />
      <main className="flex-1 px-4 py-5">
        <Link href="/manager/leave/record"
          className="mb-4 block rounded-[0.625rem] bg-brand py-3 text-center text-base font-semibold text-white">
          {t("leave.recordLeaveTitle")}
        </Link>

        <h2 className="g-label mb-2">{t("leave.peopleOnLeave")}</h2>
        <div className="mb-5">
          <LeaveCalendar entries={calendarEntries} publicHolidays={publicHolidays} />
        </div>

        {/* Tab switcher */}
        <div className="mb-4 flex rounded-[0.625rem] bg-line-soft p-0.5">
          <button
            type="button"
            onClick={() => switchTab("upcoming")}
            className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[13.5px] font-semibold transition-colors ${
              tab === "upcoming" ? "border border-line bg-white text-brand" : "text-muted"
            }`}
          >
            Upcoming
            {pendingCount > 0 && (
              <span className="g-num flex h-4 min-w-4 items-center justify-center rounded-full bg-attention px-1 text-[10px] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => switchTab("past")}
            className={`flex-1 rounded-lg py-2 text-[13.5px] font-semibold transition-colors ${
              tab === "past" ? "border border-line bg-white text-brand" : "text-muted"
            }`}
          >
            Past
          </button>
        </div>

        {/* Employee filter */}
        {employeeList.length > 1 && (
          <div className="mb-4">
            <select
              value={employeeFilter}
              onChange={(e) => { setEmployeeFilter(e.target.value); setShowMore(false); }}
              className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm"
            >
              <option value="">All employees</option>
              {employeeList.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Upcoming tab — requests awaiting a decision are lifted out of the
            list and counted, so the work to do is not mixed in with the
            requests that are already settled. */}
        {tab === "upcoming" && (
          <div className="flex flex-col gap-5">
            {pendingCount > 0 && (
              <section>
                <h3 className="g-label mb-2">{t("leave.needsDecision")} · {pendingCount}</h3>
                <ul className="space-y-3">
                  {sortedPending.map((request) => (
                    <PendingCard
                      key={request.id}
                      request={request}
                      leaveTypeLabel={leaveTypeLabel}
                      annualAvailable={annualAvailable[request.employee_id]}
                    />
                  ))}
                </ul>
              </section>
            )}

            {filteredSettled.length > 0 && (
              <section>
                <h3 className="g-label mb-2">{t("leave.approved")}</h3>
                <ul className="space-y-3">
                  {filteredSettled.map((request) => (
                    <HistoryCard key={request.id} request={request} leaveTypeLabel={leaveTypeLabel} statusLabel={statusLabel} />
                  ))}
                </ul>
              </section>
            )}

            {pendingCount === 0 && filteredSettled.length === 0 && (
              <p className="py-6 text-center text-sm text-muted">No upcoming leave.</p>
            )}
          </div>
        )}

        {/* Past tab */}
        {tab === "past" && (
          <>
            {visiblePast.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">{t("leave.noHistory")}</p>
            ) : (
              <ul className="space-y-3">
                {visiblePast.map((request) => (
                  <HistoryCard key={request.id} request={request} leaveTypeLabel={leaveTypeLabel} statusLabel={statusLabel} />
                ))}
              </ul>
            )}
            {hasMore && (
              <button type="button" onClick={() => setShowMore(!showMore)}
                className="mt-4 w-full rounded-lg border border-line bg-white py-2.5 text-sm font-medium text-muted">
                {showMore ? "See less" : "See more (up to 2 years)"}
              </button>
            )}
          </>
        )}
      </main>
    </>
  );
}
