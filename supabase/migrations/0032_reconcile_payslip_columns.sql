-- Reconcile payslips schema drift. These two columns were added directly in the
-- Supabase dashboard and were never captured in a migration, so rebuilding the
-- database from migrations produced a schema that broke payroll (the app reads
-- and writes both columns). Idempotent: no-ops in environments that already have
-- them (i.e. production), and adds them where they are missing.
alter table payslips
  add column if not exists reimbursement numeric(10,2) not null default 0,
  add column if not exists unpaid_leave numeric(10,2) not null default 0;

-- Note: payslips.reimbursements (plural, from migration 0004) is a deprecated
-- orphan, superseded by reimbursement (singular) above. It is unused by the
-- application. Left in place to avoid a destructive column drop on a payroll
-- table; safe to remove in a future migration once confirmed unused everywhere.
