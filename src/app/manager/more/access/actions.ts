"use server";

import { createClient } from "@/lib/supabase/server";

export async function setUserRoleAction(
  _prev: { error?: string; success?: string },
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  const supabase = await createClient();
  const digits = (formData.get("phone") as string).replace(/\D/g, "");

  if (!digits) return { error: "Phone number is required." };

  const normalized = digits.startsWith("65") ? digits : `65${digits}`;

  const { data, error } = await supabase.rpc("set_user_role", {
    p_phone: normalized,
    p_role: "manager",
  });

  if (error) return { error: error.message };
  if (data === "pending") {
    return { success: "Number saved. They'll get manager access automatically when they first log in." };
  }

  return { success: "Manager access granted." };
}

export async function removeManagerAccessAction(
  userId: string | null,
  phone: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_manager_access", {
    p_user_id: userId ?? null,
    p_phone: phone,
  });
  if (error) return { error: error.message };
  return {};
}
