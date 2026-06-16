"use client";

import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/header";
import { useLanguage } from "@/lib/i18n/language-provider";

export interface DashboardProps {
  firstName: string | null;
  todayLabel: string;
  annualAvail: number;
  sickAvail: number;
  unreadCount: number;
  netPay: number | null;
  payslipLabel: string | null;
  onProbation: boolean;
  confirmDateLabel: string | null;
}

export function EmployeeDashboardClient({
  firstName,
  todayLabel,
  annualAvail,
  sickAvail,
  unreadCount,
  netPay,
  payslipLabel,
  onProbation,
  confirmDateLabel,
}: DashboardProps) {
  const { t } = useLanguage();

  return (
    <>
      <Header titleKey="dashboard.employeeTitle" />
      <main className="flex-1 px-4 py-6">
        <div className="mb-6 flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm">
          <div className="relative h-12 w-12 shrink-0">
            <Image
              src="/images/logo-blue.png"
              alt="Gladen Maintenance Services"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">
              {firstName ? `${t("dashboard.greeting")}, ${firstName}` : t("dashboard.greeting")}
            </p>
            <p className="text-sm text-foreground/60">{todayLabel}</p>
          </div>
        </div>

        {onProbation && confirmDateLabel && (
          <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {t("leave.probationUntil")} <span className="font-semibold">{confirmDateLabel}</span>. {t("leave.leaveAvailableAfter")}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Link href="/employee/leave/annual" className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-2xl font-semibold text-brand">{annualAvail}</p>
            <p className="mt-1 text-sm text-foreground/60">{t("summary.annualLeft")}</p>
          </Link>

          <Link href="/employee/leave/sick" className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-2xl font-semibold text-brand">{sickAvail}</p>
            <p className="mt-1 text-sm text-foreground/60">{t("summary.sickLeft")}</p>
          </Link>

          <Link href="/employee/announcements" className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-2xl font-semibold text-brand">{unreadCount}</p>
            <p className="mt-1 text-sm text-foreground/60">{t("summary.unreadAnnouncements")}</p>
          </Link>

          <Link href="/employee/payslips" className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-2xl font-semibold text-brand">
              {netPay !== null ? `S$${netPay.toFixed(2)}` : "—"}
            </p>
            <p className="mt-1 text-sm text-foreground/60">
              {payslipLabel ? `${t("summary.lastPay")} (${payslipLabel})` : t("summary.latestPayslip")}
            </p>
          </Link>
        </div>
      </main>
    </>
  );
}
