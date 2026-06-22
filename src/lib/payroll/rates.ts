import type { SupabaseClient } from "@supabase/supabase-js";
import type { CpfRate, FwlRate, SdlConfig } from "./statutory";

/**
 * Fetches the CPF rate table effective as of the given date. cpf_rates holds
 * one row per age bracket per effective_date, so we take every row sharing
 * the most recent effective_date that is on or before `asOf`.
 */
export async function getCpfRates(
  supabase: SupabaseClient,
  asOf: string
): Promise<CpfRate[]> {
  const fields = "age_from, age_to, employee_rate, employer_rate, ow_ceiling, effective_date";

  // Try exact date range first
  const { data, error } = await supabase
    .from("cpf_rates")
    .select(fields)
    .lte("effective_date", asOf)
    .order("effective_date", { ascending: false });

  if (error) throw error;

  if (data && data.length > 0) {
    const latestEffectiveDate = data[0].effective_date;
    return data.filter((row) => row.effective_date === latestEffectiveDate);
  }

  // No rates found before asOf — fall back to the earliest available rates
  const { data: earliest, error: err2 } = await supabase
    .from("cpf_rates")
    .select(fields)
    .order("effective_date", { ascending: true });

  if (err2) throw err2;
  if (!earliest || earliest.length === 0) return [];

  const earliestDate = earliest[0].effective_date;
  return earliest.filter((row) => row.effective_date === earliestDate);
}

export async function getFwlRates(
  supabase: SupabaseClient,
  asOf: string
): Promise<FwlRate[]> {
  const fields = "residency_status, skill_level, monthly_levy, effective_date";

  const { data, error } = await supabase
    .from("fwl_rates")
    .select(fields)
    .lte("effective_date", asOf)
    .order("effective_date", { ascending: false });

  if (error) throw error;

  if (data && data.length > 0) {
    const latestEffectiveDate = data[0].effective_date;
    return data.filter((row) => row.effective_date === latestEffectiveDate);
  }

  const { data: earliest, error: err2 } = await supabase
    .from("fwl_rates")
    .select(fields)
    .order("effective_date", { ascending: true });

  if (err2) throw err2;
  if (!earliest || earliest.length === 0) return [];

  const earliestDate = earliest[0].effective_date;
  return earliest.filter((row) => row.effective_date === earliestDate);
}

export async function getSdlConfig(
  supabase: SupabaseClient,
  asOf: string
): Promise<SdlConfig | null> {
  const fields = "min_levy, max_levy, rate, lower_wage_threshold, upper_wage_threshold, effective_date";

  const { data, error } = await supabase
    .from("sdl_config")
    .select(fields)
    .lte("effective_date", asOf)
    .order("effective_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (data) return data;

  // Fall back to earliest available
  const { data: earliest, error: err2 } = await supabase
    .from("sdl_config")
    .select(fields)
    .order("effective_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (err2) throw err2;
  return earliest;
}
