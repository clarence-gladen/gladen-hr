import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  isOnProbation,
  getConfirmationDate,
  getAnnualLeaveForYear,
  SICK_LEAVE_PER_YEAR,
  HOSPITALIZATION_PER_YEAR,
} from "@/lib/leave/entitlement";
import { ensureLeaveBalances } from "@/lib/leave/balances";
import { LeaveHistoryClient } from "./leave-history-client";
import type { LeaveType } from "@/lib/types/database";

const VALID_TYPES: LeaveType[] = ["annual", "sick", "hospitalization", "no_pay"];

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

  const { data: emp } = await supabase
    .from("employees")
    .select("employment_start_date")
    .eq("id", employeeId)
    .maybeSingle();

  const startDate = emp?.employment_start_date ?? null;
  const todayStr = new Date().toISOString().slice(0, 10);

  if (startDate) {
    await ensureLeaveBalances(supabase, employeeId, startDate);
  }

  const [balancesRes, requestsRes] = await Promise.all([
    supabase
      .from("leave_balances")
      .select("employment_year, year_start, year_end, annual_used, sick_used, hospitalization_used")
      .eq("employee_id", employeeId)
      .order("year_start", { ascending: false }),
    supabase
      .from("leave_requests")
      .select("id, leave_type, start_date, end_date, days, reason, status")
      .eq("employee_id", employeeId)
      .eq("leave_type", leaveType)
      .order("start_date", { ascending: false }),
  ]);

  const onProbation = startDate ? isOnProbation(startDate, todayStr) : false;
  const confirmationDate = startDate ? getConfirmationDate(startDate) : null;
  const confirmDateLabel = confirmationDate
    ? confirmationDate.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    : null;

  const balancesByYear = leaveType === "no_pay" ? [] : (balancesRes.data ?? []).map((b) => {
    const yr = b.employment_year as number;
    let entitlement = 0;
    let used = 0;
    if (leaveType === "annual") {
      entitlement = getAnnualLeaveForYear(yr);
      used = Number(b.annual_used);
    } else if (leaveType === "sick") {
      entitlement = SICK_LEAVE_PER_YEAR;
      used = Number(b.sick_used);
    } else {
      entitlement = HOSPITALIZATION_PER_YEAR;
      used = Number(b.hospitalization_used);
    }
    return { year: yr, yearStart: b.year_start as string, yearEnd: b.year_end as string, entitlement, used };
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
