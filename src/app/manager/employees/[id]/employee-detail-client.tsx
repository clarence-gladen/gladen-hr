"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { useLanguage } from "@/lib/i18n/language-provider";
import { offboardEmployeeAction, revealNricAction, setEmployeeStatusAction } from "../actions";
import { LeaveHistoryTable } from "@/components/leave-history-table";
import type { LeaveYearHistory } from "@/lib/leave/balances";
import type { EmployeeDetail, ResidencyStatus, SkillLevel } from "@/lib/types/database";

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
}: {
  employee: EmployeeDetail;
  leaveHistory?: LeaveYearHistory[];
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const [showOffboard, setShowOffboard] = useState(false);
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

  return (
    <>
      <Header titleKey="employees.employeeProfile" />
      <main className="flex-1 px-4 py-6 space-y-4">

        {/* Status banner */}
        {!isActive && (
          <div className="rounded-xl bg-black/5 px-4 py-3 text-sm text-foreground/60">
            {t("employees.inactive")}
            {employee.employment_end_date && (
              <> · {t("employees.endedOn")} <span className="font-semibold">{employee.employment_end_date}</span></>
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
          <Row label={t("employees.dateOfBirth")} value={employee.date_of_birth} />
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
          <Row label={t("employees.employmentStartDate")} value={employee.employment_start_date} />
          {employee.employment_end_date && (
            <Row label={t("employees.employmentEndDate")} value={employee.employment_end_date} />
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

        {/* Leave history */}
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/40">
            Leave History (Last 3 Employment Years)
          </h2>
          <LeaveHistoryTable history={leaveHistory} />
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
