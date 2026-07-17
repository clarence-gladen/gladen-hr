"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseOtForm } from "@/lib/ot/parse";

export async function createOtEntryAction(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const parsed = parseOtForm(formData);
  if (parsed.error || !parsed.values) return { error: parsed.error };

  const { error } = await supabase.from("ot_entries").insert(parsed.values);
  if (error) return { error: error.message };

  revalidatePath("/employee/ot");
  return {};
}

export async function updateOtEntryAction(
  id: string,
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const parsed = parseOtForm(formData);
  if (parsed.error || !parsed.values) return { error: parsed.error };

  const { error } = await supabase.from("ot_entries").update(parsed.values).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/employee/ot");
  return {};
}

export async function deleteOtEntryAction(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from("ot_entries").delete().eq("id", id);
  if (error) return { error: error.message };

  return {};
}
