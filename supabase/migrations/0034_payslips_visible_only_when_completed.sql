-- Employees must not see a payslip until its payroll run is finalised.
-- Previously payslips_self_select exposed a payslip as soon as it was generated
-- (run status 'draft'/'processing'), so employees could view an in-progress
-- month before the manager clicked Finalise. Gate visibility on the run being
-- 'completed'. Managers are unaffected (they use payslips_manager_all).
drop policy "payslips_self_select" on payslips;
create policy "payslips_self_select" on payslips
  for select using (
    employee_id = current_employee_id()
    and exists (
      select 1 from payroll_runs r
      where r.id = payslips.payroll_run_id
        and r.status = 'completed'
    )
  );
