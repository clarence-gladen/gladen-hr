"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/language-provider";
import type { LeaveType } from "@/lib/types/database";
import { NotificationBell } from "@/components/notification-bell";
import { LanguageToggle } from "@/components/language-toggle";

const QUOTES = [
  "The strength of the team is each individual member. The strength of each member is the team.",
  "Coming together is a beginning, staying together is progress, and working together is success.",
  "Hard work beats talent when talent doesn't work hard.",
  "Success is not final, failure is not fatal: it is the courage to continue that counts.",
  "The secret of getting ahead is getting started.",
  "Believe you can and you're halfway there.",
  "Quality means doing it right when no one is looking.",
  "A clean environment is a productive environment.",
  "Great things in business are never done by one person — they're done by a team.",
  "Excellence is not a skill, it's an attitude.",
  "Don't watch the clock; do what it does. Keep going.",
  "Opportunities are usually disguised as hard work, so most people don't recognise them.",
  "Pride in your work is the foundation of excellence.",
  "Teamwork makes the dream work.",
  "A good team can go far; a great team can go anywhere.",
];

export interface OnLeaveEntry {
  id: string;
  full_name: string;
  leave_type: LeaveType;
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  created_at: string;
}

export function DashboardClient({
  firstName,
  totalEmployees,
  onLeaveToday,
  pendingApprovals,
  expiringDocuments,
  announcements,
}: {
  firstName: string | null;
  totalEmployees: number;
  onLeaveToday: OnLeaveEntry[];
  pendingApprovals: number;
  expiringDocuments: number;
  announcements: Announcement[];
}) {
  const { t } = useLanguage();
  const today = new Date();
  const todayLabel = today.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  const quote = QUOTES[today.getDate() % QUOTES.length];

  const leaveTypeLabel: Record<LeaveType, string> = {
    annual: t("leave.annual"),
    sick: t("leave.sick"),
    hospitalization: t("leave.hospitalization"),
    no_pay: t("leave.noPay"),
  };
  const leaveTypeDot: Record<LeaveType, string> = {
    annual: "bg-brand",
    sick: "bg-amber-400",
    hospitalization: "bg-amber-400",
    no_pay: "bg-gray-300",
  };

  return (
    <div className="flex flex-col">
      {/* Blue header — sticky + z-10 matches inner page <Header> so iOS status bar stays brand blue */}
      <div
        className="sticky top-0 z-10 bg-brand px-5 pb-4"
        style={{ paddingTop: "calc(1rem + env(safe-area-inset-top))" }}
      >
        {/* Logo row with notification bell and language toggle */}
        <div className="flex items-center justify-between mb-2">
          <div className="relative w-[55%] max-w-[180px]" style={{ aspectRatio: "2.5/1" }}>
            <Image src="/images/logo-white-full.png" alt="Gladen Maintenance Services" fill className="object-contain" priority />
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell href="/manager/notifications" />
            <LanguageToggle variant="light" />
          </div>
        </div>
        <p className="text-base font-bold text-white">
          {firstName ? `Welcome back, ${firstName} 👋` : "Welcome back 👋"}
        </p>
        <p className="text-xs text-white/60">{todayLabel}</p>
      </div>

      {/* Page content */}
      <div className="flex flex-col gap-3 px-4 py-3">

        {/* Quote */}
        <div className="rounded-xl bg-brand/10 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand/60">Quote of the Day</p>
          <p className="mt-0.5 text-xs leading-relaxed text-brand/90">"{quote}"</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/manager/employees" className="rounded-xl bg-white p-3 shadow-sm">
            <p className="text-2xl font-bold text-brand">{totalEmployees}</p>
            <p className="mt-0.5 text-xs text-foreground/50">{t("summary.totalEmployees")}</p>
          </Link>
          <Link href="/manager/leave" className="rounded-xl bg-white p-3 shadow-sm">
            <p className="text-2xl font-bold text-brand">{onLeaveToday.length}</p>
            <p className="mt-0.5 text-xs text-foreground/50">{t("summary.onLeaveToday")}</p>
          </Link>
          <Link href="/manager/leave" className="rounded-xl bg-white p-3 shadow-sm">
            <p className={`text-2xl font-bold ${pendingApprovals > 0 ? "text-amber-500" : "text-brand"}`}>
              {pendingApprovals}
            </p>
            <p className="mt-0.5 text-xs text-foreground/50">{t("summary.pendingApprovals")}</p>
          </Link>
          <Link href="/manager/documents" className="rounded-xl bg-white p-3 shadow-sm">
            <p className={`text-2xl font-bold ${expiringDocuments > 0 ? "text-red-500" : "text-brand"}`}>
              {expiringDocuments}
            </p>
            <p className="mt-0.5 text-xs text-foreground/50">{t("summary.expiringDocuments")}</p>
          </Link>
        </div>

        {/* On Leave Today */}
        <div className="rounded-xl bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">{t("dashboard.onLeaveToday")}</p>
            <Link href="/manager/leave" className="text-xs font-medium text-brand">View all</Link>
          </div>
          {onLeaveToday.length === 0 ? (
            <p className="text-xs text-foreground/40">{t("dashboard.noOneOnLeaveToday")}</p>
          ) : (
            <ul className="space-y-1.5">
              {onLeaveToday.slice(0, 3).map((entry) => (
                <li key={entry.id} className="flex items-center gap-2 text-xs">
                  <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${leaveTypeDot[entry.leave_type]}`} />
                  <span className="flex-1 text-foreground">{entry.full_name}</span>
                  <span className="text-foreground/50">{leaveTypeLabel[entry.leave_type]}</span>
                </li>
              ))}
              {onLeaveToday.length > 3 && (
                <li className="text-xs text-foreground/40">+{onLeaveToday.length - 3} more</li>
              )}
            </ul>
          )}
        </div>

        {/* Latest Announcements */}
        {announcements.length > 0 && (
          <div className="rounded-xl bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground">Latest Announcements</p>
              <Link href="/manager/announcements" className="text-xs font-medium text-brand">View all</Link>
            </div>
            <ul className="space-y-2">
              {announcements.map((a) => (
                <li key={a.id} className="border-l-2 border-brand/30 pl-2">
                  <p className="text-xs font-semibold text-foreground">{a.title}</p>
                  <p className="text-xs text-foreground/50 line-clamp-1">{a.body}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

      </div>
    </div>
  );
}
