-- 0037_pr_graduated_cpf.sql
-- Graduated CPF contribution rates for 1st- and 2nd-year Singapore PRs.
--
-- Before this, cpf_rates held a single rate set (full/citizen rates) that was
-- applied to BOTH citizens and PRs. New PRs pay lower "Graduated / Graduated"
-- (G/G) rates for their first two years of PR status (CPF Board Tables 2 & 3),
-- so any 1st/2nd-year PR was being OVER-CHARGED CPF — the same class of bug as
-- the 2026 age-bracket off-by-one.
--
-- Adds a rate_category dimension ('full' | 'pr_year1' | 'pr_year2'), seeds the
-- official G/G rates effective 1 Jan 2026, and adds employees.spr_effective_date
-- to derive an employee's PR year. Employees with a NULL spr_effective_date keep
-- full rates (unchanged behaviour) — so this is a safe, non-regressive change.
--
-- Source: CPF Board "CPF contribution rates from 1 Jan 2026", Tables 2 (1st year
-- SPR G/G) and 3 (2nd year SPR G/G). OW ceiling $8,000.

-- 1. rate_category on cpf_rates; every existing row is the full/citizen rate set.
ALTER TABLE cpf_rates ADD COLUMN IF NOT EXISTS rate_category text NOT NULL DEFAULT 'full';

-- 2. Widen uniqueness to include rate_category so PR rows can share age band + date.
ALTER TABLE cpf_rates DROP CONSTRAINT IF EXISTS cpf_rates_age_from_age_to_effective_date_key;
ALTER TABLE cpf_rates ADD CONSTRAINT cpf_rates_bracket_key
  UNIQUE (age_from, age_to, effective_date, rate_category);

-- 3a. 1st-year SPR (G/G) — CPF Board Table 2.
--     <=55 & 55-60: 5 / 4 (9% total).  60-65 & >65: 5 / 3.5 (8.5% total).
INSERT INTO cpf_rates (age_from, age_to, employee_rate, employer_rate, ow_ceiling, effective_date, rate_category) VALUES
  (0,   54,  5.00, 4.00, 8000.00, '2026-01-01', 'pr_year1'),
  (55,  59,  5.00, 4.00, 8000.00, '2026-01-01', 'pr_year1'),
  (60,  64,  5.00, 3.50, 8000.00, '2026-01-01', 'pr_year1'),
  (65,  200, 5.00, 3.50, 8000.00, '2026-01-01', 'pr_year1')
ON CONFLICT (age_from, age_to, effective_date, rate_category) DO UPDATE
  SET employee_rate = EXCLUDED.employee_rate,
      employer_rate = EXCLUDED.employer_rate,
      ow_ceiling    = EXCLUDED.ow_ceiling;

-- 3b. 2nd-year SPR (G/G) — CPF Board Table 3.
--     <=55: 15/9 (24%).  55-60: 12.5/6 (18.5%).  60-65: 7.5/3.5 (11%).  >65: 5/3.5 (8.5%).
INSERT INTO cpf_rates (age_from, age_to, employee_rate, employer_rate, ow_ceiling, effective_date, rate_category) VALUES
  (0,   54,  15.00, 9.00, 8000.00, '2026-01-01', 'pr_year2'),
  (55,  59,  12.50, 6.00, 8000.00, '2026-01-01', 'pr_year2'),
  (60,  64,   7.50, 3.50, 8000.00, '2026-01-01', 'pr_year2'),
  (65,  200,  5.00, 3.50, 8000.00, '2026-01-01', 'pr_year2')
ON CONFLICT (age_from, age_to, effective_date, rate_category) DO UPDATE
  SET employee_rate = EXCLUDED.employee_rate,
      employer_rate = EXCLUDED.employer_rate,
      ow_ceiling    = EXCLUDED.ow_ceiling;

-- 4. Capture PR conversion date to derive the PR year. NULL = unknown -> full rates.
ALTER TABLE employees ADD COLUMN IF NOT EXISTS spr_effective_date date;
COMMENT ON COLUMN employees.spr_effective_date IS
  'Date the employee obtained Singapore PR status. Drives 1st/2nd-year graduated CPF rates. NULL = treat as full (3rd-year+) rates.';
