import { createClient } from "@/lib/supabase/server";
import { getAvailableAnnualLeave } from "@/lib/leave/entitlement";
import { todaySG } from "@/lib/utils/date";
import { LeaveApprovalsClient } from "./leave-approvals-client";

export default async function ManagerLeavePage() {
  const supabase = await createClient();
  const todayStr = todaySG();

  const [requestsRes, approvedRes, publicHolidaysRes] = await Promise.all([
    supabase
      .from("leave_requests")
      .select(
        "id, employee_id, leave_type, start_date, end_date, days, reason, status, created_at, annual_charge_offset, employees(full_name)"
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

  const requests = requestsRes.data ?? [];

  // Annual leave still available, for the employees who have an annual request
  // waiting on a decision. Shown on the pending card so the manager does not
  // have to leave the screen to find out whether the request fits.
  const pendingAnnualEmployeeIds = [
    ...new Set(
      requests
        .filter((r) => r.status === "pending" && r.leave_type === "annual")
        .map((r) => r.employee_id)
    ),
  ];

  const annualAvailable: Record<string, number> = {};

  if (pendingAnnualEmployeeIds.length > 0) {
    const [employeesRes, balancesRes] = await Promise.all([
      supabase
        .from("employees")
        .select("id, employment_start_date")
        .in("id", pendingAnnualEmployeeIds),
      supabase
        .from("leave_balances")
        .select("employee_id, annual_used")
        .in("employee_id", pendingAnnualEmployeeIds)
        .lte("year_start", todayStr)
        .gte("year_end", todayStr),
    ]);

    const usedByEmployee = new Map(
      (balancesRes.data ?? []).map((b) => [b.employee_id, Number(b.annual_used)])
    );

    for (const employee of employeesRes.data ?? []) {
      if (!employee.employment_start_date) continue;
      // No balance row for the current employment year means none has been taken.
      const used = usedByEmployee.get(employee.id) ?? 0;
      const entitlement = getAvailableAnnualLeave(employee.employment_start_date, todayStr);
      annualAvailable[employee.id] = Math.max(0, entitlement - used);
    }
  }

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
      requests={requests}
      calendarEntries={calendarEntries}
      publicHolidays={publicHolidays}
      annualAvailable={annualAvailable}
    />
  );
}
