"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AnnouncementAudience } from "@/lib/types/database";

interface AnnouncementFormState {
  error?: string;
}

export async function createAnnouncementAction(
  _prevState: AnnouncementFormState,
  formData: FormData
): Promise<AnnouncementFormState> {
  const supabase = await createClient();

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const audience = String(formData.get("audience") ?? "all") as AnnouncementAudience;
  const employeeIds = formData.getAll("employeeIds").map(String);

  if (!title || !body) {
    return { error: "Please fill in the title and message." };
  }

  if (audience === "selected" && employeeIds.length === 0) {
    return { error: "Please select at least one employee." };
  }

  const { data: userRes } = await supabase.auth.getUser();

  const { data: announcement, error } = await supabase
    .from("announcements")
    .insert({ title, body, audience, created_by: userRes.user?.id })
    .select("id")
    .single();

  if (error || !announcement) {
    return { error: error?.message ?? "Failed to post announcement." };
  }

  if (audience === "selected") {
    const { error: targetsError } = await supabase.from("announcement_targets").insert(
      employeeIds.map((employeeId) => ({
        announcement_id: announcement.id,
        employee_id: employeeId,
      }))
    );

    if (targetsError) {
      return { error: targetsError.message };
    }
  }

  revalidatePath("/manager/announcements");
  return {};
}
