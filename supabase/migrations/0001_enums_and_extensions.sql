-- Extensions
create extension if not exists pgcrypto;

-- Enums
create type user_role as enum ('manager', 'employee');
create type residency_status as enum ('citizen', 'pr', 'work_permit', 's_pass');
create type leave_type as enum ('annual', 'sick', 'hospitalization');
create type approval_status as enum ('pending', 'approved', 'rejected');
create type document_type as enum ('work_permit', 'passport', 'mom_doc', 'employment_contract', 'other');
create type contract_status as enum ('active', 'completed', 'terminated');
create type expense_type as enum ('fixed', 'one_off');
create type payroll_status as enum ('draft', 'processing', 'completed');
create type announcement_audience as enum ('all', 'selected');
create type employee_status as enum ('active', 'inactive');

-- Generic updated_at trigger
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;
