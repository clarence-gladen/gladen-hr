"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/language-provider";

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
  "Your work is going to fill a large part of your life, and the only way to be truly satisfied is to do what you believe is great work.",
  "Excellence is not a skill, it's an attitude.",
  "The way to get started is to quit talking and begin doing.",
  "Don't watch the clock; do what it does. Keep going.",
  "Opportunities are usually disguised as hard work, so most people don't recognise them.",
  "Pride in your work is the foundation of excellence.",
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
    <main className="flex-1 overflow-y-auto pb-24">
      {/* Hero banner */}
      <div className="bg-white px-6 pt-8 pb-5 shadow-sm">
        <div className="mb-5 flex justify-center">
          <div className="relative w-[60%] max-w-[240px] aspect-[3/1]">
            <Image
              src="/images/logo-full.png"
              alt="Gladen Maintenance Services"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
        <p className="text-lg font-bold text-foreground">
          {firstName ? `Welcome back, ${firstName} 👋` : "Welcome back 👋"}
        </p>
        <p className="text-sm text-foreground/50">{todayLabel}</p>
      </div>

      <div className="px-4 pt-5 space-y-5">

        {/* Probation notice */}
        {onProbation && confirmDateLabel && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-sm text-amber-700">
              {t("leave.probationUntil")} <span className="font-semibold">{confirmDateLabel}</span>. {t("leave.leaveAvailableAfter")}
            </p>
          </div>
        )}

        {/* Motivational quote */}
        <div className="rounded-2xl bg-brand px-5 py-4 shadow-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/60">Quote of the Day</p>
          <p className="text-sm font-medium leading-relaxed text-white">"{quote}"</p>
        </div>

        {/* Leave balances */}
        <div>
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-foreground/40">Leave Balance</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/employee/leave" className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-2xl font-bold text-brand">{annualAvail}</p>
              <p className="mt-0.5 text-xs text-foreground/50">{t("summary.annualLeft")}</p>
            </Link>
            <Link href="/employee/leave" className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-2xl font-bold text-brand">{sickAvail}</p>
              <p className="mt-0.5 text-xs text-foreground/50">{t("summary.sickLeft")}</p>
            </Link>
          </div>
        </div>

        {/* Payslip + announcements row */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/employee/payslips" className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xl font-bold text-brand">
              {netPay !== null ? `S$${netPay.toFixed(0)}` : "—"}
            </p>
            <p className="mt-0.5 text-xs text-foreground/50">
              {payslipLabel ? `Pay (${payslipLabel})` : t("summary.latestPayslip")}
            </p>
          </Link>
          <Link href="/employee/announcements" className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-2xl font-bold text-brand">{unreadCount}</p>
            <p className="mt-0.5 text-xs text-foreground/50">{t("summary.unreadAnnouncements")}</p>
          </Link>
        </div>

        {/* Latest announcements */}
        {announcements.length > 0 && (
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Latest Announcements</h2>
              <Link href="/employee/announcements" className="text-xs font-medium text-brand">
                View all
              </Link>
            </div>
            <ul className="space-y-3">
              {announcements.map((a) => (
                <li key={a.id} className="border-l-2 border-brand/30 pl-3">
                  <p className="text-sm font-semibold text-foreground">{a.title}</p>
                  <p className="mt-0.5 text-xs text-foreground/60 line-clamp-2">{a.body}</p>
                  <p className="mt-1 text-xs text-foreground/40">
                    {new Date(a.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Quick actions */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Quick Actions</h2>
          <div className="grid grid-cols-3 gap-3">
            <Link
              href="/employee/leave"
              className="flex flex-col items-center gap-1.5 rounded-xl bg-brand/5 px-2 py-3 text-center"
            >
              <span className="text-2xl">🏖️</span>
              <span className="text-xs font-medium text-foreground/70 leading-tight">Apply Leave</span>
            </Link>
            <Link
              href="/employee/payslips"
              className="flex flex-col items-center gap-1.5 rounded-xl bg-brand/5 px-2 py-3 text-center"
            >
              <span className="text-2xl">💰</span>
              <span className="text-xs font-medium text-foreground/70 leading-tight">Payslips</span>
            </Link>
            <Link
              href="/employee/documents"
              className="flex flex-col items-center gap-1.5 rounded-xl bg-brand/5 px-2 py-3 text-center"
            >
              <span className="text-2xl">📄</span>
              <span className="text-xs font-medium text-foreground/70 leading-tight">Documents</span>
            </Link>
            <Link
              href="/employee/announcements"
              className="flex flex-col items-center gap-1.5 rounded-xl bg-brand/5 px-2 py-3 text-center"
            >
              <span className="text-2xl">📢</span>
              <span className="text-xs font-medium text-foreground/70 leading-tight">Announcements</span>
            </Link>
            <Link
              href="/employee/profile"
              className="flex flex-col items-center gap-1.5 rounded-xl bg-brand/5 px-2 py-3 text-center"
            >
              <span className="text-2xl">👤</span>
              <span className="text-xs font-medium text-foreground/70 leading-tight">Profile</span>
            </Link>
            <Link
              href="/employee/notifications"
              className="flex flex-col items-center gap-1.5 rounded-xl bg-brand/5 px-2 py-3 text-center"
            >
              <span className="text-2xl">🔔</span>
              <span className="text-xs font-medium text-foreground/70 leading-tight">Notifications</span>
            </Link>
          </div>
        </div>

      </div>
    </main>
  );
}
