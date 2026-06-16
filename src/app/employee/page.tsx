import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/header";

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

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const [balanceRes, payslipRes, announcementsRes, readsRes] = await Promise.all([
    employeeId
      ? supabase
          .from("leave_balances")
          .select(
            "annual_entitlement, annual_used, sick_entitlement, sick_used, hospitalization_entitlement, hospitalization_used"
          )
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
    supabase
      .from("announcements")
      .select("id")
      .order("created_at", { ascending: false }),
    employeeId
      ? supabase
          .from("announcement_reads")
          .select("announcement_id")
          .eq("employee_id", employeeId)
      : Promise.resolve({ data: [] }),
  ]);

  const balance = balanceRes.data;
  const payslip = payslipRes.data;
  const readIds = new Set((readsRes.data ?? []).map((r) => r.announcement_id));
  const unreadCount = (announcementsRes.data ?? []).filter((a) => !readIds.has(a.id)).length;

  const annualAvail = balance
    ? Math.max(0, balance.annual_entitlement - balance.annual_used)
    : null;

  const payslipRun = payslip?.payroll_runs;
  const runData = payslipRun
    ? (Array.isArray(payslipRun) ? payslipRun[0] : payslipRun) as { month: number; year: number } | null
    : null;
  const payslipLabel = runData
    ? new Date(runData.year, runData.month - 1).toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <>
      <Header titleKey="dashboard.employeeTitle" />
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
            <p className="text-base font-semibold text-foreground">
              {profile?.full_name ? `Hi, ${profile.full_name.split(" ")[0]}` : "Welcome"}
            </p>
            <p className="text-sm text-foreground/60">{today}</p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-2xl font-semibold text-brand">
              {annualAvail !== null ? `${annualAvail}` : "—"}
            </p>
            <p className="mt-1 text-sm text-foreground/60">Annual Leave Left</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-2xl font-semibold text-brand">
              {balance !== null ? `${Math.max(0, balance.sick_entitlement - balance.sick_used)}` : "—"}
            </p>
            <p className="mt-1 text-sm text-foreground/60">Sick Leave Left</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-2xl font-semibold text-brand">
              {unreadCount}
            </p>
            <p className="mt-1 text-sm text-foreground/60">Unread Announcements</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-2xl font-semibold text-brand">
              {payslip ? `S$${Number(payslip.net_pay).toFixed(2)}` : "—"}
            </p>
            <p className="mt-1 text-sm text-foreground/60">
              {payslipLabel ? `Last Pay (${payslipLabel})` : "Latest Payslip"}
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
