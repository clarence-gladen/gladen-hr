-- 0040_cleaning_checklist.sql
-- Cleaning checklist (Site Ops feature 3). Managers define per-site tasks;
-- cleaners tick them off on mobile. Gated behind employees.feature_checklist.
--
-- Model: tasks belong directly to a site (contract). Completions are SITE-WIDE
-- (one tick per task per day by whoever is on shift), which is what a customer
-- "proof of service" report needs; the completing employee is recorded.
--
-- Ticking REQUIRES being checked in on that site (per the agreed design), which
-- is enforced server-side in the complete_checklist_item RPC. Photo capture is
-- deferred: requires_photo + photo_path exist so the UI can be added without a
-- schema change.

create table checklist_items (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  description text not null,
  frequency text not null default 'daily' check (frequency in ('daily', 'weekly', 'monthly')),
  area text,
  requires_photo boolean not null default false,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index checklist_items_contract_idx on checklist_items (contract_id, sort_order);

create table checklist_completions (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  item_id uuid not null references checklist_items(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  done_date date not null,          -- Singapore calendar date
  done_at timestamptz not null default now(),
  note text,
  photo_path text,
  unique (item_id, done_date)        -- one completion per task per day (site-wide)
);
create index checklist_completions_contract_date_idx on checklist_completions (contract_id, done_date);

-- True if the current user is actively assigned to a site today.
create or replace function is_assigned_to_site(p_contract_id uuid)
returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from contract_assignments ca
    where ca.contract_id = p_contract_id
      and ca.employee_id = current_employee_id()
      and ca.assigned_from <= (now() at time zone 'Asia/Singapore')::date
      and (ca.assigned_to is null or ca.assigned_to >= (now() at time zone 'Asia/Singapore')::date)
  );
$$;

alter table checklist_items enable row level security;
alter table checklist_completions enable row level security;

-- Items: assigned cleaners + managers/supervisors can read; managers manage.
create policy checklist_items_select on checklist_items
  for select using (is_assigned_to_site(contract_id) or can_view_site_attendance(contract_id));
create policy checklist_items_insert on checklist_items
  for insert with check (is_manager());
create policy checklist_items_update on checklist_items
  for update using (is_manager()) with check (is_manager());
create policy checklist_items_delete on checklist_items
  for delete using (is_manager());

-- Completions: readable by assigned cleaners + site viewers. Writes go ONLY
-- through the RPCs below (no write policy), so the check-in requirement can't
-- be bypassed by a direct insert.
create policy checklist_completions_select on checklist_completions
  for select using (is_assigned_to_site(contract_id) or can_view_site_attendance(contract_id));

-- Is the current employee currently checked in (open, not checked out) at a site today?
create or replace function is_checked_in_now(p_contract_id uuid, p_emp uuid)
returns boolean
language sql security definer stable set search_path = public as $$
  select coalesce((
    select event_type = 'check_in'
    from attendance_events
    where employee_id = p_emp and contract_id = p_contract_id and status = 'accepted'
      and occurred_at >= (now() at time zone 'Asia/Singapore')::date
    order by occurred_at desc limit 1
  ), false);
$$;

-- Tick a task done for today. Requires the employee to be checked in on the
-- task's site. Idempotent: re-ticking updates the existing row for the day.
create or replace function complete_checklist_item(
  p_item_id uuid, p_note text default null, p_photo_path text default null
) returns checklist_completions
language plpgsql security definer set search_path = public as $$
declare
  v_emp uuid := current_employee_id();
  v_enabled boolean;
  v_contract uuid;
  v_today date := (now() at time zone 'Asia/Singapore')::date;
  v_row checklist_completions;
begin
  if v_emp is null then
    raise exception 'No employee profile for the current user.';
  end if;

  select feature_checklist into v_enabled from employees where id = v_emp;
  if not coalesce(v_enabled, false) then
    raise exception 'The checklist is not enabled for you.';
  end if;

  select contract_id into v_contract from checklist_items where id = p_item_id and active;
  if v_contract is null then
    raise exception 'Checklist item not found.';
  end if;

  if not is_assigned_to_site(v_contract) then
    raise exception 'You are not assigned to this site.';
  end if;

  if not is_checked_in_now(v_contract, v_emp) then
    raise exception 'Please check in on site before ticking off tasks.';
  end if;

  insert into checklist_completions (contract_id, item_id, employee_id, done_date, note, photo_path)
  values (v_contract, p_item_id, v_emp, v_today, p_note, p_photo_path)
  on conflict (item_id, done_date) do update
    set employee_id = excluded.employee_id,
        done_at = now(),
        note = excluded.note,
        photo_path = coalesce(excluded.photo_path, checklist_completions.photo_path)
  returning * into v_row;

  return v_row;
end;
$$;

-- Untick today's completion for a task (mistake correction). Same check-in guard.
create or replace function uncomplete_checklist_item(p_item_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_emp uuid := current_employee_id();
  v_contract uuid;
  v_today date := (now() at time zone 'Asia/Singapore')::date;
begin
  select contract_id into v_contract from checklist_items where id = p_item_id;
  if v_contract is null then return; end if;
  if not is_checked_in_now(v_contract, coalesce(v_emp, '00000000-0000-0000-0000-000000000000')) then
    raise exception 'Please check in on site before changing tasks.';
  end if;
  delete from checklist_completions where item_id = p_item_id and done_date = v_today;
end;
$$;

-- Lock internal helpers / RPCs to authenticated app users only.
-- Lock write RPCs to authenticated only. Revoking from anon alone leaves the
-- default PUBLIC grant intact, so revoke PUBLIC then re-grant to authenticated.
revoke execute on function complete_checklist_item(uuid, text, text) from public;
grant execute on function complete_checklist_item(uuid, text, text) to authenticated;
revoke execute on function uncomplete_checklist_item(uuid) from public;
grant execute on function uncomplete_checklist_item(uuid) to authenticated;
-- Internal-only helper: owner-executed inside the RPCs above; no caller grant.
revoke execute on function is_checked_in_now(uuid, uuid) from public;
