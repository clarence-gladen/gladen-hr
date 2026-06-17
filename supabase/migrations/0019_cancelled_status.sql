-- Add 'cancelled' to approval_status enum to distinguish employee/manager
-- cancellations from manager rejections.
alter type approval_status add value if not exists 'cancelled';

-- Update cancel_leave_request to use 'cancelled' instead of 'rejected'
create or replace function cancel_leave_request(request_id uuid) returns void as $func$
declare
  req leave_requests%rowtype;
  leave_year int;
begin
  select * into req from leave_requests where id = request_id;
  if req.id is null then raise exception 'Leave request not found'; end if;

  if not is_manager() and req.employee_id != current_employee_id() then
    raise exception 'Not authorized to cancel this leave request';
  end if;

  if req.status not in ('pending', 'approved') then
    raise exception 'Only pending or approved leave can be cancelled';
  end if;

  if req.status = 'approved' and req.leave_type != 'no_pay' then
    leave_year := extract(year from req.start_date);
    if req.leave_type = 'annual' then
      update leave_balances set annual_used = greatest(0, annual_used - req.days)
        where employee_id = req.employee_id and year = leave_year;
    elsif req.leave_type = 'sick' then
      update leave_balances set sick_used = greatest(0, sick_used - req.days)
        where employee_id = req.employee_id and year = leave_year;
    elsif req.leave_type = 'hospitalization' then
      update leave_balances set hospitalization_used = greatest(0, hospitalization_used - req.days)
        where employee_id = req.employee_id and year = leave_year;
    end if;
  end if;

  update leave_requests set status = 'cancelled' where id = request_id;
end;
$func$ language plpgsql security definer set search_path = public;
