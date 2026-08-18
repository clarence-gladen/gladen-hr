-- 0041_service_reports.sql
-- Monthly customer service report (Site Ops feature 4).
--
-- The report content is derived from checklist_completions (the source of truth);
-- this table only stores the manager's EDITABLE overrides for a given site+month
-- (remarks, supervisor sign-off name, cover message, and any tasks to exclude),
-- so the review-and-edit choices persist and pre-fill next time. There is no
-- send/email step — the manager downloads the PDF and sends it themselves.

create table service_reports (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  year integer not null,
  month integer not null check (month between 1 and 12),
  remarks text,
  supervisor_name text,
  cover_message text,
  excluded_item_ids uuid[] not null default '{}',
  updated_at timestamptz not null default now(),
  unique (contract_id, year, month)
);

alter table service_reports enable row level security;

-- Manager-only: this is an internal review/edit surface.
create policy service_reports_select on service_reports
  for select using (is_manager());
create policy service_reports_insert on service_reports
  for insert with check (is_manager());
create policy service_reports_update on service_reports
  for update using (is_manager()) with check (is_manager());
