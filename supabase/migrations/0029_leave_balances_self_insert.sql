-- Allow employees to insert their own leave_balances rows.
-- Without this, ensureLeaveBalances() silently fails in the employee's session
-- context (RLS only had SELECT for employees), so any employee added after
-- migration 0027 would never get their balance rows created.
CREATE POLICY "leave_balances_self_insert" ON leave_balances
  FOR INSERT WITH CHECK (employee_id = current_employee_id());
