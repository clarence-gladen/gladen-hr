import type { ResidencyStatus, SkillLevel } from "@/lib/types/database";

/**
 * Which contribution-rate set applies:
 *  - "full"     : Singapore Citizens and 3rd-year-onwards PRs (CPF Board Table 1)
 *  - "pr_year1" : 1st-year PRs, Graduated/Graduated rates (Table 2)
 *  - "pr_year2" : 2nd-year PRs, Graduated/Graduated rates (Table 3)
 */
export type CpfRateCategory = "full" | "pr_year1" | "pr_year2";

export interface CpfRate {
  age_from: number;
  age_to: number;
  employee_rate: number; // percent of ordinary wage
  employer_rate: number; // percent of ordinary wage
  ow_ceiling: number;
  effective_date: string;
  // Rows loaded before migration 0037 have no category; treat those as "full".
  rate_category?: CpfRateCategory;
}

export interface FwlRate {
  residency_status: ResidencyStatus;
  skill_level: string;
  monthly_levy: number;
}

export interface SdlConfig {
  min_levy: number;
  max_levy: number;
  rate: number;
  lower_wage_threshold: number;
  upper_wage_threshold: number;
}

function roundToDollar(value: number): number {
  return Math.round(value);
}

function floorToDollar(value: number): number {
  return Math.floor(value);
}

