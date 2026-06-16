"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setUserRoleAction(
  _prev: { error?: string; success?: string },
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  const supabase = await createClient();
  const phone = (formData.get("phone") as string).replace(/\s/g, "");
  const role = formData.get("role") as string;

  if (!phone || !role) return { error: "Phone number is required." };

  const normalized = phone.startsWith("+") ? phone : `+${phone}`;

  const { data, error } = await supabase.rpc("set_user_role", {
    p_phone: normalized,
    p_role: role,
  });

  if (error) return { error: error.message };
  if (data === "not_found") {
    return { error: "No account found for that number. Ask them to log in to the app first." };
  }

  revalidatePath("/manager/more/access");
  return { success: role === "manager" ? "Manager access granted." : "Access removed." };
}
