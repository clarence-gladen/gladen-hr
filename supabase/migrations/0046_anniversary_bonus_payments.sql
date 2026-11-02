-- 0046_anniversary_bonus_payments.sql
-- Tracks whether the anniversary bonus has been paid, per employee per anniversary.
-- Manually toggled by a manager on /manager/anniversaries. No row = Unpaid.

create table anniversary_bonus_payments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  anniversary_date date not null,
  paid boolean not null default false,
  updated_by uuid references auth.users(id) default auth.uid(),
  updated_at timestamptz not null default now(),
  unique (employee_id, anniversary_date)
);

alter table anniversary_bonus_payments enable row level security;

-- Manager-only: internal payroll tracking.
create policy anniversary_bonus_payments_select on anniversary_bonus_payments
  for select using (is_manager());
create policy anniversary_bonus_payments_insert on anniversary_bonus_payments
  for insert with check (is_manager());
create policy anniversary_bonus_payments_update on anniversary_bonus_payments
  for update using (is_manager()) with check (is_manager());
