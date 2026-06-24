-- ============================================================
-- BULK EMPLOYEE IMPORT — PART C (Leave Balances)
-- Run after Part A and Part B.
--
-- Inserts all missing employment-year rows for every employee.
-- Safe to re-run — ON CONFLICT DO NOTHING skips existing rows.
-- ============================================================

INSERT INTO leave_balances (employee_id, year_start, year_end, employment_year)
SELECT
  e.id,
  (e.employment_start_date + ((yr - 1) * INTERVAL '1 year'))::date AS year_start,
  (e.employment_start_date + (yr * INTERVAL '1 year') - INTERVAL '1 day')::date AS year_end,
  yr AS employment_year
FROM employees e
CROSS JOIN LATERAL generate_series(
  1,
  GREATEST(1, EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.employment_start_date))::int + 1)
) AS yr
ON CONFLICT (employee_id, year_start) DO NOTHING;
