import { createClient } from "@/lib/supabase/server";
import { PayrollRunsClient } from "./payroll-runs-client";

export default async function ManagerPayrollPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("payroll_runs")
    .select("id, month, year, status")
    .order("year", { ascending: false })
    .order("month", { ascending: false });

  return <PayrollRunsClient runs={data ?? []} />;
}
