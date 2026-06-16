import { createClient } from "@/lib/supabase/server";
import { LeaveClient } from "./leave-client";

export default async function EmployeeLeavePage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("employee_id")
    .eq("id", auth.user!.id)
    .maybeSingle();

  const employeeId = profile?.employee_id;
  const currentYear = new Date().getFullYear();

  const [balanceRes, requestsRes] = await Promise.all([
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
          .from("leave_requests")
          .select("id, leave_type, start_date, end_date, days, reason, status, created_at")
          .eq("employee_id", employeeId)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <LeaveClient
      balance={balanceRes.data ?? null}
      requests={requestsRes.data ?? []}
    />
  );
}
