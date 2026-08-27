"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/language-provider";
import type { LeaveType } from "@/lib/types/database";
import { NotificationBell } from "@/components/notification-bell";
import { LanguageToggle } from "@/components/language-toggle";
import { createClient } from "@/lib/supabase/client";

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

/** One figure and its label. Turns amber when it is something to act on. */
function Stat({
  href,
  value,
  label,
  attention = false,
}: {
  href: string;
  value: number;
  label: string;
  attention?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`g-card px-3.5 py-3 ${attention ? "border-attention-line bg-attention-surface" : ""}`}
    >
      <p
        className={`g-num text-[27px] font-semibold leading-none ${
          attention ? "text-attention" : "text-brand"
        }`}
      >
        {value}
      </p>
      <p className={`mt-1.5 text-[12.5px] font-medium ${attention ? "text-attention" : "text-muted"}`}>
        {label}
      </p>
    </Link>
  );
}

export function DashboardClient({
  firstName,
  greetingKey,
  todayLabel,
  totalEmployees,
  onLeaveToday,
  pendingApprovals,
  announcements,
  anniversaryCount,
}: {
  firstName: string | null;
  greetingKey: string;
  todayLabel: string;
  totalEmployees: number;
  onLeaveToday: OnLeaveEntry[];
  pendingApprovals: number;
  announcements: Announcement[];
  anniversaryCount: number;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const supabase = createClient();
  const quote = QUOTES[new Date().getDate() % QUOTES.length];

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const leaveTypeLabel: Record<LeaveType, string> = {
    annual: t("leave.annual"),
    sick: t("leave.sick"),
    hospitalization: t("leave.hospitalization"),
    no_pay: t("leave.noPay"),
    off_day: t("leave.offDay"),
  };
  // Restricted to the app's own palette — a stray purple and grey were the only
  // place those hues appeared anywhere in the product.
  const leaveTypeDot: Record<LeaveType, string> = {
    annual: "bg-brand",
    sick: "bg-attention",
    hospitalization: "bg-attention",
    no_pay: "bg-muted",
    off_day: "bg-brand-light",
  };

  const greeting = firstName ? `${t(greetingKey)}, ${firstName}` : t(greetingKey);

  return (
    <div className="flex flex-col">
      {/* Header — identical structure to inner <Header>: sticky top-0 z-10 bg-brand */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between border-b border-black/5 bg-brand px-4 pb-3 text-white"
        style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top))" }}
      >
        <div className="relative h-7 w-28">
          <Image src="/images/logo-white-full.png" alt="Gladen" fill className="object-contain object-left" priority />
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell href="/manager/notifications" />
          <LanguageToggle variant="light" />
          <button
            type="button"
            onClick={handleSignOut}
            className="text-sm font-medium text-white/90"
          >
            {t("common.signOut")}
          </button>
        </div>
      </div>

      {/* Page content */}
      <div className="flex flex-col gap-4 px-4 py-4">

        {/* Greeting — a plain heading, not a card. */}
        <div>
          <h1 className="text-xl font-semibold leading-tight tracking-[-0.02em]">{greeting}</h1>
          <p className="mt-0.5 text-sm text-muted">{todayLabel}</p>
        </div>

        {/* The one thing a manager opens this app to do. Only shown when there
            is actually something waiting. */}
        {pendingApprovals > 0 && (
          <Link
            href="/manager/leave"
            className="flex items-center justify-between gap-3 rounded-[0.625rem] bg-brand px-4 py-4 text-white"
          >
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.09em] text-white/75">
                {t("leave.needsDecision")}
              </span>
              <span className="mt-0.5 block text-[17px] font-semibold tracking-[-0.01em]">
                {pendingApprovals === 1
                  ? t("dashboard.pendingHeroOne")
                  : t("dashboard.pendingHeroMany", { n: pendingApprovals })}
              </span>
            </span>
            <span aria-hidden className="text-lg">→</span>
          </Link>
        )}

        {/* Today at a glance */}
        <div>
          <p className="g-label mb-2">{t("dashboard.today")}</p>
          <div className="grid grid-cols-2 gap-2.5">
            <Stat href="/manager/employees" value={totalEmployees} label={t("summary.totalEmployees")} />
            <Stat href="/manager/leave" value={onLeaveToday.length} label={t("summary.onLeaveToday")} />
            <Stat
              href="/manager/leave"
              value={pendingApprovals}
              label={t("summary.pendingApprovals")}
              attention={pendingApprovals > 0}
            />
            <Stat
              href="/manager/anniversaries"
              value={anniversaryCount}
              label={t("dashboard.anniversaries")}
              attention={anniversaryCount > 0}
            />
          </div>
        </div>

        {/* On leave today */}
        <div className="g-panel">
          <div className="g-panel-head">
            <p className="text-[13.5px] font-semibold">{t("dashboard.onLeaveToday")}</p>
            <Link href="/manager/leave" className="text-[13px] font-semibold text-brand">
              {t("dashboard.viewAll")}
            </Link>
          </div>
          {onLeaveToday.length === 0 ? (
            <p className="px-3.5 py-3.5 text-[13px] text-muted">{t("dashboard.noOneOnLeaveToday")}</p>
          ) : (
            <ul>
              {onLeaveToday.slice(0, 3).map((entry) => (
                <li key={entry.id} className="g-row">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${leaveTypeDot[entry.leave_type]}`} />
                    <span className="truncate text-sm font-medium">{entry.full_name}</span>
                  </span>
                  <span className="text-[12.5px] text-muted">{leaveTypeLabel[entry.leave_type]}</span>
                </li>
              ))}
              {onLeaveToday.length > 3 && (
                <li className="g-row text-[12.5px] text-muted">
                  {t("dashboard.moreCount", { n: onLeaveToday.length - 3 })}
                </li>
              )}
            </ul>
          )}
        </div>

        {/* Latest announcements */}
        {announcements.length > 0 && (
          <div className="g-panel">
            <div className="g-panel-head">
              <p className="text-[13.5px] font-semibold">{t("dashboard.announcements")}</p>
              <Link href="/manager/announcements" className="text-[13px] font-semibold text-brand">
                {t("dashboard.viewAll")}
              </Link>
            </div>
            <ul>
              {announcements.map((a) => (
                <li key={a.id} className="g-row">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-muted">{a.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Quote — deliberately the quietest thing on the page. */}
        <div className="border-l-2 border-line pl-3">
          <p className="g-label">{t("dashboard.quoteOfTheDay")}</p>
          <p className="mt-1 text-[13px] italic leading-relaxed text-muted">{quote}</p>
        </div>

      </div>
    </div>
  );
}
