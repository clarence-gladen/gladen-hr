"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/language-provider";
import type { LeaveType } from "@/lib/types/database";

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
  const todayLabel = today.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const quote = QUOTES[today.getDate() % QUOTES.length];

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

  const sickToday = onLeaveToday.filter((e) => e.leave_type !== "annual");

  const quickLinks = [
    { label: t("nav.employees"), href: "/manager/employees", icon: "👥" },
    { label: t("nav.leave"), href: "/manager/leave", icon: "📅" },
    { label: t("nav.payroll"), href: "/manager/payroll", icon: "💰" },
    { label: t("nav.announcements"), href: "/manager/announcements", icon: "📢" },
    { label: t("more.salaryAdvances"), href: "/manager/salary-advances", icon: "💳" },
    { label: t("more.documents"), href: "/manager/documents", icon: "📄" },
  ];

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

        {/* Motivational quote */}
        <div className="rounded-2xl bg-brand px-5 py-4 shadow-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/60">Quote of the Day</p>
          <p className="text-sm font-medium leading-relaxed text-white">"{quote}"</p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/manager/employees" className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-2xl font-bold text-brand">{totalEmployees}</p>
            <p className="mt-0.5 text-xs text-foreground/50">{t("summary.totalEmployees")}</p>
          </Link>
          <Link href="/manager/leave" className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-2xl font-bold text-brand">{onLeaveToday.length}</p>
            <p className="mt-0.5 text-xs text-foreground/50">{t("summary.onLeaveToday")}</p>
          </Link>
          <Link href="/manager/leave" className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-2xl font-bold text-amber-500">{pendingApprovals}</p>
            <p className="mt-0.5 text-xs text-foreground/50">{t("summary.pendingApprovals")}</p>
          </Link>
          <Link href="/manager/more/documents" className="rounded-2xl bg-white p-4 shadow-sm">
            <p className={`text-2xl font-bold ${expiringDocuments > 0 ? "text-red-500" : "text-brand"}`}>
              {expiringDocuments}
            </p>
            <p className="mt-0.5 text-xs text-foreground/50">{t("summary.expiringDocuments")}</p>
          </Link>
        </div>

        {/* On Leave Today */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">{t("dashboard.onLeaveToday")}</h2>
            <Link href="/manager/leave" className="text-xs font-medium text-brand">
              {t("dashboard.viewLeaveCalendar")}
            </Link>
          </div>
          {onLeaveToday.length === 0 ? (
            <p className="text-sm text-foreground/50">{t("dashboard.noOneOnLeaveToday")}</p>
          ) : (
            <ul className="divide-y divide-black/5">
              {onLeaveToday.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="font-medium text-foreground">{entry.full_name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${leaveTypeClass[entry.leave_type]}`}>
                    {leaveTypeLabel[entry.leave_type]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Sick leave alert */}
        {sickToday.length > 0 && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
            <p className="mb-2 text-sm font-semibold text-amber-700">{t("dashboard.sickLeaveToday")}</p>
            <ul className="space-y-1">
              {sickToday.map((entry) => (
                <li key={entry.id} className="text-sm text-amber-800">
                  {entry.full_name} · {leaveTypeLabel[entry.leave_type]}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Latest announcements */}
        {announcements.length > 0 && (
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Latest Announcements</h2>
              <Link href="/manager/more/announcements" className="text-xs font-medium text-brand">
                View all
              </Link>
            </div>
            <ul className="space-y-3">
              {announcements.map((a) => (
                <li key={a.id}>
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

        {/* Quick links */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Quick Access</h2>
          <div className="grid grid-cols-3 gap-3">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex flex-col items-center gap-1.5 rounded-xl bg-gray-50 px-2 py-3 text-center hover:bg-brand/5"
              >
                <span className="text-2xl">{link.icon}</span>
                <span className="text-xs font-medium text-foreground/70 leading-tight">{link.label}</span>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </main>
  );
}
