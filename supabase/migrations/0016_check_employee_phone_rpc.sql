-- Returns true only if the given phone number matches a registered employee.
-- SECURITY DEFINER so the anon role can call it without direct table access.
-- Only exposes a boolean — no employee data is returned.
create or replace function check_employee_phone(p_phone text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from employees where mobile_number = p_phone
  );
end;
$$;

grant execute on function check_employee_phone(text) to anon, authenticated;
