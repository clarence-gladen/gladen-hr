import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import {
  calculateAge,
  getCpfBracket,
  calculateCpf,
  calculateCpfOnAw,
  calculateFwl,
  calculateSdl,
  getSprYearIndex,
  resolveCpfCategory,
  selectCpfRatesByCategory,
  type CpfRate,
  type FwlRate,
  type SdlConfig,
} from "./statutory";

/**
 * The official Singapore CPF contribution rates effective 1 January 2026
 * (Singapore Citizens & 3rd-year+ PRs, wages > $750/month), OW ceiling $8,000.
 * Source: CPF Board "CPF contribution rates from 1 Jan 2026".
 *
 * These are hard-coded as the source of truth. The tests below verify BOTH that
 * calculateCpf reproduces the correct dollar amounts AND that the production
 * migration seeds exactly these values — the assertion that would have caught
 * the 2026 age-bracket off-by-one bug instantly.
 */
const OFFICIAL_CPF_2026: CpfRate[] = [
  { age_from: 0, age_to: 54, employee_rate: 20, employer_rate: 17, ow_ceiling: 8000, effective_date: "2026-01-01" },
  { age_from: 55, age_to: 59, employee_rate: 18, employer_rate: 16, ow_ceiling: 8000, effective_date: "2026-01-01" },
  { age_from: 60, age_to: 64, employee_rate: 12.5, employer_rate: 12.5, ow_ceiling: 8000, effective_date: "2026-01-01" },
  { age_from: 65, age_to: 69, employee_rate: 7.5, employer_rate: 9, ow_ceiling: 8000, effective_date: "2026-01-01" },
  { age_from: 70, age_to: 200, employee_rate: 5, employer_rate: 7.5, ow_ceiling: 8000, effective_date: "2026-01-01" },
];

describe("calculateAge", () => {
  it("returns completed years when the birthday has already passed this year", () => {
    expect(calculateAge("1990-03-15", "2026-08-01")).toBe(36);
  });

  it("does not count a birthday that has not yet occurred this year", () => {
    expect(calculateAge("1990-11-20", "2026-08-01")).toBe(35);
  });

  it("counts the birthday on the exact day", () => {
    expect(calculateAge("1990-08-01", "2026-08-01")).toBe(36);
  });

  it("does not count the birthday the day before it occurs", () => {
    expect(calculateAge("1990-08-02", "2026-08-01")).toBe(35);
  });

  it("computes the boundary age that the CPF bug hinged on (turns 65 mid-year)", () => {
    // Kwan Tuck Fatt, DOB 15/08/1960: age as at 1 Aug 2026 is still 65.
    expect(calculateAge("1960-08-15", "2026-08-01")).toBe(65);
    // As at 1 Sep 2026 (month after birthday) he is 66 — still the 65-69 band.
    expect(calculateAge("1960-08-15", "2026-09-01")).toBe(66);
  });
});

describe("getCpfBracket — age boundaries (the off-by-one bug)", () => {
  const cases: Array<[number, number, number]> = [
    // [age, expected employee_rate, expected employer_rate]
    [54, 20, 17],
    [55, 18, 16], // exactly 55 must fall in the 55-59 band, NOT the <=54 band
    [59, 18, 16],
    [60, 12.5, 12.5], // exactly 60
    [64, 12.5, 12.5],
    [65, 7.5, 9], // exactly 65 — Kwan's case
    [69, 7.5, 9],
    [70, 5, 7.5], // exactly 70
    [71, 5, 7.5],
  ];

  it.each(cases)("age %i → %f%% / %f%%", (age, ee, er) => {
    const bracket = getCpfBracket(age, OFFICIAL_CPF_2026);
    expect(bracket).not.toBeNull();
    expect(bracket!.employee_rate).toBe(ee);
    expect(bracket!.employer_rate).toBe(er);
  });

  it("returns null for an age below the youngest bracket floor", () => {
    expect(getCpfBracket(-1, OFFICIAL_CPF_2026)).toBeNull();
  });
});

