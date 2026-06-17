alter table employees
  add column if not exists work_days_per_week int not null default 5
  check (work_days_per_week in (5, 6));
