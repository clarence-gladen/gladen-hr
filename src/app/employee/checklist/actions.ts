"use server";

import { createClient } from "@/lib/supabase/server";

export async function completeItemAction(
  itemId: string,
  note?: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_checklist_item", {
    p_item_id: itemId,
    p_note: note ?? null,
    p_photo_path: null,
  });
  if (error) return { error: error.message };
  return {};
}

export async function uncompleteItemAction(itemId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("uncomplete_checklist_item", { p_item_id: itemId });
  if (error) return { error: error.message };
  return {};
}
