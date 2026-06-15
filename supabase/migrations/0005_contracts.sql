create table contracts (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  site_name text not null,
  start_date date not null,
  end_date date,
  monthly_value numeric(10,2) not null,
  status contract_status not null default 'active',
  created_at timestamptz not null default now()
);

create table contract_assignments (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  role_on_site text,
  assigned_from date not null default current_date,
  assigned_to date
);

create table contract_expenses (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  expense_type expense_type not null,
  description text not null,
  amount numeric(10,2) not null,
  expense_date date not null default current_date,
  created_at timestamptz not null default now()
);
