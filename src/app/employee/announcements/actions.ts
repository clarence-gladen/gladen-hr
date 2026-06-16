"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markAnnouncementReadAction(announcementId: string): Promise<void> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("employee_id")
    .eq("id", auth.user.id)
    .maybeSingle();

  const employeeId = profile?.employee_id;
  if (!employeeId) return;

  await supabase
    .from("announcement_reads")
    .upsert({ announcement_id: announcementId, employee_id: employeeId });

  revalidatePath("/employee/announcements");
  revalidatePath("/employee");
}
