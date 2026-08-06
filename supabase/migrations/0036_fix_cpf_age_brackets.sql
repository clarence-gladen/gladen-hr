-- 0036_fix_cpf_age_brackets.sql
-- Fix off-by-one CPF age brackets.
--
-- The 2026-01-01 brackets were each shifted ONE YEAR too high, so employees at the
-- exact CPF threshold ages (55 / 60 / 65 / 70) were placed in the younger, higher-rate
-- band and OVER-charged CPF. The contribution RATES were correct; only the age bounds
-- were wrong. Corrected bounds (age as at the first day of the salary month):
--   0-54  : 55 & below        20 / 17
--   55-59 : Above 55 to 60    18 / 16
--   60-64 : Above 60 to 65    12.5 / 12.5
--   65-69 : Above 65 to 70    7.5 / 9
--   70+   : Above 70          5 / 7.5

DELETE FROM cpf_rates WHERE effective_date = '2026-01-01';

INSERT INTO cpf_rates (age_from, age_to, employee_rate, employer_rate, ow_ceiling, effective_date) VALUES
  (0,   54,  20.00, 17.00, 8000.00, '2026-01-01'),
  (55,  59,  18.00, 16.00, 8000.00, '2026-01-01'),
  (60,  64,  12.50, 12.50, 8000.00, '2026-01-01'),
  (65,  69,   7.50,  9.00, 8000.00, '2026-01-01'),
  (70,  200,  5.00,  7.50, 8000.00, '2026-01-01');
