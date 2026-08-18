"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addChecklistItemAction(
  contractId: string,
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const description = String(formData.get("description") ?? "").trim();
  const frequency = String(formData.get("frequency") ?? "daily");
  const area = String(formData.get("area") ?? "").trim() || null;
  const requiresPhoto = formData.get("requiresPhoto") === "on";

  if (!description) return { error: "Please enter a task description." };
  if (!["daily", "weekly", "monthly"].includes(frequency)) return { error: "Invalid frequency." };

  // Append after the current last item.
  const { data: last } = await supabase
    .from("checklist_items")
    .select("sort_order")
    .eq("contract_id", contractId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder = (last?.sort_order ?? 0) + 1;

  const { error } = await supabase.from("checklist_items").insert({
    contract_id: contractId,
    description,
    frequency,
    area,
    requires_photo: requiresPhoto,
    sort_order: sortOrder,
  });

  if (error) return { error: error.message };

  revalidatePath(`/manager/checklists/${contractId}`);
  return {};
}

export async function deleteChecklistItemAction(
  contractId: string,
  itemId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("checklist_items").delete().eq("id", itemId);
  if (error) return { error: error.message };
  revalidatePath(`/manager/checklists/${contractId}`);
  return {};
}

export async function toggleChecklistItemActiveAction(
  contractId: string,
  itemId: string,
  active: boolean
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("checklist_items").update({ active }).eq("id", itemId);
  if (error) return { error: error.message };
  revalidatePath(`/manager/checklists/${contractId}`);
  return {};
}
