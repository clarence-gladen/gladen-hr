import { createClient } from "@/lib/supabase/server";
import { todaySG } from "@/lib/utils/date";
import { ManagerMoreClient, type MoreCounts } from "./more-client";

/**
 * The More menu carries badge counts so a manager can see what is waiting
 * before tapping into a screen. Both counts are cheap and scoped to today /
 * pending only — this page must stay fast, it is the app's index.
 */
export default async function ManagerMorePage() {
  const supabase = await createClient();
  const todayStr = todaySG();

  const [eventsRes, advancesRes] = await Promise.all([
    supabase
      .from("attendance_events")
      .select("employee_id, contract_id, event_type, occurred_at")
      .eq("status", "accepted")
      // +08:00 pins the bound to SGT midnight; a naive timestamp is read as
      // UTC and would hide every event made before 8am local time.
      .gte("occurred_at", `${todayStr}T00:00:00+08:00`)
      .order("occurred_at", { ascending: false }),
    supabase
      .from("salary_advances")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  // On site now = the latest accepted event today for an employee+site pair
  // is a check-in. Rows arrive newest-first, so the first one seen wins.
  const latest = new Map<string, string>();
  for (const e of eventsRes.data ?? []) {
    const key = `${e.employee_id}:${e.contract_id}`;
    if (!latest.has(key)) latest.set(key, e.event_type);
  }

  const counts: MoreCounts = {
    onSite: [...latest.values()].filter((type) => type === "check_in").length,
    pendingAdvances: advancesRes.count ?? 0,
  };

  return <ManagerMoreClient counts={counts} />;
}
