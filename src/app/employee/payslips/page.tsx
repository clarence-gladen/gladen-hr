import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/header";

export default async function EmployeePayslipsPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("employee_id")
    .eq("id", auth.user!.id)
    .maybeSingle();

  const employeeId = profile?.employee_id;

  const { data: payslips } = employeeId
    ? await supabase
        .from("payslips")
        .select("id, net_pay, created_at, payroll_runs(month, year)")
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <>
      <Header titleKey="payslips.title" />
      <main className="flex-1 px-4 py-6">
        {!payslips || payslips.length === 0 ? (
          <p className="text-center text-sm text-foreground/60">No payslips yet.</p>
        ) : (
          <ul className="space-y-3">
            {payslips.map((slip) => {
              const run = Array.isArray(slip.payroll_runs) ? slip.payroll_runs[0] : slip.payroll_runs;
              const label = run
                ? new Date(run.year, run.month - 1).toLocaleDateString(undefined, {
                    month: "long",
                    year: "numeric",
                  })
                : "—";
              return (
                <li key={slip.id}>
                  <Link
                    href={`/employee/payslips/${slip.id}`}
                    className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm"
                  >
                    <div>
                      <p className="font-semibold text-foreground">{label}</p>
                      <p className="mt-1 text-sm text-foreground/60">
                        Net Pay: S${Number(slip.net_pay).toFixed(2)}
                      </p>
                    </div>
                    <span className="text-foreground/40">›</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
