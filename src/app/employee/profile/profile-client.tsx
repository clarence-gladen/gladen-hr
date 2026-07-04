"use client";

import Link from "next/link";
import { useState } from "react";
import { Header } from "@/components/header";
import { useLanguage } from "@/lib/i18n/language-provider";
import type { ResidencyStatus, LeaveType, ApprovalStatus } from "@/lib/types/database";
import { fmtDate } from "@/lib/utils/date";
import { LeaveRequestCard } from "../leave/leave-client";
import type { LeaveRequestRow } from "../leave/leave-client";

export interface EmployeeProfile {
  full_name: string;
  designation: string | null;
  employment_start_date: string;
  residency_status: ResidencyStatus;
  mobile_number: string;
  bank_name: string | null;
  bank_account_number: string | null;
}

export function ProfileClient({
  employee,
  leaveRequests = [],
}: {
  employee: EmployeeProfile | null;
  leaveRequests?: LeaveRequestRow[];
}) {
  const { t } = useLanguage();
  const [leaveTab, setLeaveTab] = useState<"upcoming" | "past">("upcoming");

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
  const statusClass: Record<ApprovalStatus, string> = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-brand/10 text-brand",
    rejected: "bg-black/5 text-foreground/60",
    cancelled: "bg-orange-100 text-orange-600",
  };

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = leaveRequests.filter(
    (r) => r.status !== "cancelled" && r.status !== "rejected" && r.end_date >= today
  ).sort((a, b) => a.start_date.localeCompare(b.start_date));
  const past = leaveRequests.filter(
    (r) => r.end_date < today || r.status === "cancelled" || r.status === "rejected"
  ).sort((a, b) => b.start_date.localeCompare(a.start_date));

  const activeList = leaveTab === "upcoming" ? upcoming : past;

  const residencyLabel: Record<ResidencyStatus, string> = {
    citizen: t("employees.citizen"),
    pr: t("employees.pr"),
    work_permit: t("employees.workPermit"),
    s_pass: t("employees.sPass"),
  };

  function Row({ label, value }: { label: string; value: string | null | undefined }) {
    if (!value) return null;
    return (
      <div className="flex items-start justify-between gap-3 border-t border-black/5 px-4 py-3">
        <span className="text-sm text-foreground/60">{label}</span>
        <span className="text-right text-sm font-medium text-foreground">{value}</span>
      </div>
    );
  }

  return (
    <>
      <Header titleKey="profile.title" />
      <main className="flex-1 px-4 py-6">
        {!employee ? (
          <p className="text-sm text-foreground/60">{t("profile.noEmployeeLinked")}</p>
        ) : (
          <>
            <div className="mb-4 overflow-hidden rounded-xl bg-white shadow-sm">
              <div className="px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40">
                  {t("profile.employment")}
                </p>
              </div>
              <Row label={t("profile.fullName")} value={employee.full_name} />
              <Row label={t("profile.designation")} value={employee.designation} />
              <Row label={t("profile.startDate")} value={fmtDate(employee.employment_start_date)} />
              <Row label={t("profile.residency")} value={residencyLabel[employee.residency_status]} />
              <Row label={t("profile.mobile")} value={employee.mobile_number} />
            </div>

            {(employee.bank_name || employee.bank_account_number) && (
              <div className="mb-4 overflow-hidden rounded-xl bg-white shadow-sm">
                <div className="px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40">
                    {t("profile.bankInfo")}
                  </p>
                </div>
                <Row label={t("profile.bankName")} value={employee.bank_name} />
                <Row label={t("profile.bankAccount")} value={employee.bank_account_number} />
              </div>
            )}

            <div className="overflow-hidden rounded-xl bg-white shadow-sm">
              <Link href="/employee/documents" className="flex items-center justify-between px-4 py-4">
                <span className="text-base font-medium text-foreground">{t("profile.myDocuments")}</span>
                <span className="text-foreground/40">›</span>
              </Link>
            </div>

            <div className="mt-3 overflow-hidden rounded-xl bg-white shadow-sm">
              <a
                href="/employee-guide.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-4 py-4"
              >
                <span className="text-base font-medium text-foreground">{t("profile.userGuide")}</span>
                <span className="text-foreground/40">↗</span>
              </a>
            </div>

            {/* Leave requests section */}
            <div className="mt-6">
              <h2 className="mb-2 text-sm font-semibold text-foreground/60">{t("leave.myRequests")}</h2>

              {/* Tab switcher */}
              <div className="mb-3 flex rounded-xl bg-black/5 p-1">
                <button
                  type="button"
                  onClick={() => setLeaveTab("upcoming")}
                  className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                    leaveTab === "upcoming"
                      ? "bg-white text-foreground shadow-sm"
                      : "text-foreground/50"
                  }`}
                >
                  Upcoming
                  {upcoming.length > 0 && (
                    <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      leaveTab === "upcoming" ? "bg-brand text-white" : "bg-black/10 text-foreground/50"
                    }`}>
                      {upcoming.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setLeaveTab("past")}
                  className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                    leaveTab === "past"
                      ? "bg-white text-foreground shadow-sm"
                      : "text-foreground/50"
                  }`}
                >
                  Past
                  {past.length > 0 && (
                    <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      leaveTab === "past" ? "bg-black/10 text-foreground/60" : "bg-black/10 text-foreground/50"
                    }`}>
                      {past.length}
                    </span>
                  )}
                </button>
              </div>

              {activeList.length === 0 ? (
                <p className="text-center text-sm text-foreground/40 py-6">
                  {leaveTab === "upcoming" ? "No upcoming leave." : "No past leave records."}
                </p>
              ) : (
                <ul className="space-y-3">
                  {activeList.map((req) => (
                    <LeaveRequestCard
                      key={req.id}
                      req={req}
                      leaveTypeLabel={leaveTypeLabel}
                      statusLabel={statusLabel}
                      statusClass={statusClass}
                    />
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </main>
    </>
  );
}
