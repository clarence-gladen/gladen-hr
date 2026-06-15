create table payroll_runs (
  id uuid primary key default gen_random_uuid(),
  month int not null check (month between 1 and 12),
  year int not null,
  status payroll_status not null default 'draft',
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique (month, year)
);

create table payslips (
  id uuid primary key default gen_random_uuid(),
  payroll_run_id uuid not null references payroll_runs(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  basic_salary numeric(10,2) not null default 0,
  overtime_amount numeric(10,2) not null default 0,
  allowances numeric(10,2) not null default 0,
  reimbursements numeric(10,2) not null default 0,
  deductions numeric(10,2) not null default 0,
  salary_advance_deduction numeric(10,2) not null default 0,
  cpf_employee numeric(10,2) not null default 0,
  cpf_employer numeric(10,2) not null default 0,
  fwl_amount numeric(10,2) not null default 0,
  sdl_amount numeric(10,2) not null default 0,
  net_pay numeric(10,2) not null default 0,
  pdf_url text,
  whatsapp_sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (payroll_run_id, employee_id)
);

create table salary_advances (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  amount numeric(10,2) not null,
  request_date date not null default current_date,
  status approval_status not null default 'pending',
  repaid boolean not null default false,
  repaid_in_payslip_id uuid references payslips(id),
  notes text,
  approved_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table reimbursement_claims (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  claim_type text not null default 'medical',
  amount numeric(10,2) not null,
  receipt_url text,
  description text,
  status approval_status not null default 'pending',
  paid boolean not null default false,
  paid_in_payslip_id uuid references payslips(id),
  approved_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- Statutory contribution rate configs (manager-editable; rates change periodically)
create table cpf_rates (
  id uuid primary key default gen_random_uuid(),
  age_from int not null,
  age_to int not null,
  employee_rate numeric(5,2) not null, -- percent of wage
  employer_rate numeric(5,2) not null, -- percent of wage
  ow_ceiling numeric(10,2) not null default 7400,
  effective_date date not null,
  unique (age_from, age_to, effective_date)
);

create table fwl_rates (
  id uuid primary key default gen_random_uuid(),
  residency_status residency_status not null,
  skill_level text not null default 'basic_skilled', -- 'basic_skilled' | 'higher_skilled'
  monthly_levy numeric(10,2) not null,
  effective_date date not null
);

create table sdl_config (
  id uuid primary key default gen_random_uuid(),
  min_levy numeric(6,2) not null default 2,
  max_levy numeric(6,2) not null default 11.25,
  rate numeric(5,4) not null default 0.0025,
  lower_wage_threshold numeric(10,2) not null default 800,
  upper_wage_threshold numeric(10,2) not null default 4500,
  effective_date date not null default current_date
);

-- Seed data: VERIFY against current CPF Board / MOM rates before going live.
-- These are indicative rates and may be out of date.
insert into cpf_rates (age_from, age_to, employee_rate, employer_rate, ow_ceiling, effective_date) values
  (0, 55, 20.0, 17.0, 7400, '2026-01-01'),
  (56, 60, 17.0, 15.5, 7400, '2026-01-01'),
  (61, 65, 11.5, 12.0, 7400, '2026-01-01'),
  (66, 70, 7.5, 9.0, 7400, '2026-01-01'),
  (71, 200, 5.0, 7.5, 7400, '2026-01-01');

insert into fwl_rates (residency_status, skill_level, monthly_levy, effective_date) values
  ('work_permit', 'basic_skilled', 300, '2026-01-01'),
  ('work_permit', 'higher_skilled', 250, '2026-01-01'),
  ('s_pass', 'basic_skilled', 450, '2026-01-01');

insert into sdl_config (min_levy, max_levy, rate, lower_wage_threshold, upper_wage_threshold, effective_date) values
  (2, 11.25, 0.0025, 800, 4500, '2026-01-01');
