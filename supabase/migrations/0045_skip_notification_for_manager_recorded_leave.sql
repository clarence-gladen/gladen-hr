-- 0045_skip_notification_for_manager_recorded_leave.sql
-- A manager recording leave for an employee inserts it as 'pending' and then
-- approves it straight away (createLeaveForEmployeeAction). The insert still
-- told every manager "X has applied for ...", which is noise for leave that
-- is already approved.
--
-- Skip the manager notification when a manager inserts leave for someone
-- else. Still notify when:
--   * an employee applies through the portal (not a manager), or
--   * a manager who is also an employee applies for their OWN leave, so the
--     other managers still hear about it.
-- The employee's "Leave Approved" notification (on_leave_status_changed) is
-- unchanged.

CREATE OR REPLACE FUNCTION public.notify_managers_of_leave_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  emp_name text;
  leave_label text;
begin
  if is_manager() and new.employee_id is distinct from current_employee_id() then
    return new;
  end if;

  select full_name into emp_name from employees where id = new.employee_id;
  leave_label := case
    when new.leave_type = 'annual' then 'Annual Leave'
    when new.leave_type = 'sick' then 'Sick Leave'
    when new.leave_type = 'hospitalization' then 'Hospitalisation Leave'
    when new.leave_type = 'no_pay' then 'No-Pay Leave'
    else new.leave_type::text
  end;
  insert into notifications (user_id, title, body, type)
  select p.id, 'New Leave Request',
    coalesce(emp_name, 'An employee') || ' has applied for ' || leave_label || ' (' || to_char(new.start_date, 'DD Mon') || ' - ' || to_char(new.end_date, 'DD Mon YYYY') || ')',
    'leave_request'
  from profiles p where p.role = 'manager';
  return new;
end;
$function$;