/** Age in completed years as of a given date. */
export function calculateAge(
  dateOfBirth: string | Date,
  asOf: string | Date = new Date()
): number {
  const dob = dateOfBirth instanceof Date ? dateOfBirth : new Date(dateOfBirth);
  const ref = asOf instanceof Date ? asOf : new Date(asOf);

  let age = ref.getFullYear() - dob.getFullYear();
  const hasHadBirthdayThisYear =
    ref.getMonth() > dob.getMonth() ||
    (ref.getMonth() === dob.getMonth() && ref.getDate() >= dob.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;

  return age;
}

/** Returns the CPF rate bracket for a given age, or null if none matches. */
export function getCpfBracket(age: number, rates: CpfRate[]): CpfRate | null {
  return rates.find((r) => age >= r.age_from && age <= r.age_to) ?? null;
}

/**
 * Determines a Singapore PR employee's "year of SPR status" for a given salary
 * month. Per CPF Board, graduated (lower) rates apply for the first two years:
 * the 2nd-year rate begins on the first day of the month AFTER the 1st
 * anniversary of obtaining PR, and full (3rd-year) rates from the month after
 * the 2nd anniversary. Counting whole months from the PR grant month:
 *   months 0–12  → year 1
 *   months 13–24 → year 2
 *   months 25+   → year 3 (full)
 * Returns 3 (full) when the date is missing/malformed or precedes the salary
 * month, so a missing date safely falls back to full rates.
 *
 * @param sprEffectiveDate "YYYY-MM-DD" date PR status was obtained, or null.
 * @param salaryMonthFirstDay "YYYY-MM-DD" first day of the salary month.
 */
export function getSprYearIndex(
  sprEffectiveDate: string | null | undefined,
  salaryMonthFirstDay: string
): 1 | 2 | 3 {
  if (!sprEffectiveDate) return 3;
  const [gy, gm] = sprEffectiveDate.split("-").map(Number);
  const [sy, sm] = salaryMonthFirstDay.split("-").map(Number);
  if (!gy || !gm || !sy || !sm) return 3;

  const monthsElapsed = (sy - gy) * 12 + (sm - gm);
  if (monthsElapsed < 0) return 3; // salary month precedes PR grant
  if (monthsElapsed <= 12) return 1;
  if (monthsElapsed <= 24) return 2;
  return 3;
}

/** Maps residency status + PR year to the applicable CPF rate category. */
export function resolveCpfCategory(
  residencyStatus: ResidencyStatus,
  sprYearIndex: 1 | 2 | 3
): CpfRateCategory {
  if (residencyStatus === "pr") {
    if (sprYearIndex === 1) return "pr_year1";
    if (sprYearIndex === 2) return "pr_year2";
  }
  return "full";
}

/**
 * Narrows a mixed CPF rate table (all categories for one effective date) to the
 * rows for one category. Falls back to the "full" rows if the requested PR
 * category is missing (e.g. graduated rates not seeded yet), so payroll never
 * silently produces zero CPF.
 */
export function selectCpfRatesByCategory(
  rates: CpfRate[],
  category: CpfRateCategory
): CpfRate[] {
  const matching = rates.filter((r) => (r.rate_category ?? "full") === category);
  if (matching.length === 0 && category !== "full") {
    return rates.filter((r) => (r.rate_category ?? "full") === "full");
  }
  return matching;
}

/**
 * CPF contributions for a citizen/PR employee, based on Ordinary Wage capped
 * at the applicable ow_ceiling for their age bracket. Returns zero if no
 * bracket matches the given age.
 */
export function calculateCpf(
  wage: number,
  age: number,
  rates: CpfRate[]
): { employeeContribution: number; employerContribution: number } {
  const bracket = rates.find((r) => age >= r.age_from && age <= r.age_to);
  if (!bracket || wage <= 0) {
    return { employeeContribution: 0, employerContribution: 0 };
  }

  const cappedWage = Math.min(wage, bracket.ow_ceiling);
  const totalRate = bracket.employee_rate + bracket.employer_rate;

  // CPF Board method:
  // 1. Total = (employer + employee rate) × wage, rounded to nearest dollar
  // 2. Employee = total × (employee / total_rate), rounded DOWN (floor)
  // 3. Employer = Total − Employee
  const totalCpf = roundToDollar((cappedWage * totalRate) / 100);
  const employeeContribution = floorToDollar((cappedWage * bracket.employee_rate) / 100);
  const employerContribution = totalCpf - employeeContribution;

  return { employeeContribution, employerContribution };
}

/**
 * CPF contributions on Additional Wage (bonus). No OW ceiling applies; the
 * annual AW ceiling ($102,000 minus total OW already subject to CPF) must be
 * verified manually at year-end. Uses the same employee/employer rates.
 */
export function calculateCpfOnAw(
  awAmount: number,
  age: number,
  rates: CpfRate[]
): { employeeContribution: number; employerContribution: number } {
  const bracket = rates.find((r) => age >= r.age_from && age <= r.age_to);
  if (!bracket || awAmount <= 0) {
    return { employeeContribution: 0, employerContribution: 0 };
  }
  const totalRate = bracket.employee_rate + bracket.employer_rate;
  const totalCpf = roundToDollar((awAmount * totalRate) / 100);
  const employeeContribution = floorToDollar((awAmount * bracket.employee_rate) / 100);
  const employerContribution = totalCpf - employeeContribution;

  return { employeeContribution, employerContribution };
}

/**
 * Monthly Foreign Worker Levy for work permit / S Pass holders.
 * Returns 0 for citizens/PRs (no levy applies).
 */
export function calculateFwl(
  residencyStatus: ResidencyStatus,
  skillLevel: SkillLevel,
  rates: FwlRate[]
): number {
  if (residencyStatus === "citizen" || residencyStatus === "pr") return 0;

  const match = rates.find(
    (r) => r.residency_status === residencyStatus && r.skill_level === skillLevel
  );
  return match?.monthly_levy ?? 0;
}

/**
 * Skills Development Levy, payable on every employee's wage.
 * 0.25% of monthly wage, subject to a minimum and maximum (clamping
 * naturally reproduces the published $2 floor / $11.25 ceiling).
 */
export function calculateSdl(wage: number, config: SdlConfig): number {
  if (wage <= 0) return 0;

  const raw = wage * config.rate;
  return roundToDollar(
    Math.min(Math.max(raw, config.min_levy), config.max_levy)
  );
}
