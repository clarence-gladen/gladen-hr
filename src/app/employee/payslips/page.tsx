import { createClient } from "@/lib/supabase/server";
import { PayslipsClient } from "./payslips-client";

function ordinal(n: number): string {
  const v = n % 100;
  const suffix = v >= 11 && v <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th";
  return `${n}${suffix}`;
}

function payPeriodRange(month: number, year: number): string {
  const lastDay = new Date(year, month, 0).getDate();
  const monthName = new Date(year, month - 1).toLocaleDateString("en-SG", { month: "long" });
  return `${ordinal(1)} ${monthName} ${year} to ${ordinal(lastDay)} ${monthName} ${year}`;
}

export default async function EmployeePayslipsPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("employee_id")
    .eq("id", auth.user!.id)
    .maybeSingle();

  const employeeId = profile?.employee_id;

  const { data: raw } = employeeId
    ? await supabase
        .from("payslips")
        .select("id, net_pay, created_at, payroll_runs(month, year)")
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false })
    : { data: [] };

  const payslips = (raw ?? []).map((slip) => {
    const run = Array.isArray(slip.payroll_runs) ? slip.payroll_runs[0] : slip.payroll_runs;
    const label = run
      ? new Date(run.year, run.month - 1).toLocaleDateString("en-SG", { month: "long", year: "numeric" })
      : "—";
    const periodRange = run ? payPeriodRange(run.month, run.year) : null;
    return { id: slip.id, net_pay: Number(slip.net_pay), label, periodRange };
  });

  return <PayslipsClient payslips={payslips} />;
}
