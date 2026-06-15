import type { SupabaseClient } from "@supabase/supabase-js";

/** Documents expiring within this many days are flagged on the manager dashboard. */
export const EXPIRY_WARNING_DAYS = 30;

/**
 * Returns documents that have already expired or will expire within
 * `withinDays`, soonest first.
 */
export async function getExpiringDocuments(
  supabase: SupabaseClient,
  withinDays: number = EXPIRY_WARNING_DAYS,
  asOf: string = new Date().toISOString().slice(0, 10)
) {
  const threshold = new Date(asOf);
  threshold.setDate(threshold.getDate() + withinDays);

  const { data, error } = await supabase
    .from("documents")
    .select("id, employee_id, document_type, expiry_date, employees(full_name)")
    .not("expiry_date", "is", null)
    .lte("expiry_date", threshold.toISOString().slice(0, 10))
    .order("expiry_date", { ascending: true });

  if (error) throw error;
  return data;
}
