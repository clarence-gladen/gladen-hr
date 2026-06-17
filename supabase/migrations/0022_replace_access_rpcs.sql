-- Replace set_user_role and get_manager_phones with known-correct implementations.
-- The old versions were created directly in Supabase (not in migrations) and
-- were returning 'not_found' even for valid users.

create or replace function set_user_role(p_phone text, p_role text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users
    where phone = p_phone
       or phone = '+' || p_phone
       or phone = ltrim(p_phone, '+');
  if v_user_id is null then
    return 'not_found';
  end if;
  insert into profiles (id, role) values (v_user_id, p_role::user_role)
    on conflict (id) do update set role = p_role::user_role;
  return 'ok';
end;
$$;
grant execute on function set_user_role(text, text) to authenticated;

create or replace function get_manager_phones()
returns table(phone text, user_id uuid)
language plpgsql security definer set search_path = public as $$
begin
  return query
    select u.phone::text, u.id
    from auth.users u
    join profiles p on p.id = u.id
    where p.role = 'manager' and u.phone is not null;
end;
$$;
grant execute on function get_manager_phones() to authenticated;
