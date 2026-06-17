-- Fix statutory rates as of 1 January 2026
-- CPF: correct OW ceiling ($7,400 → $8,000) and age-bracket rates for 56-65
-- FWL: switch to Services sector rates; S Pass unified at $650 (effective 1 Sep 2025)
-- SDL: unchanged (0.25%, min $2, max $11.25)
-- Sources:
--   CPF: https://www.cpf.gov.sg/employer/employer-obligations/how-much-cpf-contributions-to-pay
--   FWL: https://www.mom.gov.sg/passes-and-permits/work-permit-for-foreign-worker/sector-specific-rules/services-sector-requirements
--   SDL: https://skillsfuture.gobusiness.gov.sg/skills-development-levy

-- ── CPF rates ────────────────────────────────────────────────────────────────
-- Age brackets use "age on last birthday" as at the first day of the salary month.
-- employee_rate / employer_rate are percentages of Ordinary Wage (up to ow_ceiling).

DELETE FROM cpf_rates WHERE effective_date = '2026-01-01';

INSERT INTO cpf_rates (age_from, age_to, employee_rate, employer_rate, ow_ceiling, effective_date) VALUES
  -- 55 and below: unchanged
  (0,   55,  20.00, 17.00, 8000.00, '2026-01-01'),
  -- Above 55 to 60: increased by +1% employee, +0.5% employer from 1 Jan 2026
  (56,  60,  18.00, 16.00, 8000.00, '2026-01-01'),
  -- Above 60 to 65: increased by +1% employee, +0.5% employer from 1 Jan 2026
  (61,  65,  12.50, 12.50, 8000.00, '2026-01-01'),
  -- Above 65 to 70: unchanged
  (66,  70,   7.50,  9.00, 8000.00, '2026-01-01'),
  -- Above 70: unchanged
  (71,  200,  5.00,  7.50, 8000.00, '2026-01-01');

-- ── FWL rates (Services sector) ───────────────────────────────────────────────
-- Tier is determined by the company's foreign worker quota utilisation.
-- Rows below represent Tier 1 (≤10% of total workforce) — the most common starting point.
-- Update to Tier 2 or Tier 3 rates if your FW headcount exceeds the Tier 1 quota.
-- Tier 1  (≤10%):  basic_skilled $450 / higher_skilled $300
-- Tier 2  (>10–25%): basic_skilled $600 / higher_skilled $400
-- Tier 3  (>25–35%): basic_skilled $800 / higher_skilled $600

DELETE FROM fwl_rates WHERE effective_date = '2026-01-01';

INSERT INTO fwl_rates (residency_status, skill_level, monthly_levy, effective_date) VALUES
  -- Work Permit — Services sector Tier 1 (default; update if in higher tier)
  ('work_permit', 'basic_skilled',    450.00, '2026-01-01'),
  ('work_permit', 'higher_skilled',   300.00, '2026-01-01'),
  -- S Pass — unified rate from 1 September 2025 (sector-agnostic)
  ('s_pass',      'basic_skilled',    650.00, '2026-01-01'),
  ('s_pass',      'higher_skilled',   650.00, '2026-01-01');

-- ── SDL config ────────────────────────────────────────────────────────────────
-- 0.25% of monthly wages; $2 minimum (wages < $800); $11.25 maximum (wages > $4,500)
-- No changes to SDL rate in 2026.
INSERT INTO sdl_config (min_levy, max_levy, rate, lower_wage_threshold, upper_wage_threshold, effective_date)
VALUES (2.00, 11.25, 0.0025, 800.00, 4500.00, '2026-01-01')
ON CONFLICT DO NOTHING;
