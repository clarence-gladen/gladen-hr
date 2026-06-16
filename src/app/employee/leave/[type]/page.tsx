import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getConfirmationDate } from "@/lib/leave/entitlement";
import { LeaveHistoryClient } from "./leave-history-client";
import type { LeaveType } from "@/lib/types/database";

const VALID_TYPES: LeaveType[] = ["annual", "sick", "hospitalization"];

export default async function LeaveTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  if (!VALID_TYPES.includes(type as LeaveType)) notFound();
  const leaveType = type as LeaveType;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("employee_id")
    .eq("id", auth.user!.id)
    .maybeSingle();

  const employeeId = profile?.employee_id;
  if (!employeeId) notFound();

  const [employeeRes, balancesRes, requestsRes] = await Promise.all([
    supabase
      .from("employees")
      .select("employment_start_date")
      .eq("id", employeeId)
      .maybeSingle(),
    supabase
      .from("leave_balances")
      .select("year, annual_entitlement, annual_used, sick_entitlement, sick_used, hospitalization_entitlement, hospitalization_used")
      .eq("employee_id", employeeId)
      .order("year", { ascending: false }),
    supabase
      .from("leave_requests")
      .select("id, leave_type, start_date, end_date, days, reason, status")
      .eq("employee_id", employeeId)
      .eq("leave_type", leaveType)
      .order("start_date", { ascending: false }),
  ]);

  const startDate = employeeRes.data?.employment_start_date ?? null;
  const todayStr = new Date().toISOString().slice(0, 10);
  const confirmationDate = startDate ? getConfirmationDate(startDate) : null;
  const onProbation = confirmationDate ? todayStr < confirmationDate.toISOString().slice(0, 10) : false;
  const confirmDateLabel = confirmationDate
    ? confirmationDate.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    : null;

  const balancesByYear = (balancesRes.data ?? []).map((b) => {
    let entitlement = 0;
    let used = 0;
    if (leaveType === "annual") { entitlement = b.annual_entitlement; used = b.annual_used; }
    else if (leaveType === "sick") { entitlement = b.sick_entitlement; used = b.sick_used; }
    else { entitlement = b.hospitalization_entitlement; used = b.hospitalization_used; }
    return { year: b.year, entitlement, used };
  });

  return (
    <LeaveHistoryClient
      leaveType={leaveType}
      balancesByYear={balancesByYear}
      allRequests={requestsRes.data ?? []}
      onProbation={onProbation}
      confirmDateLabel={confirmDateLabel}
    />
  );
}
