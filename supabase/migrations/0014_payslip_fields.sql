alter table payslips
  add column if not exists transport_allowance numeric(10,2) not null default 0,
  add column if not exists mid_month_payment numeric(10,2) not null default 0;
