import type { ResidencyStatus, SkillLevel } from "@/lib/types/database";

export interface CpfRate {
  age_from: number;
  age_to: number;
  employee_rate: number; // percent of ordinary wage
  employer_rate: number; // percent of ordinary wage
  ow_ceiling: number;
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

  const ordinaryWage = Math.min(wage, bracket.ow_ceiling);

  return {
    employeeContribution: roundToDollar(
      (ordinaryWage * bracket.employee_rate) / 100
    ),
    employerContribution: roundToDollar(
      (ordinaryWage * bracket.employer_rate) / 100
    ),
  };
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
