import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { todaySG } from "@/lib/utils/date";
import { CheckinClient, type AssignedSite, type TodayEvent } from "./checkin-client";

export default async function CheckinPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("employee_id, employees(feature_checkin)")
    .eq("id", auth.user!.id)
    .maybeSingle();

  const employee = Array.isArray(profile?.employees)
    ? profile?.employees[0]
    : profile?.employees;
  const employeeId = profile?.employee_id;

  // Feature gate: only employees with check-in enabled reach this page.
  if (!employeeId || !employee?.feature_checkin) {
    redirect("/employee");
  }

  const today = todaySG();

  // Sites the employee is actively assigned to today.
  const { data: assignments } = await supabase
    .from("contract_assignments")
    .select("contract_id, contracts(client_name, site_name, latitude, longitude)")
    .eq("employee_id", employeeId)
    .lte("assigned_from", today)
    .or(`assigned_to.is.null,assigned_to.gte.${today}`);

  const sites: AssignedSite[] = (assignments ?? []).map((a) => {
    const c = Array.isArray(a.contracts) ? a.contracts[0] : a.contracts;
    return {
      contractId: a.contract_id,
      clientName: c?.client_name ?? "",
      siteName: c?.site_name ?? "",
      hasPin: c?.latitude != null && c?.longitude != null,
    };
  });

  // Today's accepted events for this employee, to derive current state + history.
  const { data: events } = await supabase
    .from("attendance_events")
    .select("contract_id, event_type, status, occurred_at")
    .eq("employee_id", employeeId)
    .eq("status", "accepted")
    .gte("occurred_at", `${today}T00:00:00`)
    .order("occurred_at", { ascending: true });

  const todayEvents: TodayEvent[] = (events ?? []).map((e) => ({
    contractId: e.contract_id,
    eventType: e.event_type,
    occurredAt: e.occurred_at,
  }));

  return <CheckinClient sites={sites} todayEvents={todayEvents} />;
}
