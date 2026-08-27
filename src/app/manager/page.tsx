import { createClient } from "@/lib/supabase/server";
import { todaySG } from "@/lib/utils/date";
import { DashboardClient } from "./dashboard-client";

const SG = "Asia/Singapore";

/** Hour of the day in Singapore, 0-23. */
function sgHour(now: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: SG, hour: "2-digit", hour12: false }).format(now)
  );
}

export default async function ManagerDashboardPage() {
  const supabase = await createClient();
  const todayStr = todaySG(); // Singapore business date, not UTC
  const currentYear = Number(todayStr.slice(0, 4));
  const currentMonth = todayStr.slice(5, 7);
  const { data: auth } = await supabase.auth.getUser();

  // Pinned to Singapore: the server runs in UTC, so an unpinned format shows
  // the previous day between SGT midnight and 8am.
  const todayLabel = new Date().toLocaleDateString("en-GB", {
    timeZone: SG,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const hour = sgHour();
  const greetingKey =
    hour < 12 ? "dashboard.goodMorning" : hour < 18 ? "dashboard.goodAfternoon" : "dashboard.goodEvening";

  const [employeesRes, onLeaveTodayRes, pendingRes, profileRes, announcementsRes, allEmpsRes] =
    await Promise.all([
      supabase.from("employees").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase
        .from("leave_requests")
        .select("id, leave_type, employees(full_name)")
        .eq("status", "approved")
        .lte("start_date", todayStr)
        .gte("end_date", todayStr),
      supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("profiles").select("full_name").eq("id", auth.user!.id).maybeSingle(),
      supabase
        .from("announcements")
        .select("id, title, body, created_at")
        .order("created_at", { ascending: false })
        .limit(2),
      supabase.from("employees").select("employment_start_date").eq("status", "active"),
    ]);

  const onLeaveToday = (onLeaveTodayRes.data ?? []).map((row) => {
    const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;
    return { id: row.id, full_name: employee?.full_name ?? "—", leave_type: row.leave_type };
  });

  const firstName = profileRes.data?.full_name?.split(" ")[0] ?? null;

  const anniversaryCount = (allEmpsRes.data ?? []).filter((emp) => {
    if (!emp.employment_start_date) return false;
    const month = emp.employment_start_date.slice(5, 7);
    const year = parseInt(emp.employment_start_date.slice(0, 4), 10);
    return month === currentMonth && year < currentYear;
  }).length;

  return (
    <DashboardClient
      firstName={firstName}
      greetingKey={greetingKey}
      todayLabel={todayLabel}
      totalEmployees={employeesRes.count ?? 0}
      onLeaveToday={onLeaveToday}
      pendingApprovals={pendingRes.count ?? 0}
      announcements={announcementsRes.data ?? []}
      anniversaryCount={anniversaryCount}
    />
  );
}
