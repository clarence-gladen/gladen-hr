"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Marks an employee's anniversary bonus Paid or Unpaid. Manager-only via RLS.
 * Called programmatically from a button, so no revalidatePath — the client
 * calls router.refresh() on success.
 */
export async function setAnniversaryBonusPaidAction(
  employeeId: string,
  anniversaryDate: string,
  paid: boolean
): Promise<{ error?: string }> {
  if (!employeeId || !/^\d{4}-\d{2}-\d{2}$/.test(anniversaryDate)) {
    return { error: "Invalid anniversary." };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("anniversary_bonus_payments")
    .upsert(
      {
        employee_id: employeeId,
        anniversary_date: anniversaryDate,
        paid,
        updated_by: user?.id ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "employee_id,anniversary_date" }
    );
  if (error) return { error: error.message };
  return {};
}
