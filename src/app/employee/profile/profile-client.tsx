"use client";

import Link from "next/link";
import { Header } from "@/components/header";
import { useLanguage } from "@/lib/i18n/language-provider";
import type { ResidencyStatus } from "@/lib/types/database";
import { fmtDate } from "@/lib/utils/date";

export interface EmployeeProfile {
  full_name: string;
  designation: string | null;
  employment_start_date: string;
  residency_status: ResidencyStatus;
  mobile_number: string;
  bank_name: string | null;
  bank_account_number: string | null;
}

export function ProfileClient({ employee }: { employee: EmployeeProfile | null }) {
  const { t } = useLanguage();

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
          </>
        )}
      </main>
    </>
  );
}
