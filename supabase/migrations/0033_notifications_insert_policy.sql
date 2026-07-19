-- Fix: "Payslip Ready" notifications silently failed to send.
--
-- The notifications table had select + update policies but NO insert policy.
-- When payroll is finalised, the server action inserts notification rows for
-- employees while running as the manager (RLS-enforced authenticated session).
-- With no insert policy, RLS blocked every row and the error was ignored, so
-- employees never received a payslip-ready notification.
--
-- Leave notifications were unaffected because they are inserted inside
-- SECURITY DEFINER functions/triggers, which bypass RLS.
--
-- Managers are trusted admins in this app, so allow them to insert notifications
-- (this is how the manager delivers payslip-ready alerts to employees).
create policy "notifications_manager_insert" on notifications
  for insert with check (is_manager());
