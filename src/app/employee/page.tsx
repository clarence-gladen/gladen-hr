import { createClient } from "@/lib/supabase/server";
import { getConfirmationDate } from "@/lib/leave/entitlement";
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
  const currentYear = new Date().getFullYear();
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const [employeeRes, balanceRes, payslipRes, announcementsRes, readsRes] = await Promise.all([
    employeeId
      ? supabase.from("employees").select("employment_start_date").eq("id", employeeId).maybeSingle()
      : Promise.resolve({ data: null }),
    employeeId
      ? supabase
          .from("leave_balances")
          .select("annual_entitlement, annual_used, sick_entitlement, sick_used")
          .eq("employee_id", employeeId)
          .eq("year", currentYear)
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
    supabase.from("announcements").select("id"),
    employeeId
      ? supabase.from("announcement_reads").select("announcement_id").eq("employee_id", employeeId)
      : Promise.resolve({ data: [] }),
  ]);

  const balance = balanceRes.data;
  const payslip = payslipRes.data;
  const readIds = new Set((readsRes.data ?? []).map((r) => r.announcement_id));
  const unreadCount = (announcementsRes.data ?? []).filter((a) => !readIds.has(a.id)).length;

  const startDate = employeeRes.data?.employment_start_date ?? null;
  const confirmationDate = startDate ? getConfirmationDate(startDate) : null;
  const onProbation = confirmationDate ? todayStr < confirmationDate.toISOString().slice(0, 10) : false;
  const confirmDateLabel = confirmationDate
    ? confirmationDate.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    : null;

  const annualAvail = onProbation || !balance ? 0 : Math.max(0, balance.annual_entitlement - balance.annual_used);
  const sickAvail = onProbation || !balance ? 0 : Math.max(0, balance.sick_entitlement - balance.sick_used);

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
    />
  );
}
