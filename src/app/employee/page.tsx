import { createClient } from "@/lib/supabase/server";
import {
  isOnProbation,
  getConfirmationDate,
  getAvailableAnnualLeave,
  getAvailableSickLeave,
} from "@/lib/leave/entitlement";
import { EmployeeDashboardClient } from "./dashboard-client";

export default async function EmployeeDashboardPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("employee_id, full_name")
    .eq("id", auth.user!.id)
    .maybeSingle();

  const employeeId = profile?.employee_id;
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const [employeeRes, payslipRes, announcementsRes, readsRes] = await Promise.all([
    employeeId
      ? supabase.from("employees").select("employment_start_date").eq("id", employeeId).maybeSingle()
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
  ]);

  const startDate = employeeRes.data?.employment_start_date ?? null;
  const onProbation = startDate ? isOnProbation(startDate, todayStr) : false;
  const confirmationDate = startDate ? getConfirmationDate(startDate) : null;
  const confirmDateLabel = confirmationDate
    ? confirmationDate.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    : null;

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
  const unreadCount = (announcementsRes.data ?? []).filter((a) => !readIds.has(a.id)).length;

  const payslipRun = payslip?.payroll_runs;
  const runData = payslipRun
    ? (Array.isArray(payslipRun) ? payslipRun[0] : payslipRun) as { month: number; year: number } | null
    : null;
  const payslipLabel = runData
    ? new Date(runData.year, runData.month - 1).toLocaleDateString(undefined, { month: "short", year: "numeric" })
    : null;

  const firstName = profile?.full_name?.split(" ")[0] ?? null;

  return (
    <EmployeeDashboardClient
      firstName={firstName}
      todayLabel={todayLabel}
      annualAvail={annualAvail}
      sickAvail={sickAvail}
      unreadCount={unreadCount}
      netPay={payslip ? Number(payslip.net_pay) : null}
      payslipLabel={payslipLabel}
      onProbation={onProbation}
      confirmDateLabel={confirmDateLabel}
      announcements={announcementsRes.data ?? []}
    />
  );
}
