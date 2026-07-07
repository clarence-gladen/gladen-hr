"use client";

import { useState, useTransition, useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { useLanguage } from "@/lib/i18n/language-provider";
import { offboardEmployeeAction, revealNricAction, setEmployeeStatusAction } from "../actions";
import { cancelLeaveRequestAction, editLeaveRequestAction, editApprovedLeaveRequestAction } from "../../leave/actions";
import { LeaveHistoryTable } from "@/components/leave-history-table";
import type { LeaveYearHistory } from "@/lib/leave/balances";
import type { EmployeeDetail, ResidencyStatus, SkillLevel, LeaveType, ApprovalStatus } from "@/lib/types/database";
import { fmtDate } from "@/lib/utils/date";
import { EmployeeDocumentsSection, type EmployeeDocumentRow } from "./employee-documents-section";

export interface EmployeeLeaveRow {
  id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  days: number;
  reason: string | null;
  status: ApprovalStatus;
  created_at: string;
}

const inputClass = "w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";
const dateInputClass = "w-full rounded-lg border border-black/10 bg-white px-1 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";
const labelClass = "mb-1 block text-xs font-medium text-foreground/60";

function LeaveCard({
  request,
  leaveTypeLabel,
  statusLabel,
}: {
  request: EmployeeLeaveRow;
  leaveTypeLabel: Record<LeaveType, string>;
  statusLabel: Record<ApprovalStatus, string>;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "edit" | "cancelConfirm">("view");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const editAction = request.status === "pending"
    ? editLeaveRequestAction.bind(null, request.id)
    : editApprovedLeaveRequestAction.bind(null, request.id);

  const [editState, dispatchEdit, isEditing] = useActionState(editAction, {} as { error?: string });
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
      if (result?.error) setCancelError(result.error);
      else { setMode("view"); router.refresh(); }
    });
  }

  const canEdit = request.status === "pending" || request.status === "approved";
  const canCancel = request.status === "pending" || request.status === "approved";

  if (mode === "edit") {
    return (
      <li className="rounded-xl bg-white p-4 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground/40">{t("leave.editRequest")}</p>
        <form action={dispatchEdit} className="space-y-3">
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
          {editState?.error && <p className="text-sm text-red-600">{editState.error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={isEditing}
              className="flex-1 rounded-lg bg-brand py-2 text-sm font-semibold text-white disabled:opacity-60">
              {isEditing ? t("common.loading") : t("leave.saveChanges")}
            </button>
            <button type="button" onClick={() => setMode("view")}
              className="flex-1 rounded-lg bg-black/5 py-2 text-sm font-semibold text-foreground">
              {t("leave.cancelEdit")}
            </button>
          </div>
        </form>
      </li>
    );
  }

  if (mode === "cancelConfirm") {
    return (
      <li className="rounded-xl border border-red-200 bg-red-50 p-4">
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

  const statusClass: Record<ApprovalStatus, string> = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-brand/10 text-brand",
    rejected: "bg-black/5 text-foreground/60",
    cancelled: "bg-orange-100 text-orange-600",
  };

  return (
    <li className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {leaveTypeLabel[request.leave_type]}
            <span className="ml-1.5 font-normal text-foreground/50">· {request.days} {t("leave.days")}</span>
          </p>
          <p className="mt-0.5 text-sm text-foreground/60">
            {fmtDate(request.start_date)}{request.start_date !== request.end_date ? ` – ${fmtDate(request.end_date)}` : ""}
          </p>
          {request.reason && (
            <p className="mt-0.5 text-xs text-foreground/50">{request.reason}</p>
          )}
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusClass[request.status]}`}>
          {statusLabel[request.status]}
        </span>
      </div>
      {(canEdit || canCancel) && (
        <div className="mt-3 flex gap-2">
          {canEdit && (
            <button type="button" onClick={() => setMode("edit")}
              className="rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
              {t("leave.editRequest")}
            </button>
          )}
          {canCancel && (
            <button type="button" onClick={() => setMode("cancelConfirm")}
              className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600">
              {t("leave.cancelApproved")}
            </button>
          )}
        </div>
      )}
    </li>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-black/5 last:border-0">
      <p className="text-sm text-foreground/60 shrink-0">{label}</p>
      <p className="text-sm font-medium text-foreground text-right">{value}</p>
    </div>
  );
}

export function EmployeeDetailClient({
  employee,
  leaveHistory = [],
  leaveRequests = [],
  employeeDocuments = [],
}: {
  employee: EmployeeDetail;
  leaveHistory?: LeaveYearHistory[];
  leaveRequests?: EmployeeLeaveRow[];
  employeeDocuments?: EmployeeDocumentRow[];
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const [showOffboard, setShowOffboard] = useState(false);
  const [leaveTab, setLeaveTab] = useState<"upcoming" | "past">("upcoming");
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [isPending, startTransition] = useTransition();
  const [nric, setNric] = useState<string | null>(null);
  const [nricPending, startNricTransition] = useTransition();
  const [nricError, setNricError] = useState<string | null>(null);

  function handleRevealNric() {
    if (nric) { setNric(null); return; }
    setNricError(null);
    startNricTransition(async () => {
      const result = await revealNricAction(employee.id);
      if (result.error) setNricError(result.error);
      else setNric(result.nric ?? null);
    });
  }

  const residencyLabel: Record<ResidencyStatus, string> = {
    citizen: t("employees.citizen"),
    pr: t("employees.pr"),
    work_permit: t("employees.workPermit"),
    s_pass: t("employees.sPass"),
  };

  const skillLabel: Record<SkillLevel, string> = {
    basic_skilled: t("employees.basicSkilled"),
    higher_skilled: t("employees.higherSkilled"),
  };

  function handleReactivate() {
    startTransition(async () => {
      await setEmployeeStatusAction(employee.id, "active");
      router.refresh();
    });
  }

  function handleOffboard() {
    startTransition(async () => {
      await offboardEmployeeAction(employee.id, endDate);
      setShowOffboard(false);
      router.refresh();
    });
  }

  const isActive = employee.status === "active";

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

  const today = new Date().toISOString().slice(0, 10);
  const upcomingLeave = leaveRequests
    .filter((r) => r.status !== "cancelled" && r.status !== "rejected" && r.end_date >= today)
    .sort((a, b) => a.start_date.localeCompare(b.start_date));
  const pastLeave = leaveRequests
    .filter((r) => r.end_date < today || r.status === "cancelled" || r.status === "rejected")
    .sort((a, b) => b.start_date.localeCompare(a.start_date));
  const activeLeaveList = leaveTab === "upcoming" ? upcomingLeave : pastLeave;

  return (
    <>
      <Header titleKey="employees.employeeProfile" />
      <main className="flex-1 px-4 py-6 space-y-4">

        {/* Status banner */}
        {!isActive && (
          <div className="rounded-xl bg-black/5 px-4 py-3 text-sm text-foreground/60">
            {t("employees.inactive")}
            {employee.employment_end_date && (
              <> · {t("employees.endedOn")} <span className="font-semibold">{fmtDate(employee.employment_end_date)}</span></>
            )}
          </div>
        )}

        {/* Personal info */}
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground/40">
            {t("employees.personalInfo")}
          </h2>
          <Row label={t("employees.fullName")} value={employee.full_name} />
          <div className="flex items-center justify-between gap-4 py-3 border-b border-black/5">
            <p className="text-sm text-foreground/60 shrink-0">{t("employees.nric")}</p>
            <div className="flex items-center gap-3">
              <p className="text-sm font-medium text-foreground font-mono">
                {nric ?? `•••••${employee.nric_last4}`}
              </p>
              <button
                type="button"
                onClick={handleRevealNric}
                disabled={nricPending}
                className="text-xs font-semibold text-brand disabled:opacity-50"
              >
                {nricPending ? "…" : nric ? "Hide" : "View"}
              </button>
            </div>
          </div>
          {nricError && (
            <p className="text-xs text-red-600 pb-2">{nricError}</p>
          )}
          <Row label={t("employees.dateOfBirth")} value={fmtDate(employee.date_of_birth)} />
          <Row label={t("employees.mobileNumber")} value={`+${employee.mobile_number}`} />
          <Row label={t("employees.residencyStatus")} value={residencyLabel[employee.residency_status]} />
        </div>

        {/* Employment info */}
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground/40">
            {t("employees.employmentInfo")}
          </h2>
          <Row label={t("employees.designation")} value={employee.designation} />
          <Row label={t("employees.skillLevel")} value={skillLabel[employee.skill_level]} />
          <Row label={t("employees.employmentStartDate")} value={fmtDate(employee.employment_start_date)} />
          {employee.employment_end_date && (
            <Row label={t("employees.employmentEndDate")} value={fmtDate(employee.employment_end_date)} />
          )}
          <Row label={t("employees.baseSalary")} value={`S$ ${Number(employee.base_salary).toFixed(2)}`} />
        </div>

        {/* Bank info */}
        {(employee.bank_name || employee.bank_account_number) && (
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground/40">
              {t("profile.bankInfo")}
            </h2>
            <Row label={t("profile.bankName")} value={employee.bank_name} />
            <Row label={t("profile.bankAccount")} value={employee.bank_account_number} />
          </div>
        )}

        {/* Documents */}
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/40">
            Documents
          </h2>
          <EmployeeDocumentsSection
            employeeId={employee.id}
            residencyStatus={employee.residency_status}
            documents={employeeDocuments}
          />
        </div>

        {/* Leave history */}
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/40">
            Leave History (Last 3 Employment Years)
          </h2>
          <LeaveHistoryTable history={leaveHistory} />
        </div>

        {/* Leave requests */}
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/40">
            Leave Requests
          </h2>
          <div className="mb-3 flex rounded-xl bg-black/5 p-1">
            <button
              type="button"
              onClick={() => setLeaveTab("upcoming")}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                leaveTab === "upcoming" ? "bg-white text-foreground shadow-sm" : "text-foreground/50"
              }`}
            >
              Upcoming
              {upcomingLeave.length > 0 && (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  leaveTab === "upcoming" ? "bg-brand text-white" : "bg-black/10 text-foreground/50"
                }`}>
                  {upcomingLeave.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setLeaveTab("past")}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                leaveTab === "past" ? "bg-white text-foreground shadow-sm" : "text-foreground/50"
              }`}
            >
              Past
              {pastLeave.length > 0 && (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  leaveTab === "past" ? "bg-black/10 text-foreground/60" : "bg-black/10 text-foreground/50"
                }`}>
                  {pastLeave.length}
                </span>
              )}
            </button>
          </div>
          {activeLeaveList.length === 0 ? (
            <p className="py-6 text-center text-sm text-foreground/40">
              {leaveTab === "upcoming" ? "No upcoming leave." : "No past leave records."}
            </p>
          ) : (
            <ul className="space-y-3">
              {activeLeaveList.map((req) => (
                <LeaveCard
                  key={req.id}
                  request={req}
                  leaveTypeLabel={leaveTypeLabel}
                  statusLabel={statusLabel}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Actions */}
        <Link
          href={`/manager/employees/${employee.id}/edit`}
          className="block w-full rounded-lg border border-brand py-3 text-center text-base font-semibold text-brand"
        >
          {t("employees.editEmployee")}
        </Link>

        {isActive ? (
          !showOffboard ? (
            <button
              type="button"
              onClick={() => setShowOffboard(true)}
              className="block w-full rounded-lg bg-red-50 py-3 text-center text-base font-semibold text-red-600"
            >
              {t("employees.offboard")}
            </button>
          ) : (
            <div className="rounded-xl bg-red-50 p-4 space-y-3">
              <p className="text-sm font-semibold text-red-700">{t("employees.offboardConfirm")}</p>
              <div>
                <label className="mb-1 block text-sm font-medium text-red-700">
                  {t("employees.lastWorkingDay")}
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-lg border border-red-200 bg-white px-4 py-2 text-base focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowOffboard(false)}
                  className="flex-1 rounded-lg bg-white py-2 text-sm font-medium text-foreground border border-black/10"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  disabled={isPending || !endDate}
                  onClick={handleOffboard}
                  className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {isPending ? t("common.loading") : t("employees.confirmOffboard")}
                </button>
              </div>
            </div>
          )
        ) : (
          <button
            type="button"
            disabled={isPending}
            onClick={handleReactivate}
            className="block w-full rounded-lg bg-brand/10 py-3 text-center text-base font-semibold text-brand disabled:opacity-60"
          >
            {isPending ? t("common.loading") : t("employees.reactivate")}
          </button>
        )}
      </main>
    </>
  );
}
