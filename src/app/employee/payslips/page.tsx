import { createClient } from "@/lib/supabase/server";
import { PayslipsClient } from "./payslips-client";

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
        .select("id, net_pay, payroll_runs(month, year)")
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false })
    : { data: [] };

  const payslips = (raw ?? []).map((slip) => {
    const run = Array.isArray(slip.payroll_runs) ? slip.payroll_runs[0] : slip.payroll_runs;
    return {
      id: slip.id,
      net_pay: Number(slip.net_pay),
      month: run?.month ?? null,
      year: run?.year ?? null,
    };
  });

  return <PayslipsClient payslips={payslips} />;
}
