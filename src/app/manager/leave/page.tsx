import { createClient } from "@/lib/supabase/server";
import { LeaveApprovalsClient } from "./leave-approvals-client";

export default async function ManagerLeavePage() {
  const supabase = await createClient();

  const [requestsRes, approvedRes, publicHolidaysRes] = await Promise.all([
    supabase
      .from("leave_requests")
      .select(
        "id, employee_id, leave_type, start_date, end_date, days, reason, status, created_at, employees(full_name)"
      )
      .order("start_date", { ascending: false }),
    supabase
      .from("leave_requests")
      .select("id, leave_type, start_date, end_date, employees(full_name)")
      .eq("status", "approved"),
    supabase
      .from("public_holidays")
      .select("date, name")
      .order("date", { ascending: true }),
  ]);

  const calendarEntries = (approvedRes.data ?? []).map((row) => {
    const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;
    return {
      id: row.id,
      full_name: employee?.full_name ?? "—",
      leave_type: row.leave_type,
      start_date: row.start_date,
      end_date: row.end_date,
    };
  });

  const publicHolidays = (publicHolidaysRes.data ?? []) as { date: string; name: string }[];

  return (
    <LeaveApprovalsClient
      requests={requestsRes.data ?? []}
      calendarEntries={calendarEntries}
      publicHolidays={publicHolidays}
    />
  );
}
