import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/header";
import { getConfirmationDate } from "@/lib/leave/entitlement";

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
      ? supabase
          .from("employees")
          .select("employment_start_date")
          .eq("id", employeeId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    employeeId
      ? supabase
          .from("leave_balances")
          .select(
            "annual_entitlement, annual_used, sick_entitlement, sick_used"
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
    supabase.from("announcements").select("id"),
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
            <p className="text-sm text-foreground/60">{todayLabel}</p>
          </div>
        </div>

        {onProbation && confirmDateLabel && (
          <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
            You are on probation until <span className="font-semibold">{confirmDateLabel}</span>. Leave entitlements will be available after confirmation.
          </div>
        )}

        <div className="mb-6 grid grid-cols-2 gap-4">
          <Link href="/employee/leave/annual" className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-2xl font-semibold text-brand">{annualAvail}</p>
            <p className="mt-1 text-sm text-foreground/60">Annual Leave Left</p>
          </Link>

          <Link href="/employee/leave/sick" className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-2xl font-semibold text-brand">{sickAvail}</p>
            <p className="mt-1 text-sm text-foreground/60">Sick Leave Left</p>
          </Link>

          <Link href="/employee/announcements" className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-2xl font-semibold text-brand">{unreadCount}</p>
            <p className="mt-1 text-sm text-foreground/60">Unread Announcements</p>
          </Link>

          <Link href="/employee/payslips" className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-2xl font-semibold text-brand">
              {payslip ? `S$${Number(payslip.net_pay).toFixed(2)}` : "—"}
            </p>
            <p className="mt-1 text-sm text-foreground/60">
              {payslipLabel ? `Last Pay (${payslipLabel})` : "Latest Payslip"}
            </p>
          </Link>
        </div>
      </main>
    </>
  );
}
