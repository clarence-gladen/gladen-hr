-- Approve a pending leave request: marks it approved and credits the
-- corresponding leave_balances "used" counter for that year.
create or replace function approve_leave_request(request_id uuid)
returns void as $$
declare
  req leave_requests%rowtype;
  leave_year int;
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
end;
$$ language plpgsql security definer set search_path = public;

-- Reject a pending leave request.
create or replace function reject_leave_request(request_id uuid)
returns void as $$
begin
  if not is_manager() then
    raise exception 'Only managers can reject leave requests';
  end if;

  update leave_requests
  set status = 'rejected', approved_by = auth.uid(), approved_at = now()
  where id = request_id and status = 'pending';
end;
$$ language plpgsql security definer set search_path = public;
