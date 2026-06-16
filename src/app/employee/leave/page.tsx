import { createClient } from "@/lib/supabase/server";
import { getConfirmationDate } from "@/lib/leave/entitlement";
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

  const [employeeRes, balanceRes, requestsRes] = await Promise.all([
    employeeId
      ? supabase.from("employees").select("employment_start_date").eq("id", employeeId).maybeSingle()
      : Promise.resolve({ data: null }),
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

  const startDate = employeeRes.data?.employment_start_date ?? null;
  const todayStr = new Date().toISOString().slice(0, 10);
  const confirmationDate = startDate ? getConfirmationDate(startDate) : null;
  const onProbation = confirmationDate ? todayStr < confirmationDate.toISOString().slice(0, 10) : false;
  const confirmDateLabel = confirmationDate
    ? confirmationDate.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <LeaveClient
      balance={onProbation ? null : (balanceRes.data ?? null)}
      requests={requestsRes.data ?? []}
      onProbation={onProbation}
      confirmDateLabel={confirmDateLabel}
    />
  );
}
