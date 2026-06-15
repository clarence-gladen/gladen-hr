import { createClient } from "@/lib/supabase/server";
import { getExpiringDocuments } from "@/lib/documents/expiry";
import { DashboardClient } from "./dashboard-client";

export default async function ManagerDashboardPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [employeesRes, onLeaveTodayRes, pendingRes, expiringDocs] = await Promise.all([
    supabase
      .from("employees")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("leave_requests")
      .select("id, leave_type, employees(full_name)")
      .eq("status", "approved")
      .lte("start_date", today)
      .gte("end_date", today),
    supabase
      .from("leave_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    getExpiringDocuments(supabase),
  ]);

  const onLeaveToday = (onLeaveTodayRes.data ?? []).map((row) => {
    const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;
    return {
      id: row.id,
      full_name: employee?.full_name ?? "—",
      leave_type: row.leave_type,
    };
  });

  return (
    <DashboardClient
      totalEmployees={employeesRes.count ?? 0}
      onLeaveToday={onLeaveToday}
      pendingApprovals={pendingRes.count ?? 0}
      expiringDocuments={expiringDocs.length}
    />
  );
}
