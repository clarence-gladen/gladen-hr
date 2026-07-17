-- Supervisor OT logging: supervisors (flagged employees) record period-based
-- overtime for workers at their assigned sites. Separate from the dollar-based
-- overtime_records table — this log does NOT feed payroll.

-- 1. Supervisor flag on employees
alter table employees
  add column is_supervisor boolean not null default false;

-- 2. Which sites (contracts) each supervisor covers
create table supervisor_sites (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  contract_id uuid not null references contracts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (employee_id, contract_id)
);

-- 3. Period-based OT entries
create table ot_entries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  contract_id uuid references contracts(id) on delete set null,
  work_date date not null,
  period text not null,
  hours numeric(4,1),
  comment text,
  -- references profiles (1:1 with auth.users) so the manager UI can join the
  -- logger's name via PostgREST
  created_by uuid default auth.uid() references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger ot_entries_set_updated_at
  before update on ot_entries
  for each row execute function set_updated_at();

-- 4. Helper: is the current user a supervisor?
create or replace function is_supervisor()
returns boolean as $$
  select exists (
    select 1 from employees
    where id = current_employee_id() and is_supervisor
  );
$$ language sql security definer stable;

-- 5. RLS
alter table supervisor_sites enable row level security;
alter table ot_entries enable row level security;

create policy "supervisor_sites_manager_all" on supervisor_sites
  for all using (is_manager()) with check (is_manager());
create policy "supervisor_sites_self_select" on supervisor_sites
  for select using (employee_id = current_employee_id());

create policy "ot_entries_manager_all" on ot_entries
  for all using (is_manager()) with check (is_manager());

-- Supervisors see their own submissions
create policy "ot_entries_supervisor_select" on ot_entries
  for select using (created_by = auth.uid());

-- Supervisors may insert only for employees assigned to their covered sites
create policy "ot_entries_supervisor_insert" on ot_entries
  for insert with check (
    is_supervisor()
    and created_by = auth.uid()
    and exists (
      select 1
      from supervisor_sites ss
      join contract_assignments ca on ca.contract_id = ss.contract_id
      where ss.employee_id = current_employee_id()
        and ca.employee_id = ot_entries.employee_id
        and ss.contract_id = ot_entries.contract_id
    )
  );

-- Supervisors may edit/delete their own entries (same site scope on edit)
create policy "ot_entries_supervisor_update" on ot_entries
  for update using (created_by = auth.uid() and is_supervisor())
  with check (
    created_by = auth.uid()
    and exists (
      select 1
      from supervisor_sites ss
      join contract_assignments ca on ca.contract_id = ss.contract_id
      where ss.employee_id = current_employee_id()
        and ca.employee_id = ot_entries.employee_id
        and ss.contract_id = ot_entries.contract_id
    )
  );
create policy "ot_entries_supervisor_delete" on ot_entries
  for delete using (created_by = auth.uid() and is_supervisor());

-- 6. RPCs so supervisors never need raw read access to employees/contracts
--    (keeps salary and contract value columns hidden from them).

create or replace function get_supervisor_sites()
returns table(contract_id uuid, client_name text, site_name text)
language sql security definer stable set search_path = public as $$
  select c.id, c.client_name, c.site_name
  from supervisor_sites ss
  join contracts c on c.id = ss.contract_id
  where ss.employee_id = current_employee_id()
    and c.status = 'active'
  order by c.site_name;
$$;
grant execute on function get_supervisor_sites() to authenticated;

create or replace function get_supervisor_employees()
returns table(employee_id uuid, full_name text, contract_id uuid, site_name text)
language sql security definer stable set search_path = public as $$
  select distinct e.id, e.full_name, c.id, c.site_name
  from supervisor_sites ss
  join contracts c on c.id = ss.contract_id
  join contract_assignments ca on ca.contract_id = ss.contract_id
  join employees e on e.id = ca.employee_id
  where ss.employee_id = current_employee_id()
    and c.status = 'active'
    and e.status = 'active'
    and (ca.assigned_to is null or ca.assigned_to >= current_date)
  order by c.site_name, e.full_name;
$$;
grant execute on function get_supervisor_employees() to authenticated;

create or replace function get_supervisor_ot_entries()
returns table(
  id uuid,
  employee_id uuid,
  employee_name text,
  site_name text,
  work_date date,
  period text,
  hours numeric,
  comment text,
  contract_id uuid
)
language sql security definer stable set search_path = public as $$
  select o.id, o.employee_id, e.full_name, c.site_name,
         o.work_date, o.period, o.hours, o.comment, o.contract_id
  from ot_entries o
  join employees e on e.id = o.employee_id
  left join contracts c on c.id = o.contract_id
  where o.created_by = auth.uid()
  order by o.work_date desc, o.created_at desc
  limit 200;
$$;
grant execute on function get_supervisor_ot_entries() to authenticated;
