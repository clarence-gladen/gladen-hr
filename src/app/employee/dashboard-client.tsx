"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/language-provider";
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

interface Announcement {
  id: string;
  title: string;
  body: string;
  created_at: string;
}

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
  announcements: Announcement[];
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
  announcements,
}: DashboardProps) {
  const { t } = useLanguage();
  const quote = QUOTES[new Date().getDate() % QUOTES.length];

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
            <NotificationBell href="/employee/notifications" />
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

        {/* Probation notice */}
        {onProbation && confirmDateLabel && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5">
            <p className="text-xs text-amber-700">
              {t("leave.probationUntil")} <span className="font-semibold">{confirmDateLabel}</span>. {t("leave.leaveAvailableAfter")}
            </p>
          </div>
        )}

        {/* Quote */}
        <div className="rounded-xl bg-brand/10 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand/60">Quote of the Day</p>
          <p className="mt-0.5 text-xs leading-relaxed text-brand/90">"{quote}"</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/employee/leave" className="rounded-xl bg-white p-3 shadow-sm">
            <p className="text-2xl font-bold text-brand">{annualAvail}</p>
            <p className="mt-0.5 text-xs text-foreground/50">{t("summary.annualLeft")}</p>
          </Link>
          <Link href="/employee/leave" className="rounded-xl bg-white p-3 shadow-sm">
            <p className="text-2xl font-bold text-brand">{sickAvail}</p>
            <p className="mt-0.5 text-xs text-foreground/50">{t("summary.sickLeft")}</p>
          </Link>
          <Link href="/employee/payslips" className="rounded-xl bg-white p-3 shadow-sm">
            <p className="text-xl font-bold text-brand">
              {netPay !== null ? `S$${netPay.toFixed(0)}` : "—"}
            </p>
            <p className="mt-0.5 text-xs text-foreground/50">
              {payslipLabel ? `Pay (${payslipLabel})` : t("summary.latestPayslip")}
            </p>
          </Link>
          <Link href="/employee/announcements" className="rounded-xl bg-white p-3 shadow-sm">
            <p className="text-2xl font-bold text-brand">{unreadCount}</p>
            <p className="mt-0.5 text-xs text-foreground/50">{t("summary.unreadAnnouncements")}</p>
          </Link>
        </div>

        {/* Latest Announcements */}
        {announcements.length > 0 && (
          <div className="rounded-xl bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground">Latest Announcements</p>
              <Link href="/employee/announcements" className="text-xs font-medium text-brand">View all</Link>
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
