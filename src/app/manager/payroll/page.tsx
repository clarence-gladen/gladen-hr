import { createClient } from "@/lib/supabase/server";
import { PayrollRunsClient } from "./payroll-runs-client";

export default async function ManagerPayrollPage() {
  const supabase = await createClient();

  const [runsRes, totalsRes] = await Promise.all([
    supabase
      .from("payroll_runs")
      .select("id, month, year, status")
      .order("year", { ascending: false })
      .order("month", { ascending: false }),
    supabase.from("payslips").select("payroll_run_id, net_pay"),
  ]);

  const netPayByRun: Record<string, number> = {};
  for (const row of totalsRes.data ?? []) {
    netPayByRun[row.payroll_run_id] =
      (netPayByRun[row.payroll_run_id] ?? 0) + Number(row.net_pay);
  }

  const runs = (runsRes.data ?? []).map((r) => ({
    ...r,
    totalNetPay: netPayByRun[r.id] ?? null,
  }));

  return <PayrollRunsClient runs={runs} />;
}
