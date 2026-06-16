-- Ensure notifications table exists with user_id for per-user scoping.
-- Safe to run even if the table was already created in Supabase directly.
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  type text not null default 'general',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table notifications enable row level security;

-- Users see only their own notifications
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'notifications' and policyname = 'notifications_self_select'
  ) then
    create policy "notifications_self_select" on notifications
      for select using (user_id = auth.uid());
  end if;
end $$;

-- Users can mark their own notifications as read
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'notifications' and policyname = 'notifications_self_update'
  ) then
    create policy "notifications_self_update" on notifications
      for update using (user_id = auth.uid());
  end if;
end $$;

-- Trigger: when an employee submits a leave request, notify all managers
create or replace function notify_managers_of_leave_request()
returns trigger as $$
declare
  emp_name text;
  leave_label text;
begin
  select full_name into emp_name from employees where id = new.employee_id;

  leave_label := case new.leave_type
    when 'annual'          then 'Annual Leave'
    when 'sick'            then 'Sick Leave'
    when 'hospitalization' then 'Hospitalisation Leave'
    when 'no_pay'          then 'No-Pay Leave'
    else new.leave_type
  end;

  insert into notifications (user_id, title, body, type)
  select p.id,
    'New Leave Request',
    coalesce(emp_name, 'An employee') || ' has applied for ' || leave_label
      || ' (' || to_char(new.start_date, 'DD Mon') || ' – ' || to_char(new.end_date, 'DD Mon YYYY') || ')',
    'leave_request'
  from profiles p
  where p.role = 'manager';

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_leave_request_submit on leave_requests;
create trigger on_leave_request_submit
  after insert on leave_requests
  for each row execute function notify_managers_of_leave_request();

-- Update approve_leave_request to also notify the employee
create or replace function approve_leave_request(request_id uuid)
returns void as $$
declare
  req leave_requests%rowtype;
  leave_year int;
  emp_user_id uuid;
  leave_label text;
begin
  if not is_manager() then
    raise exception 'Only managers can approve leave requests';
  end if;

  select * into req from leave_requests where id = request_id and status = 'pending';
  if req.id is null then
    raise exception 'Leave request not found or not pending';
  end if;

  leave_year := extract(year from req.start_date);

  update leave_requests
  set status = 'approved', approved_by = auth.uid(), approved_at = now()
  where id = request_id;

  if req.leave_type = 'annual' then
    update leave_balances set annual_used = annual_used + req.days
      where employee_id = req.employee_id and year = leave_year;
  elsif req.leave_type = 'sick' then
    update leave_balances set sick_used = sick_used + req.days
      where employee_id = req.employee_id and year = leave_year;
  elsif req.leave_type = 'hospitalization' then
    update leave_balances set hospitalization_used = hospitalization_used + req.days
      where employee_id = req.employee_id and year = leave_year;
  end if;

  -- Notify the employee
  select p.id into emp_user_id from profiles p where p.employee_id = req.employee_id limit 1;

  leave_label := case req.leave_type
    when 'annual'          then 'Annual Leave'
    when 'sick'            then 'Sick Leave'
    when 'hospitalization' then 'Hospitalisation Leave'
    when 'no_pay'          then 'No-Pay Leave'
    else req.leave_type
  end;

  if emp_user_id is not null then
    insert into notifications (user_id, title, body, type)
    values (
      emp_user_id,
      'Leave Approved',
      'Your ' || leave_label || ' request ('
        || to_char(req.start_date, 'DD Mon') || ' – ' || to_char(req.end_date, 'DD Mon YYYY')
        || ') has been approved.',
      'leave_approved'
    );
  end if;
end;
$$ language plpgsql security definer set search_path = public;

-- Update reject_leave_request to also notify the employee
create or replace function reject_leave_request(request_id uuid)
returns void as $$
declare
  req leave_requests%rowtype;
  emp_user_id uuid;
  leave_label text;
begin
  if not is_manager() then
    raise exception 'Only managers can reject leave requests';
  end if;

  select * into req from leave_requests where id = request_id and status = 'pending';
  if req.id is null then
    raise exception 'Leave request not found or not pending';
  end if;

  update leave_requests
  set status = 'rejected', approved_by = auth.uid(), approved_at = now()
  where id = request_id and status = 'pending';

  -- Notify the employee
  select p.id into emp_user_id from profiles p where p.employee_id = req.employee_id limit 1;

  leave_label := case req.leave_type
    when 'annual'          then 'Annual Leave'
    when 'sick'            then 'Sick Leave'
    when 'hospitalization' then 'Hospitalisation Leave'
    when 'no_pay'          then 'No-Pay Leave'
    else req.leave_type
  end;

  if emp_user_id is not null then
    insert into notifications (user_id, title, body, type)
    values (
      emp_user_id,
      'Leave Not Approved',
      'Your ' || leave_label || ' request ('
        || to_char(req.start_date, 'DD Mon') || ' – ' || to_char(req.end_date, 'DD Mon YYYY')
        || ') was not approved. Please contact your manager.',
      'leave_rejected'
    );
  end if;
end;
$$ language plpgsql security definer set search_path = public;
