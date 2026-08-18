-- 0039_attendance_checkin.sql
-- Location check-in / check-out (Site Ops feature 2 of the phased rollout).
--
-- Design (abuse resistance, "allow but flag"):
--  * A check-in always COUNTS (status='accepted') once the employee is enabled,
--    assigned to the site, and not already checked in — nobody is blocked from
--    clocking in by a poor GPS fix.
--  * Location problems become REVIEW FLAGS instead of rejections:
--    'outside_fence' (beyond the geofence), 'low_accuracy' (weak GPS),
--    'no_site_pin' (site has no location set).
--  * Geofence distance is computed SERVER-SIDE (Haversine) — the client's claim
--    of being on-site is never trusted.
--  * Inserts happen ONLY through the SECURITY DEFINER RPCs below. There is no
--    INSERT policy, so a client cannot forge an event directly.
--  * Device-binding: if the same device_hash is used by a DIFFERENT employee on
--    the same day, the event is flagged 'shared_device' for supervisor review.

create table attendance_events (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  contract_id uuid not null references contracts(id) on delete cascade,
  event_type text not null check (event_type in ('check_in', 'check_out')),
  status text not null check (status in (
    'accepted', 'rejected_out_of_fence', 'rejected_low_accuracy', 'rejected_no_site_pin'
  )),
  occurred_at timestamptz not null default now(),
  latitude double precision,
  longitude double precision,
  accuracy_m double precision,
  distance_m double precision,
  within_fence boolean,
  device_hash text,
  flags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index attendance_events_emp_time_idx on attendance_events (employee_id, occurred_at desc);
create index attendance_events_contract_time_idx on attendance_events (contract_id, occurred_at desc);

-- Great-circle distance in metres between two lat/lng points.
create or replace function haversine_m(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
) returns double precision
language sql immutable as $$
  select 2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) *
    power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

-- True if the current user may view a site's attendance: managers see all,
-- supervisors see sites they're assigned to via supervisor_sites.
create or replace function can_view_site_attendance(p_contract_id uuid)
returns boolean
language sql security definer stable set search_path = public as $$
  select is_manager() or exists (
    select 1 from supervisor_sites ss
    where ss.contract_id = p_contract_id
      and ss.employee_id = current_employee_id()
  );
$$;

alter table attendance_events enable row level security;

-- Employees see their own events; managers/supervisors see their sites'.
create policy attendance_select_own on attendance_events
  for select using (employee_id = current_employee_id());
create policy attendance_select_site on attendance_events
  for select using (can_view_site_attendance(contract_id));

-- NOTE: intentionally no INSERT/UPDATE/DELETE policies — all writes go through
-- the SECURITY DEFINER RPCs below, so the log is tamper-resistant.

-- Shared internal: record one attendance attempt with full server-side checks.
create or replace function record_attendance(
  p_event_type text,
  p_contract_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_accuracy double precision,
  p_device_hash text
) returns attendance_events
language plpgsql security definer set search_path = public as $$
declare
  v_emp uuid := current_employee_id();
  v_enabled boolean;
  v_site record;
  v_dist double precision;
  v_within boolean;
  v_flags text[] := '{}';
  v_today date := (now() at time zone 'Asia/Singapore')::date;
  v_open record;
  v_row attendance_events;
begin
  if v_emp is null then
    raise exception 'No employee profile for the current user.';
  end if;

  select feature_checkin into v_enabled from employees where id = v_emp;
  if not coalesce(v_enabled, false) then
    raise exception 'Check-in is not enabled for you.';
  end if;

  -- Must be actively assigned to this site today.
  if not exists (
    select 1 from contract_assignments ca
    where ca.employee_id = v_emp
      and ca.contract_id = p_contract_id
      and ca.assigned_from <= v_today
      and (ca.assigned_to is null or ca.assigned_to >= v_today)
  ) then
    raise exception 'You are not assigned to this site.';
  end if;

  -- Guard the open/closed state so the log stays coherent.
  select event_type into v_open
  from attendance_events
  where employee_id = v_emp and contract_id = p_contract_id and status = 'accepted'
    and occurred_at >= v_today
  order by occurred_at desc limit 1;

  if p_event_type = 'check_in' and v_open.event_type = 'check_in' then
    raise exception 'You are already checked in.';
  end if;
  if p_event_type = 'check_out' and (v_open.event_type is null or v_open.event_type = 'check_out') then
    raise exception 'You are not currently checked in.';
  end if;

  select latitude, longitude, geofence_radius_m into v_site
  from contracts where id = p_contract_id;

  if v_site.latitude is null or v_site.longitude is null then
    v_within := null;
    v_flags := array_append(v_flags, 'no_site_pin');
  else
    v_dist := haversine_m(p_lat, p_lng, v_site.latitude, v_site.longitude);
    -- Tolerance: geofence radius plus part of the GPS error margin.
    v_within := v_dist <= (v_site.geofence_radius_m + least(coalesce(p_accuracy, 0), 30));
    if not v_within then
      v_flags := array_append(v_flags, 'outside_fence');
    end if;
    if coalesce(p_accuracy, 0) > 50 then
      v_flags := array_append(v_flags, 'low_accuracy');
    end if;
  end if;

  -- Device-binding: same phone used by a different employee today.
  if p_device_hash is not null and exists (
    select 1 from attendance_events e
    where e.device_hash = p_device_hash
      and e.employee_id <> v_emp
      and e.occurred_at >= v_today
  ) then
    v_flags := array_append(v_flags, 'shared_device');
  end if;

  -- Allow-but-flag: the event always counts once past the guards above.
  insert into attendance_events (
    employee_id, contract_id, event_type, status, latitude, longitude,
    accuracy_m, distance_m, within_fence, device_hash, flags
  ) values (
    v_emp, p_contract_id, p_event_type, 'accepted', p_lat, p_lng,
    p_accuracy, v_dist, v_within, p_device_hash, v_flags
  ) returning * into v_row;

  return v_row;
end;
$$;

create or replace function check_in(
  p_contract_id uuid, p_lat double precision, p_lng double precision,
  p_accuracy double precision, p_device_hash text
) returns attendance_events
language sql security definer set search_path = public as $$
  select record_attendance('check_in', p_contract_id, p_lat, p_lng, p_accuracy, p_device_hash);
$$;

create or replace function check_out(
  p_contract_id uuid, p_lat double precision, p_lng double precision,
  p_accuracy double precision, p_device_hash text
) returns attendance_events
language sql security definer set search_path = public as $$
  select record_attendance('check_out', p_contract_id, p_lat, p_lng, p_accuracy, p_device_hash);
$$;

-- Hardening: pin the math helper's search_path; keep record_attendance internal
-- (only the owner-executed check_in/check_out reach it); never expose to anon.
alter function haversine_m(double precision, double precision, double precision, double precision)
  set search_path = public;
revoke execute on function record_attendance(text, uuid, double precision, double precision, double precision, text) from public;
revoke execute on function record_attendance(text, uuid, double precision, double precision, double precision, text) from anon;
revoke execute on function record_attendance(text, uuid, double precision, double precision, double precision, text) from authenticated;
revoke execute on function check_in(uuid, double precision, double precision, double precision, text) from anon;
revoke execute on function check_out(uuid, double precision, double precision, double precision, text) from anon;
