-- Allow login for:
-- 1. Registered employees (employees.mobile_number)
-- 2. Already-registered users in auth.users (returning managers/employees)
-- 3. Pre-authorized managers in pending_manager_phones
create or replace function check_employee_phone(p_phone text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clean text := ltrim(p_phone, '+');
begin
  return
    exists (select 1 from employees where mobile_number = v_clean or mobile_number = '+' || v_clean)
    or exists (select 1 from auth.users where phone = v_clean or phone = '+' || v_clean)
    or exists (select 1 from pending_manager_phones where phone = v_clean or phone = '+' || v_clean);
end;
$$;
grant execute on function check_employee_phone(text) to anon, authenticated;
