-- Enable RLS on every table
alter table profiles enable row level security;
alter table employees enable row level security;
alter table leave_balances enable row level security;
alter table leave_requests enable row level security;
alter table leave_blocked_dates enable row level security;
alter table payroll_runs enable row level security;
alter table payslips enable row level security;
alter table salary_advances enable row level security;
alter table reimbursement_claims enable row level security;
alter table cpf_rates enable row level security;
alter table fwl_rates enable row level security;
alter table sdl_config enable row level security;
alter table contracts enable row level security;
alter table contract_assignments enable row level security;
alter table contract_expenses enable row level security;
alter table announcements enable row level security;
alter table announcement_targets enable row level security;
alter table announcement_reads enable row level security;
alter table documents enable row level security;

-- profiles: users see/update their own row; managers see everyone
create policy "profiles_select_own_or_manager" on profiles
  for select using (id = auth.uid() or is_manager());
create policy "profiles_update_own" on profiles
  for update using (id = auth.uid());
create policy "profiles_manager_write" on profiles
  for all using (is_manager()) with check (is_manager());

-- employees: managers full access; employees can read their own record
create policy "employees_manager_all" on employees
  for all using (is_manager()) with check (is_manager());
create policy "employees_self_select" on employees
  for select using (id = current_employee_id());

-- leave_balances: managers full access; employees read their own
create policy "leave_balances_manager_all" on leave_balances
  for all using (is_manager()) with check (is_manager());
create policy "leave_balances_self_select" on leave_balances
  for select using (employee_id = current_employee_id());

-- leave_requests: managers full access; employees manage their own
create policy "leave_requests_manager_all" on leave_requests
  for all using (is_manager()) with check (is_manager());
create policy "leave_requests_self_select" on leave_requests
  for select using (employee_id = current_employee_id());
create policy "leave_requests_self_insert" on leave_requests
  for insert with check (
    employee_id = current_employee_id() and status = 'pending'
  );
create policy "leave_requests_self_cancel" on leave_requests
  for update using (
    employee_id = current_employee_id() and status = 'pending'
  ) with check (
    employee_id = current_employee_id()
  );

-- leave_blocked_dates: everyone can view; only managers manage
create policy "leave_blocked_dates_select_all" on leave_blocked_dates
  for select using (true);
create policy "leave_blocked_dates_manager_write" on leave_blocked_dates
  for insert with check (is_manager());
create policy "leave_blocked_dates_manager_update" on leave_blocked_dates
  for update using (is_manager());
create policy "leave_blocked_dates_manager_delete" on leave_blocked_dates
  for delete using (is_manager());

-- payroll_runs: managers only
create policy "payroll_runs_manager_all" on payroll_runs
  for all using (is_manager()) with check (is_manager());

-- payslips: managers full access; employees read their own
create policy "payslips_manager_all" on payslips
  for all using (is_manager()) with check (is_manager());
create policy "payslips_self_select" on payslips
  for select using (employee_id = current_employee_id());

-- salary_advances: managers full access; employees view/request their own
create policy "salary_advances_manager_all" on salary_advances
  for all using (is_manager()) with check (is_manager());
create policy "salary_advances_self_select" on salary_advances
  for select using (employee_id = current_employee_id());
create policy "salary_advances_self_insert" on salary_advances
  for insert with check (
    employee_id = current_employee_id() and status = 'pending'
  );

-- reimbursement_claims: managers full access; employees view/submit their own
create policy "reimbursement_claims_manager_all" on reimbursement_claims
  for all using (is_manager()) with check (is_manager());
create policy "reimbursement_claims_self_select" on reimbursement_claims
  for select using (employee_id = current_employee_id());
create policy "reimbursement_claims_self_insert" on reimbursement_claims
  for insert with check (
    employee_id = current_employee_id() and status = 'pending'
  );

-- statutory rate configs: managers only
create policy "cpf_rates_manager_all" on cpf_rates
  for all using (is_manager()) with check (is_manager());
create policy "fwl_rates_manager_all" on fwl_rates
  for all using (is_manager()) with check (is_manager());
create policy "sdl_config_manager_all" on sdl_config
  for all using (is_manager()) with check (is_manager());

-- contracts & P&L: managers only (not exposed to employee portal)
create policy "contracts_manager_all" on contracts
  for all using (is_manager()) with check (is_manager());
create policy "contract_assignments_manager_all" on contract_assignments
  for all using (is_manager()) with check (is_manager());
create policy "contract_expenses_manager_all" on contract_expenses
  for all using (is_manager()) with check (is_manager());

-- announcements: managers manage; employees read what's targeted to them
create policy "announcements_manager_all" on announcements
  for all using (is_manager()) with check (is_manager());
create policy "announcements_self_select" on announcements
  for select using (
    audience = 'all'
    or exists (
      select 1 from announcement_targets t
      where t.announcement_id = announcements.id
        and t.employee_id = current_employee_id()
    )
  );

create policy "announcement_targets_manager_all" on announcement_targets
  for all using (is_manager()) with check (is_manager());
create policy "announcement_targets_self_select" on announcement_targets
  for select using (employee_id = current_employee_id());

create policy "announcement_reads_manager_select" on announcement_reads
  for select using (is_manager());
create policy "announcement_reads_self_all" on announcement_reads
  for all using (employee_id = current_employee_id())
  with check (employee_id = current_employee_id());

-- documents: managers full access; employees manage their own
create policy "documents_manager_all" on documents
  for all using (is_manager()) with check (is_manager());
create policy "documents_self_select" on documents
  for select using (employee_id = current_employee_id());
create policy "documents_self_insert" on documents
  for insert with check (employee_id = current_employee_id());
