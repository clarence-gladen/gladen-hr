-- 0042_checklist_areas.sql
-- Restructure the cleaning checklist to: Site -> Areas -> Tasks, where each AREA
-- is assigned to one cleaner (who is responsible for all its tasks), and cleaners
-- see/tick only the areas assigned to them.
--
-- Safe to restructure: no completions/reports exist yet (only a stray test item).

create table checklist_areas (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  name text not null,
  assigned_employee_id uuid references employees(id) on delete set null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index checklist_areas_contract_idx on checklist_areas (contract_id, sort_order);

-- Tasks now belong to an area. Clear the stray test row so area_id can be NOT NULL.
delete from checklist_items;
alter table checklist_items drop column area;
alter table checklist_items add column area_id uuid not null references checklist_areas(id) on delete cascade;
create index checklist_items_area_idx on checklist_items (area_id, sort_order);

alter table checklist_areas enable row level security;

-- Areas: the assigned cleaner sees their own; managers/supervisors see their sites'.
create policy checklist_areas_select on checklist_areas
  for select using (assigned_employee_id = current_employee_id() or can_view_site_attendance(contract_id));
create policy checklist_areas_insert on checklist_areas
  for insert with check (is_manager());
create policy checklist_areas_update on checklist_areas
  for update using (is_manager()) with check (is_manager());
create policy checklist_areas_delete on checklist_areas
  for delete using (is_manager());

create or replace function is_assigned_to_area(p_area_id uuid)
returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from checklist_areas a
    where a.id = p_area_id and a.assigned_employee_id = current_employee_id()
  );
$$;

-- Tasks: visible to the area's assigned cleaner + site viewers; managers manage.
drop policy checklist_items_select on checklist_items;
create policy checklist_items_select on checklist_items
  for select using (can_view_site_attendance(contract_id) or is_assigned_to_area(area_id));

-- Completions: visible to the assigned cleaner (via the task's area) + site viewers.
drop policy checklist_completions_select on checklist_completions;
create policy checklist_completions_select on checklist_completions
  for select using (
    can_view_site_attendance(contract_id) or exists (
      select 1 from checklist_items i
      where i.id = checklist_completions.item_id and is_assigned_to_area(i.area_id)
    )
  );

-- Ticking now requires the task's AREA to be assigned to the employee (plus the
-- existing check-in requirement).
create or replace function complete_checklist_item(
  p_item_id uuid, p_note text default null, p_photo_path text default null
) returns checklist_completions
language plpgsql security definer set search_path = public as $$
declare
  v_emp uuid := current_employee_id();
  v_enabled boolean;
  v_contract uuid;
  v_area uuid;
  v_assigned uuid;
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

  select contract_id, area_id into v_contract, v_area from checklist_items where id = p_item_id and active;
  if v_contract is null then
    raise exception 'Checklist item not found.';
  end if;

  select assigned_employee_id into v_assigned from checklist_areas where id = v_area;
  if v_assigned is distinct from v_emp then
    raise exception 'This task is not assigned to you.';
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

create or replace function uncomplete_checklist_item(p_item_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_emp uuid := current_employee_id();
  v_contract uuid;
  v_area uuid;
  v_assigned uuid;
  v_today date := (now() at time zone 'Asia/Singapore')::date;
begin
  select contract_id, area_id into v_contract, v_area from checklist_items where id = p_item_id;
  if v_contract is null then return; end if;
  select assigned_employee_id into v_assigned from checklist_areas where id = v_area;
  if v_assigned is distinct from v_emp then
    raise exception 'This task is not assigned to you.';
  end if;
  if not is_checked_in_now(v_contract, coalesce(v_emp, '00000000-0000-0000-0000-000000000000')) then
    raise exception 'Please check in on site before changing tasks.';
  end if;
  delete from checklist_completions where item_id = p_item_id and done_date = v_today;
end;
$$;
