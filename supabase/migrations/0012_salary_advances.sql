-- Replace the single repaid/repaid_in_payslip_id flags with proper
-- installment tracking, so an advance can be repaid over several payroll runs.
alter table salary_advances
  add column repayment_amount_per_month numeric(10,2),
  add column status_updated_at timestamptz;

alter table salary_advances drop column repaid;
alter table salary_advances drop column repaid_in_payslip_id;

-- Each row records a deduction applied towards a salary advance in a
-- specific payroll run.
create table salary_advance_repayments (
  id uuid primary key default gen_random_uuid(),
  salary_advance_id uuid not null references salary_advances(id) on delete cascade,
  payslip_id uuid not null references payslips(id) on delete cascade,
  amount numeric(10,2) not null,
  created_at timestamptz not null default now(),
  unique (salary_advance_id, payslip_id)
);

alter table salary_advance_repayments enable row level security;

create policy "salary_advance_repayments_manager_all" on salary_advance_repayments
  for all using (is_manager()) with check (is_manager());

create policy "salary_advance_repayments_self_select" on salary_advance_repayments
  for select using (
    salary_advance_id in (
      select id from salary_advances where employee_id = current_employee_id()
    )
  );

-- Outstanding balance for an approved advance: amount minus repayments made so far.
create or replace function salary_advance_outstanding(advance_id uuid)
returns numeric as $$
  select sa.amount - coalesce(sum(sar.amount), 0)
  from salary_advances sa
  left join salary_advance_repayments sar on sar.salary_advance_id = sa.id
  where sa.id = advance_id
  group by sa.id, sa.amount;
$$ language sql stable;
