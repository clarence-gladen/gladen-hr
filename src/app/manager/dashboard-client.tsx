"use client";

import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/header";
import { useLanguage } from "@/lib/i18n/language-provider";
import type { LeaveType } from "@/lib/types/database";

export interface OnLeaveEntry {
  id: string;
  full_name: string;
  leave_type: LeaveType;
}

export function DashboardClient({
  totalEmployees,
  onLeaveToday,
  pendingApprovals,
  expiringDocuments,
}: {
  totalEmployees: number;
  onLeaveToday: OnLeaveEntry[];
  pendingApprovals: number;
  expiringDocuments: number;
}) {
  const { t } = useLanguage();

  const leaveTypeLabel: Record<LeaveType, string> = {
    annual: t("leave.annual"),
    sick: t("leave.sick"),
    hospitalization: t("leave.hospitalization"),
    no_pay: t("leave.noPay"),
  };

  const leaveTypeClass: Record<LeaveType, string> = {
    annual: "bg-brand/10 text-brand",
    sick: "bg-amber-100 text-amber-700",
    hospitalization: "bg-amber-100 text-amber-700",
    no_pay: "bg-black/5 text-foreground/60",
  };

  const sickToday = onLeaveToday.filter((entry) => entry.leave_type !== "annual");

  const summaryCards = [
    { labelKey: "summary.totalEmployees", value: totalEmployees, href: null },
    { labelKey: "summary.onLeaveToday", value: onLeaveToday.length, href: null },
    { labelKey: "summary.pendingApprovals", value: pendingApprovals, href: "/manager/leave" },
    { labelKey: "summary.expiringDocuments", value: expiringDocuments, href: null },
  ];

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <>
      <Header titleKey="dashboard.managerTitle" />
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
            <p className="text-base font-semibold text-foreground">{t("dashboard.greeting")}</p>
            <p className="text-sm text-foreground/60">{today}</p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4">
          {summaryCards.map((card) => {
            const inner = (
              <>
                <p className="text-2xl font-semibold text-brand">{card.value}</p>
                <p className="mt-1 text-sm text-foreground/60">{t(card.labelKey)}</p>
              </>
            );
            return card.href ? (
              <Link key={card.labelKey} href={card.href} className="rounded-xl bg-white p-4 shadow-sm">
                {inner}
              </Link>
            ) : (
              <div key={card.labelKey} className="rounded-xl bg-white p-4 shadow-sm">
                {inner}
              </div>
            );
          })}
        </div>

        <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground/60">
              {t("dashboard.onLeaveToday")}
            </h2>
            <Link href="/manager/leave" className="text-xs font-medium text-brand">
              {t("dashboard.viewLeaveCalendar")}
            </Link>
          </div>
          {onLeaveToday.length === 0 ? (
            <p className="text-sm text-foreground/60">{t("dashboard.noOneOnLeaveToday")}</p>
          ) : (
            <ul className="space-y-2">
              {onLeaveToday.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{entry.full_name}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${leaveTypeClass[entry.leave_type]}`}
                  >
                    {leaveTypeLabel[entry.leave_type]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {sickToday.length > 0 && (
          <div className="rounded-xl bg-amber-50 p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold text-amber-700">
              {t("dashboard.sickLeaveToday")}
            </h2>
            <ul className="space-y-1">
              {sickToday.map((entry) => (
                <li key={entry.id} className="text-sm text-amber-800">
                  {entry.full_name} · {leaveTypeLabel[entry.leave_type]}
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </>
  );
}
