import { createClient } from "@/lib/supabase/server";
import { AnnouncementsClient } from "./announcements-client";

export default async function EmployeeAnnouncementsPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("employee_id")
    .eq("id", auth.user!.id)
    .maybeSingle();

  const employeeId = profile?.employee_id;

  const [announcementsRes, readsRes] = await Promise.all([
    supabase
      .from("announcements")
      .select("id, title, body, created_at")
      .order("created_at", { ascending: false }),
    employeeId
      ? supabase
          .from("announcement_reads")
          .select("announcement_id")
          .eq("employee_id", employeeId)
      : Promise.resolve({ data: [] }),
  ]);

  const readIds = new Set((readsRes.data ?? []).map((r) => r.announcement_id));

  const announcements = (announcementsRes.data ?? []).map((a) => ({
    ...a,
    isRead: readIds.has(a.id),
  }));

  return <AnnouncementsClient announcements={announcements} />;
}
