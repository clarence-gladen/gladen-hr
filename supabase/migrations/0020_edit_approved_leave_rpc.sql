-- Allows managers to edit an approved leave request and keep it approved.
-- Reverses the old balance deduction, then applies the new one atomically.
create or replace function edit_approved_leave_request(
  p_request_id uuid,
  p_leave_type text,
  p_start_date date,
  p_end_date date,
  p_days int,
  p_reason text
) returns void language plpgsql security definer set search_path = public as $func$
declare
  req leave_requests%rowtype;
  old_year int;
  new_year int;
begin
  if not is_manager() then raise exception 'Only managers can edit approved leave'; end if;

  select * into req from leave_requests where id = p_request_id;
  if req.id is null then raise exception 'Leave request not found'; end if;
  if req.status != 'approved' then raise exception 'Leave request is not approved'; end if;

  old_year := extract(year from req.start_date);
  new_year := extract(year from p_start_date);

  -- Reverse old balance deduction
  if req.leave_type != 'no_pay' then
    if req.leave_type = 'annual' then
      update leave_balances set annual_used = greatest(0, annual_used - req.days)
        where employee_id = req.employee_id and year = old_year;
    elsif req.leave_type = 'sick' then
      update leave_balances set sick_used = greatest(0, sick_used - req.days)
        where employee_id = req.employee_id and year = old_year;
    elsif req.leave_type = 'hospitalization' then
      update leave_balances set hospitalization_used = greatest(0, hospitalization_used - req.days)
        where employee_id = req.employee_id and year = old_year;
    end if;
  end if;

  -- Apply new balance deduction
  if p_leave_type != 'no_pay' then
    if p_leave_type = 'annual' then
      update leave_balances set annual_used = annual_used + p_days
        where employee_id = req.employee_id and year = new_year;
    elsif p_leave_type = 'sick' then
      update leave_balances set sick_used = sick_used + p_days
        where employee_id = req.employee_id and year = new_year;
    elsif p_leave_type = 'hospitalization' then
      update leave_balances set hospitalization_used = hospitalization_used + p_days
        where employee_id = req.employee_id and year = new_year;
    end if;
  end if;

  update leave_requests
    set leave_type = p_leave_type::leave_type,
        start_date = p_start_date,
        end_date = p_end_date,
        days = p_days,
        reason = p_reason
    where id = p_request_id;
end;
$func$;
