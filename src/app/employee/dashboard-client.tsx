"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/language-provider";
import { NotificationBell } from "@/components/notification-bell";
import { LanguageToggle } from "@/components/language-toggle";
import { createClient } from "@/lib/supabase/client";
import type { LeaveType } from "@/lib/types/database";
import { fmtDateRange } from "@/lib/utils/date";

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
  unread?: boolean;
}

interface UpcomingLeave {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
}

export interface DashboardProps {
  firstName: string | null;
  greetingKey: string;
  todayLabel: string;
  annualAvail: number;
  sickAvail: number;
  unreadCount: number;
  netPay: number | null;
  payslipLabel: string | null;
  onProbation: boolean;
  confirmDateLabel: string | null;
  announcements: Announcement[];
  upcomingLeaves: UpcomingLeave[];
  featureCheckin: boolean;
  featureChecklist: boolean;
  checkinSiteLabel: string | null;
  checkedIn: boolean;
}

/** One figure and its label. Turns amber when it is something to act on. */
function Stat({
  href,
  value,
  label,
  attention = false,
  small = false,
}: {
  href: string;
  value: string;
  label: string;
  attention?: boolean;
  small?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`g-card px-3.5 py-3 ${attention ? "border-attention-line bg-attention-surface" : ""}`}
    >
      <p
        className={`g-num font-semibold leading-none ${small ? "text-[22px]" : "text-[27px]"} ${
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

export function EmployeeDashboardClient({
  firstName,
  greetingKey,
  todayLabel,
  annualAvail,
  sickAvail,
  unreadCount,
  netPay,
  payslipLabel,
  onProbation,
  confirmDateLabel,
  announcements,
  upcomingLeaves,
  featureCheckin,
  featureChecklist,
  checkinSiteLabel,
  checkedIn,
}: DashboardProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const supabase = createClient();
  const quote = QUOTES[new Date().getDate() % QUOTES.length];

  const leaveTypeLabel: Record<LeaveType, string> = {
    annual: t("leave.annual"),
    sick: t("leave.sick"),
    hospitalization: t("leave.hospitalization"),
    no_pay: t("leave.noPay"),
    off_day: t("leave.offDay"),
  };

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

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
          <NotificationBell href="/employee/notifications" />
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

        {/* Greeting — a plain heading, not a card. Nothing here is tappable, so
            it should not look like the surfaces that are. */}
        <div>
          <h1 className="text-xl font-semibold leading-tight tracking-[-0.02em]">{greeting}</h1>
          <p className="mt-0.5 text-sm text-muted">{todayLabel}</p>
        </div>

        {/* Site features (trial-gated).
            Check-in is the reason a cleaner opens this app, so it is the one
            filled, full-width action; the checklist follows it as a step. */}
        {featureCheckin && (
          <Link
            href="/employee/checkin"
            className="flex items-center justify-between gap-3 rounded-[0.625rem] bg-brand px-4 py-4 text-white"
          >
            <span className="min-w-0">
              {checkinSiteLabel && (
                <span className="block truncate text-[11px] font-semibold uppercase tracking-[0.09em] text-white/75">
                  {checkinSiteLabel}
                </span>
              )}
              <span className="mt-0.5 block text-[17px] font-semibold tracking-[-0.01em]">
                {checkedIn ? t("dashboard.checkOutToEnd") : t("dashboard.checkInToStart")}
              </span>
            </span>
            <span aria-hidden className="text-lg">→</span>
          </Link>
        )}
        {featureChecklist && (
          <Link
            href="/employee/checklist"
            className="g-card flex items-center justify-between px-4 py-3.5 text-[14.5px] font-medium"
          >
            <span>✅ &nbsp;{t("dashboard.cleaningChecklist")}</span>
            <span aria-hidden className="text-brand">→</span>
          </Link>
        )}

        {/* Probation notice */}
        {onProbation && confirmDateLabel && (
          <div className="rounded-[0.625rem] border border-attention-line bg-attention-surface px-3.5 py-3">
            <p className="text-[13px] leading-relaxed text-attention">
              {t("leave.probationUntil")} <span className="font-semibold">{confirmDateLabel}</span>.{" "}
              {t("leave.leaveAvailableAfter")}
            </p>
          </div>
        )}

        {/* Balances */}
        <div>
          <p className="g-label mb-2">{t("dashboard.yourBalances")}</p>
          <div className="grid grid-cols-2 gap-2.5">
            <Stat href="/employee/leave" value={String(annualAvail)} label={t("summary.annualLeft")} />
            <Stat href="/employee/leave" value={String(sickAvail)} label={t("summary.sickLeft")} />
            <Stat
              href="/employee/payslips"
              small
              value={netPay !== null ? `S$${Math.round(netPay).toLocaleString("en-SG")}` : "—"}
              label={payslipLabel ? `${t("nav.payslips")} · ${payslipLabel}` : t("summary.latestPayslip")}
            />
            <Stat
              href="/employee/announcements"
              value={String(unreadCount)}
              label={t("summary.unreadAnnouncements")}
              attention={unreadCount > 0}
            />
          </div>
        </div>

        {/* Upcoming approved leave */}
        {upcomingLeaves.length > 0 && (
          <div className="g-panel">
            <div className="g-panel-head">
              <p className="text-[13.5px] font-semibold">{t("dashboard.upcomingLeave")}</p>
              <Link href="/employee/leave" className="text-[13px] font-semibold text-brand">
                {t("dashboard.viewAll")}
              </Link>
            </div>
            <ul>
              {upcomingLeaves.map((l) => (
                <li key={l.id} className="g-row">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {leaveTypeLabel[l.leave_type as LeaveType] ?? l.leave_type}
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-muted">
                      {fmtDateRange(l.start_date, l.end_date)}
                    </p>
                  </div>
                  <span className="g-pill g-pill-brand">
                    {l.days} {t(l.days === 1 ? "leave.day" : "leave.days")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Latest announcements */}
        {announcements.length > 0 && (
          <div className="g-panel">
            <div className="g-panel-head">
              <p className="text-[13.5px] font-semibold">{t("dashboard.announcements")}</p>
              <Link href="/employee/announcements" className="text-[13px] font-semibold text-brand">
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
                  {a.unread && <span className="g-pill g-pill-attention">{t("dashboard.newBadge")}</span>}
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
