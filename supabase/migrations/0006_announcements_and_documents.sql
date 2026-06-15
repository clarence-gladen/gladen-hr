create table announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  audience announcement_audience not null default 'all',
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- Only populated when audience = 'selected'
create table announcement_targets (
  announcement_id uuid not null references announcements(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  primary key (announcement_id, employee_id)
);

create table announcement_reads (
  announcement_id uuid not null references announcements(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (announcement_id, employee_id)
);

-- Work permits, passports, MOM docs, etc. expiry_date drives alert jobs.
create table documents (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  document_type document_type not null,
  file_url text not null,
  expiry_date date,
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
