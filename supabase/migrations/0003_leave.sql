-- Annual / sick / hospitalization leave balances, tracked per calendar year
create table leave_balances (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  year int not null,
  annual_entitlement numeric(4,1) not null default 0,
  annual_used numeric(4,1) not null default 0,
  sick_entitlement numeric(4,1) not null default 0,
  sick_used numeric(4,1) not null default 0,
  hospitalization_entitlement numeric(4,1) not null default 0,
  hospitalization_used numeric(4,1) not null default 0,
  unique (employee_id, year)
);

create table leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  leave_type leave_type not null,
  start_date date not null,
  end_date date not null,
  days numeric(4,1) not null,
  reason text,
  status approval_status not null default 'pending',
  mc_document_url text,
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

-- Company-wide dates blocked off in advance (e.g. peak periods, blackout dates)
create table leave_blocked_dates (
  id uuid primary key default gen_random_uuid(),
  start_date date not null,
  end_date date not null,
  reason text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
