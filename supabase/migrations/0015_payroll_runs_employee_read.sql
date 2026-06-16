-- Allow authenticated employees to read payroll run metadata (month, year, status)
-- so the payslips list page can display the period label.
-- payroll_runs contains no salary data, only month/year/status.
create policy "payroll_runs_authenticated_select" on payroll_runs
  for select to authenticated using (true);
