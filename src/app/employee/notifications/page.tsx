import { createClient } from "@/lib/supabase/server";
import { NotificationsListClient } from "@/components/notifications-list-client";
import { revalidatePath } from "next/cache";

async function markAllReadAction() {
  "use server";
  const supabase = await createClient();
  await supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
  revalidatePath("/employee/notifications");
}

export default async function EmployeeNotificationsPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("notifications")
    .select("id, title, body, type, is_read, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <NotificationsListClient
      notifications={data ?? []}
      markAllReadAction={markAllReadAction}
    />
  );
}
