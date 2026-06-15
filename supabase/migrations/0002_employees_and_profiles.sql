-- Employees: core HR record
create table employees (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  nric_encrypted bytea not null,      -- pgp_sym_encrypt(nric, app_secret)
  nric_last4 text not null,           -- for display/search without decrypting
  date_of_birth date not null,
  mobile_number text not null unique,
  residency_status residency_status not null,
  designation text,
  employment_start_date date not null,
  base_salary numeric(10,2) not null default 0,
  bank_name text,
  bank_account_number text,
  status employee_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger employees_set_updated_at
  before update on employees
  for each row execute function set_updated_at();

-- Profiles: 1:1 with auth.users, links a login to an employee record + role
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'employee',
  employee_id uuid references employees(id) on delete set null,
  full_name text,
  created_at timestamptz not null default now()
);

-- Helper: returns true if the current user is a manager
create or replace function is_manager()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'manager'
  );
$$ language sql security definer stable;

-- Helper: returns the employee_id linked to the current user
create or replace function current_employee_id()
returns uuid as $$
  select employee_id from profiles where id = auth.uid();
$$ language sql security definer stable;
