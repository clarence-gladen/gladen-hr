import { createClient } from "@/lib/supabase/server";
import { AnnouncementsClient } from "./announcements-client";

export default async function ManagerAnnouncementsPage() {
  const supabase = await createClient();

  const [announcementsRes, employeesRes] = await Promise.all([
    supabase
      .from("announcements")
      .select("id, title, body, audience, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("employees")
      .select("id, full_name")
      .eq("status", "active")
      .order("full_name"),
  ]);

  return (
    <AnnouncementsClient
      announcements={announcementsRes.data ?? []}
      employees={employeesRes.data ?? []}
    />
  );
}
