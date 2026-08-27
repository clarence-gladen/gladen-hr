import { createClient } from "@/lib/supabase/server";
import {
  isOnProbation,
  getConfirmationDate,
  getAvailableAnnualLeave,
  getAvailableSickLeave,
} from "@/lib/leave/entitlement";
import { todaySG, todaySGPlusDays } from "@/lib/utils/date";
import { EmployeeDashboardClient } from "./dashboard-client";

const SG = "Asia/Singapore";

/** Hour of the day in Singapore, 0–23. */
function sgHour(now: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: SG, hour: "2-digit", hour12: false }).format(now)
  );
}

export default async function EmployeeDashboardPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("employee_id, full_name")
    .eq("id", auth.user!.id)
    .maybeSingle();

  const employeeId = profile?.employee_id;
  const todayStr = todaySG();

  // Pinned to Singapore: the server runs in UTC, so an unpinned format shows
  // the previous day between SGT midnight and 8am.
  const todayLabel = new Date().toLocaleDateString("en-GB", {
    timeZone: SG,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const hour = sgHour();
  const greetingKey =
    hour < 12 ? "dashboard.goodMorning" : hour < 18 ? "dashboard.goodAfternoon" : "dashboard.goodEvening";

  const in30DaysStr = todaySGPlusDays(30);

  const [employeeRes, payslipRes, announcementsRes, readsRes, upcomingLeavesRes] = await Promise.all([
    employeeId
      ? supabase
          .from("employees")
          .select("employment_start_date, feature_checkin, feature_checklist")
          .eq("id", employeeId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    employeeId
      ? supabase
          .from("payslips")
          .select("net_pay, payroll_runs(month, year)")
          .eq("employee_id", employeeId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("announcements")
      .select("id, title, body, created_at")
      .order("created_at", { ascending: false })
      .limit(2),
    employeeId
      ? supabase.from("announcement_reads").select("announcement_id").eq("employee_id", employeeId)
      : Promise.resolve({ data: [] }),
    employeeId
      ? supabase
          .from("leave_requests")
          .select("id, leave_type, start_date, end_date, days")
          .eq("employee_id", employeeId)
          .eq("status", "approved")
          .gte("end_date", todayStr)
          .lte("start_date", in30DaysStr)
          .order("start_date", { ascending: true })
          .limit(3)
      : Promise.resolve({ data: [] }),
  ]);

  const startDate = employeeRes.data?.employment_start_date ?? null;
  const onProbation = startDate ? isOnProbation(startDate, todayStr) : false;
  const confirmationDate = startDate ? getConfirmationDate(startDate) : null;
  const confirmDateLabel = confirmationDate
    ? confirmationDate.toLocaleDateString("en-GB", { timeZone: SG, day: "numeric", month: "short", year: "numeric" })
    : null;

  const featureCheckin = employeeRes.data?.feature_checkin ?? false;
  const featureChecklist = employeeRes.data?.feature_checklist ?? false;

  // Fetch current employment year's leave used amounts
  const balanceRes = employeeId && startDate
    ? await supabase
        .from("leave_balances")
        .select("annual_used, sick_used")
        .eq("employee_id", employeeId)
        .lte("year_start", todayStr)
        .gte("year_end", todayStr)
        .maybeSingle()
    : { data: null };

  const balance = balanceRes.data;

  // Where the employee is working today, and whether they are currently on
  // site — so the dashboard can name the site and offer the right action
  // rather than a generic "Check in / out". Only queried when the feature is on.
  let checkinSiteLabel: string | null = null;
  let checkedIn = false;

  if (employeeId && featureCheckin) {
    const [assignmentsRes, eventsRes] = await Promise.all([
      supabase
        .from("contract_assignments")
        .select("contract_id, contracts(client_name, site_name)")
        .eq("employee_id", employeeId)
        .lte("assigned_from", todayStr)
        .or(`assigned_to.is.null,assigned_to.gte.${todayStr}`),
      supabase
        .from("attendance_events")
        .select("event_type, occurred_at")
        .eq("employee_id", employeeId)
        .eq("status", "accepted")
        // +08:00 pins the bound to SGT midnight; a naive timestamp is read as
        // UTC and would hide every event made before 8am local time.
        .gte("occurred_at", `${todayStr}T00:00:00+08:00`)
        .order("occurred_at", { ascending: false })
        .limit(1),
    ]);

    const assignments = assignmentsRes.data ?? [];
    if (assignments.length === 1) {
      const c = Array.isArray(assignments[0].contracts)
        ? assignments[0].contracts[0]
        : assignments[0].contracts;
      checkinSiteLabel = c?.site_name || c?.client_name || null;
    }

    checkedIn = (eventsRes.data ?? [])[0]?.event_type === "check_in";
  }

  const annualEntitlement = startDate ? getAvailableAnnualLeave(startDate, todayStr) : 0;
  const sickEntitlement = startDate ? getAvailableSickLeave(startDate, todayStr) : 0;

  const annualAvail = onProbation || !balance
    ? 0
    : Math.max(0, annualEntitlement - Number(balance.annual_used));
  const sickAvail = onProbation || !balance
    ? 0
    : Math.max(0, sickEntitlement - Number(balance.sick_used));

  const payslip = payslipRes.data;
  const readIds = new Set((readsRes.data ?? []).map((r) => r.announcement_id));
  const announcements = (announcementsRes.data ?? []).map((a) => ({
    ...a,
    unread: !readIds.has(a.id),
  }));
  const unreadCount = announcements.filter((a) => a.unread).length;

  const payslipRun = payslip?.payroll_runs;
  const runData = payslipRun
    ? (Array.isArray(payslipRun) ? payslipRun[0] : payslipRun) as { month: number; year: number } | null
    : null;
  const payslipLabel = runData
    ? new Date(runData.year, runData.month - 1).toLocaleDateString("en-GB", { month: "short", year: "numeric" })
    : null;

  const firstName = profile?.full_name?.split(" ")[0] ?? null;
  const upcomingLeaves = (upcomingLeavesRes.data ?? []) as Array<{
    id: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    days: number;
  }>;

  return (
    <EmployeeDashboardClient
      firstName={firstName}
      greetingKey={greetingKey}
      todayLabel={todayLabel}
      annualAvail={annualAvail}
      sickAvail={sickAvail}
      unreadCount={unreadCount}
      netPay={payslip ? Number(payslip.net_pay) : null}
      payslipLabel={payslipLabel}
      onProbation={onProbation}
      confirmDateLabel={confirmDateLabel}
      announcements={announcements}
      upcomingLeaves={upcomingLeaves}
      featureCheckin={featureCheckin}
      featureChecklist={featureChecklist}
      checkinSiteLabel={checkinSiteLabel}
      checkedIn={checkedIn}
    />
  );
}
