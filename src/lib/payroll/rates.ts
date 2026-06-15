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
  const { data, error } = await supabase
    .from("cpf_rates")
    .select("age_from, age_to, employee_rate, employer_rate, ow_ceiling, effective_date")
    .lte("effective_date", asOf)
    .order("effective_date", { ascending: false });

  if (error) throw error;
  if (!data || data.length === 0) return [];

  const latestEffectiveDate = data[0].effective_date;
  return data.filter((row) => row.effective_date === latestEffectiveDate);
}

/**
 * Fetches the Foreign Worker Levy rate table effective as of the given date.
 */
export async function getFwlRates(
  supabase: SupabaseClient,
  asOf: string
): Promise<FwlRate[]> {
  const { data, error } = await supabase
    .from("fwl_rates")
    .select("residency_status, skill_level, monthly_levy, effective_date")
    .lte("effective_date", asOf)
    .order("effective_date", { ascending: false });

  if (error) throw error;
  if (!data || data.length === 0) return [];

  const latestEffectiveDate = data[0].effective_date;
  return data.filter((row) => row.effective_date === latestEffectiveDate);
}

/**
 * Fetches the Skills Development Levy config effective as of the given date.
 */
export async function getSdlConfig(
  supabase: SupabaseClient,
  asOf: string
): Promise<SdlConfig | null> {
  const { data, error } = await supabase
    .from("sdl_config")
    .select("min_levy, max_levy, rate, lower_wage_threshold, upper_wage_threshold, effective_date")
    .lte("effective_date", asOf)
    .order("effective_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}
