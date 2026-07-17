import { createClient } from "@/lib/supabase/server";
import {
  getConfirmationDate,
  getAvailableAnnualLeave,
  getAvailableSickLeave,
  getAvailableHospitalizationLeave,
  isOnProbation,
} from "@/lib/leave/entitlement";
import {
  ensureLeaveBalances,
  getCurrentLeaveUsed,
  getLeaveHistory,
} from "@/lib/leave/balances";
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

  const { data: emp } = employeeId
    ? await supabase
        .from("employees")
        .select("employment_start_date")
        .eq("id", employeeId)
        .maybeSingle()
    : { data: null };

  const startDate = emp?.employment_start_date ?? null;
  const todayStr = new Date().toISOString().slice(0, 10);

  // Ensure balance rows exist for all employment years up to today
  if (employeeId && startDate) {
    await ensureLeaveBalances(supabase, employeeId, startDate);
  }

  const [usedRes, requestsRes, historyRes] = await Promise.all([
    employeeId && startDate
      ? getCurrentLeaveUsed(supabase, employeeId, todayStr)
      : Promise.resolve(null),
    employeeId
      ? supabase
          .from("leave_requests")
          .select("id, leave_type, start_date, end_date, days, reason, status, created_at")
          .eq("employee_id", employeeId)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    employeeId && startDate
      ? getLeaveHistory(supabase, employeeId, startDate, 3)
      : Promise.resolve([]),
  ]);

  const onProbation = startDate ? isOnProbation(startDate, todayStr) : false;

  const confirmationDate = startDate ? getConfirmationDate(startDate) : null;
  const confirmDateLabel = confirmationDate
    ? confirmationDate.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  // Build balance with computed entitlements
  const balance =
    !onProbation && startDate && usedRes
      ? {
          annual_entitlement: getAvailableAnnualLeave(startDate, todayStr),
          annual_used: usedRes.annual_used,
          sick_entitlement: getAvailableSickLeave(startDate, todayStr),
          sick_used: usedRes.sick_used,
          hospitalization_entitlement: getAvailableHospitalizationLeave(startDate, todayStr),
          hospitalization_used: usedRes.hospitalization_used,
        }
      : null;

  const requests = Array.isArray(requestsRes)
    ? requestsRes
    : (requestsRes as { data: unknown[] }).data ?? [];

  // Sort by nearest date to today first: upcoming requests soonest-first,
  // then past requests most-recent-first.
  const sortedRequests = [...(requests as { start_date: string }[])].sort((a, b) => {
    const aUpcoming = a.start_date >= todayStr;
    const bUpcoming = b.start_date >= todayStr;
    if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
    return aUpcoming
      ? a.start_date.localeCompare(b.start_date)
      : b.start_date.localeCompare(a.start_date);
  });

  return (
    <LeaveClient
      balance={balance}
      requests={sortedRequests as Parameters<typeof LeaveClient>[0]["requests"]}
      onProbation={onProbation}
      confirmDateLabel={confirmDateLabel}
      leaveHistory={Array.isArray(historyRes) ? historyRes : []}
    />
  );
}