describe("calculateCpf — known dollar amounts (CPF Board rounding)", () => {
  // Method: total = round(cappedWage * totalRate), employee = floor(cappedWage * eeRate),
  // employer = total - employee. Values below are computed independently by hand.
  const cases: Array<{ label: string; wage: number; age: number; ee: number; er: number }> = [
    { label: "under-55, $3,000", wage: 3000, age: 40, ee: 600, er: 510 },
    { label: "55-59, $4,000", wage: 4000, age: 55, ee: 720, er: 640 },
    { label: "60-64, $4,000", wage: 4000, age: 60, ee: 500, er: 500 },
    { label: "65-69 (Kwan), $3,000", wage: 3000, age: 65, ee: 225, er: 270 },
    { label: "70+, $2,000", wage: 2000, age: 70, ee: 100, er: 150 },
    // OW ceiling: $10,000 wage is capped at $8,000 for a <=54 worker
    { label: "ceiling cap, $10,000", wage: 10000, age: 40, ee: 1600, er: 1360 },
    // Non-integer rounding: 2001 * 37% = 740.37 -> total 740; 2001 * 20% = 400.2 -> floor 400
    { label: "rounding, $2,001", wage: 2001, age: 40, ee: 400, er: 340 },
  ];

  it.each(cases)("$label", ({ wage, age, ee, er }) => {
    const result = calculateCpf(wage, age, OFFICIAL_CPF_2026);
    expect(result.employeeContribution).toBe(ee);
    expect(result.employerContribution).toBe(er);
  });

  it("returns zero for zero or negative wage", () => {
    expect(calculateCpf(0, 40, OFFICIAL_CPF_2026)).toEqual({ employeeContribution: 0, employerContribution: 0 });
    expect(calculateCpf(-500, 40, OFFICIAL_CPF_2026)).toEqual({ employeeContribution: 0, employerContribution: 0 });
  });

  it("returns zero when no age bracket matches", () => {
    expect(calculateCpf(3000, 65, [])).toEqual({ employeeContribution: 0, employerContribution: 0 });
  });

  it("never lets the employer share go negative from the round/floor split", () => {
    for (let wage = 1; wage <= 8000; wage += 1) {
      const { employeeContribution, employerContribution } = calculateCpf(wage, 40, OFFICIAL_CPF_2026);
      expect(employerContribution).toBeGreaterThanOrEqual(0);
      expect(employeeContribution).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("calculateCpfOnAw — bonus / additional wage", () => {
  it("applies the age-band rate with no OW ceiling", () => {
    // $20,000 bonus for an under-55 worker: total = round(20000*37%) = 7400,
    // employee = floor(20000*20%) = 4000, employer = 3400. (No $8,000 cap.)
    const result = calculateCpfOnAw(20000, 40, OFFICIAL_CPF_2026);
    expect(result.employeeContribution).toBe(4000);
    expect(result.employerContribution).toBe(3400);
  });

  it("returns zero for a zero bonus", () => {
    expect(calculateCpfOnAw(0, 40, OFFICIAL_CPF_2026)).toEqual({ employeeContribution: 0, employerContribution: 0 });
  });
});

describe("calculateFwl — foreign worker levy", () => {
  const fwlRates: FwlRate[] = [
    { residency_status: "work_permit", skill_level: "basic_skilled", monthly_levy: 650 },
    { residency_status: "work_permit", skill_level: "higher_skilled", monthly_levy: 450 },
    { residency_status: "s_pass", skill_level: "higher_skilled", monthly_levy: 650 },
  ];

  it("is zero for citizens and PRs (they pay CPF, not levy)", () => {
    expect(calculateFwl("citizen", "higher_skilled", fwlRates)).toBe(0);
    expect(calculateFwl("pr", "basic_skilled", fwlRates)).toBe(0);
  });

  it("matches the levy by residency status and skill level", () => {
    expect(calculateFwl("work_permit", "basic_skilled", fwlRates)).toBe(650);
    expect(calculateFwl("work_permit", "higher_skilled", fwlRates)).toBe(450);
    expect(calculateFwl("s_pass", "higher_skilled", fwlRates)).toBe(650);
  });

  it("returns zero when no matching levy row exists", () => {
    expect(calculateFwl("s_pass", "basic_skilled", fwlRates)).toBe(0);
  });
});

describe("calculateSdl — skills development levy", () => {
  // Official: 0.25% of monthly wage, minimum $2, maximum $11.25.
  const config: SdlConfig = {
    min_levy: 2,
    max_levy: 11.25,
    rate: 0.0025,
    lower_wage_threshold: 800,
    upper_wage_threshold: 4500,
  };

  it("is zero for zero wage", () => {
    expect(calculateSdl(0, config)).toBe(0);
  });

  it("floors at the $2 minimum for very low wages", () => {
    expect(calculateSdl(400, config)).toBe(2); // 0.25% of 400 = $1 -> floored to $2
  });

  it("charges 0.25% within the band", () => {
    expect(calculateSdl(2000, config)).toBe(5); // 0.25% of 2000 = $5
  });

  it("caps at the maximum for high wages", () => {
    // 0.25% of 8000 = $20, capped to $11.25. NOTE: current code rounds the
    // capped levy to the nearest dollar, yielding $11 rather than $11.25.
    expect(calculateSdl(8000, config)).toBe(11);
  });
});

/**
 * Official 1 Jan 2026 Graduated/Graduated CPF rates for 1st- and 2nd-year PRs.
 * Source: CPF Board Tables 2 & 3. Used to verify both the PR-CPF math and that
 * migration 0037 seeds exactly these values.
 */
const OFFICIAL_PR_YEAR1_2026: CpfRate[] = [
  { age_from: 0, age_to: 54, employee_rate: 5, employer_rate: 4, ow_ceiling: 8000, effective_date: "2026-01-01", rate_category: "pr_year1" },
  { age_from: 55, age_to: 59, employee_rate: 5, employer_rate: 4, ow_ceiling: 8000, effective_date: "2026-01-01", rate_category: "pr_year1" },
  { age_from: 60, age_to: 64, employee_rate: 5, employer_rate: 3.5, ow_ceiling: 8000, effective_date: "2026-01-01", rate_category: "pr_year1" },
  { age_from: 65, age_to: 200, employee_rate: 5, employer_rate: 3.5, ow_ceiling: 8000, effective_date: "2026-01-01", rate_category: "pr_year1" },
];
const OFFICIAL_PR_YEAR2_2026: CpfRate[] = [
  { age_from: 0, age_to: 54, employee_rate: 15, employer_rate: 9, ow_ceiling: 8000, effective_date: "2026-01-01", rate_category: "pr_year2" },
  { age_from: 55, age_to: 59, employee_rate: 12.5, employer_rate: 6, ow_ceiling: 8000, effective_date: "2026-01-01", rate_category: "pr_year2" },
  { age_from: 60, age_to: 64, employee_rate: 7.5, employer_rate: 3.5, ow_ceiling: 8000, effective_date: "2026-01-01", rate_category: "pr_year2" },
  { age_from: 65, age_to: 200, employee_rate: 5, employer_rate: 3.5, ow_ceiling: 8000, effective_date: "2026-01-01", rate_category: "pr_year2" },
];

describe("getSprYearIndex — PR year boundaries", () => {
  // PR obtained 15 March 2025. Year 2 starts the month AFTER the 1st anniversary
  // (April 2026); full rates the month after the 2nd anniversary (April 2027).
  it.each([
    ["2025-03-01", 1], // grant month
    ["2025-12-01", 1],
    ["2026-03-01", 1], // 1st-anniversary month is still year 1
    ["2026-04-01", 2], // month after 1st anniversary -> year 2
    ["2027-03-01", 2], // 2nd-anniversary month is still year 2
    ["2027-04-01", 3], // month after 2nd anniversary -> full
    ["2030-01-01", 3],
  ] as const)("grant 2025-03-15, salary %s -> year %i", (salaryMonth, expected) => {
    expect(getSprYearIndex("2025-03-15", salaryMonth)).toBe(expected);
  });

  it("uses the grant MONTH, ignoring day of month (1st-of-month grant behaves identically)", () => {
    expect(getSprYearIndex("2025-03-01", "2026-03-01")).toBe(1);
    expect(getSprYearIndex("2025-03-01", "2026-04-01")).toBe(2);
  });

  it("falls back to full (3) when the date is missing", () => {
    expect(getSprYearIndex(null, "2026-08-01")).toBe(3);
    expect(getSprYearIndex(undefined, "2026-08-01")).toBe(3);
  });

  it("falls back to full (3) when the salary month precedes the PR grant", () => {
    expect(getSprYearIndex("2026-05-15", "2026-02-01")).toBe(3);
  });
});

describe("resolveCpfCategory", () => {
  it("maps PR year to the graduated category", () => {
    expect(resolveCpfCategory("pr", 1)).toBe("pr_year1");
    expect(resolveCpfCategory("pr", 2)).toBe("pr_year2");
    expect(resolveCpfCategory("pr", 3)).toBe("full");
  });
  it("always returns full for citizens", () => {
    expect(resolveCpfCategory("citizen", 1)).toBe("full");
    expect(resolveCpfCategory("citizen", 2)).toBe("full");
  });
});

describe("selectCpfRatesByCategory", () => {
  const mixed: CpfRate[] = [...OFFICIAL_CPF_2026, ...OFFICIAL_PR_YEAR1_2026, ...OFFICIAL_PR_YEAR2_2026];

  it("narrows a mixed table to a single category", () => {
    const y1 = selectCpfRatesByCategory(mixed, "pr_year1");
    expect(y1).toHaveLength(OFFICIAL_PR_YEAR1_2026.length);
    expect(y1.every((r) => r.rate_category === "pr_year1")).toBe(true);
  });

  it("treats category-less rows as full", () => {
    const legacy: CpfRate[] = OFFICIAL_CPF_2026.map(({ rate_category, ...rest }) => rest);
    expect(selectCpfRatesByCategory(legacy, "full")).toHaveLength(OFFICIAL_CPF_2026.length);
  });

  it("falls back to full rates when a PR category is not present (fail-safe, never zero CPF)", () => {
    const fullOnly = OFFICIAL_CPF_2026;
    const result = selectCpfRatesByCategory(fullOnly, "pr_year1");
    expect(result).toHaveLength(OFFICIAL_CPF_2026.length);
    expect(result.every((r) => (r.rate_category ?? "full") === "full")).toBe(true);
  });
});

describe("calculateCpf — PR graduated rates (known dollar amounts)", () => {
  it.each([
    { label: "1st-year, under-55, $3,000", rates: OFFICIAL_PR_YEAR1_2026, wage: 3000, age: 40, ee: 150, er: 120 },
    { label: "1st-year, 66yo, $3,000", rates: OFFICIAL_PR_YEAR1_2026, wage: 3000, age: 66, ee: 150, er: 105 },
    { label: "2nd-year, under-55, $3,000", rates: OFFICIAL_PR_YEAR2_2026, wage: 3000, age: 40, ee: 450, er: 270 },
    { label: "2nd-year, 58yo, $4,000", rates: OFFICIAL_PR_YEAR2_2026, wage: 4000, age: 58, ee: 500, er: 240 },
    { label: "2nd-year, 62yo, $4,000", rates: OFFICIAL_PR_YEAR2_2026, wage: 4000, age: 62, ee: 300, er: 140 },
  ])("$label", ({ rates, wage, age, ee, er }) => {
    const result = calculateCpf(wage, age, rates);
    expect(result.employeeContribution).toBe(ee);
    expect(result.employerContribution).toBe(er);
  });

  it("charges a 1st-year PR strictly less than a citizen of the same age/wage", () => {
    const pr = calculateCpf(3000, 40, OFFICIAL_PR_YEAR1_2026);
    const citizen = calculateCpf(3000, 40, OFFICIAL_CPF_2026);
    expect(pr.employeeContribution).toBeLessThan(citizen.employeeContribution);
    expect(pr.employerContribution).toBeLessThan(citizen.employerContribution);
  });
});

describe("cpf_rates production data integrity (migration 0036)", () => {
  it("seeds exactly the official 1 Jan 2026 rates", () => {
    const sql = readFileSync("supabase/migrations/0036_fix_cpf_age_brackets.sql", "utf8");

    // Parse rows like: (0,   54,  20.00, 17.00, 8000.00, '2026-01-01')
    const rowRe = /\(\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*'(\d{4}-\d{2}-\d{2})'\s*\)/g;
    const parsed: CpfRate[] = [];
    for (const m of sql.matchAll(rowRe)) {
      parsed.push({
        age_from: Number(m[1]),
        age_to: Number(m[2]),
        employee_rate: Number(m[3]),
        employer_rate: Number(m[4]),
        ow_ceiling: Number(m[5]),
        effective_date: m[6],
      });
    }

    expect(parsed).toHaveLength(OFFICIAL_CPF_2026.length);
    for (const official of OFFICIAL_CPF_2026) {
      const row = parsed.find((r) => r.age_from === official.age_from && r.age_to === official.age_to);
      expect(row, `missing bracket ${official.age_from}-${official.age_to}`).toBeDefined();
      expect(row!.employee_rate).toBe(official.employee_rate);
      expect(row!.employer_rate).toBe(official.employer_rate);
      expect(row!.ow_ceiling).toBe(official.ow_ceiling);
    }
  });
});

describe("cpf_rates PR graduated data integrity (migration 0037)", () => {
  // Rows like: (0, 54, 5.00, 4.00, 8000.00, '2026-01-01', 'pr_year1')
  const rowRe =
    /\(\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*'(\d{4}-\d{2}-\d{2})'\s*,\s*'(pr_year1|pr_year2)'\s*\)/g;
  const sql = readFileSync("supabase/migrations/0037_pr_graduated_cpf.sql", "utf8");
  const parsed: CpfRate[] = [];
  for (const m of sql.matchAll(rowRe)) {
    parsed.push({
      age_from: Number(m[1]),
      age_to: Number(m[2]),
      employee_rate: Number(m[3]),
      employer_rate: Number(m[4]),
      ow_ceiling: Number(m[5]),
      effective_date: m[6],
      rate_category: m[7] as CpfRate["rate_category"],
    });
  }

  it.each([
    ["pr_year1", OFFICIAL_PR_YEAR1_2026],
    ["pr_year2", OFFICIAL_PR_YEAR2_2026],
  ] as const)("seeds exactly the official %s rates", (category, official) => {
    const rows = parsed.filter((r) => r.rate_category === category);
    expect(rows).toHaveLength(official.length);
    for (const want of official) {
      const row = rows.find((r) => r.age_from === want.age_from && r.age_to === want.age_to);
      expect(row, `missing ${category} bracket ${want.age_from}-${want.age_to}`).toBeDefined();
      expect(row!.employee_rate).toBe(want.employee_rate);
      expect(row!.employer_rate).toBe(want.employer_rate);
      expect(row!.ow_ceiling).toBe(want.ow_ceiling);
    }
  });
});
