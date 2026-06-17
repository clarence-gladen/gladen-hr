-- Pre-authorize manager phones for users who haven't logged in yet.

create table if not exists pending_manager_phones (
  phone text primary key,
  added_at timestamptz default now()
);

alter table pending_manager_phones enable row level security;
create policy "managers_manage_whitelist" on pending_manager_phones
  using (is_manager()) with check (is_manager());

-- Update handle_new_user to grant manager role if phone is whitelisted
create or replace function handle_new_user()
returns trigger as $$
declare
  v_role user_role := 'employee';
  v_phone text;
begin
  v_phone := ltrim(coalesce(new.phone, ''), '+');
  if exists (
    select 1 from pending_manager_phones
    where phone = v_phone or phone = '+' || v_phone
  ) then
    v_role := 'manager';
    delete from pending_manager_phones where phone = v_phone or phone = '+' || v_phone;
  end if;
  insert into profiles (id, role) values (new.id, v_role)
    on conflict (id) do update set role = v_role;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Update set_user_role: if user not found + role=manager, add to whitelist
create or replace function set_user_role(p_phone text, p_role text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid;
  v_clean text;
begin
  v_clean := ltrim(p_phone, '+');
  select id into v_user_id from auth.users
    where phone = v_clean or phone = '+' || v_clean;
  if v_user_id is null then
    if p_role = 'manager' then
      insert into pending_manager_phones (phone) values (v_clean)
        on conflict (phone) do nothing;
      return 'pending';
    else
      delete from pending_manager_phones where phone = v_clean or phone = '+' || v_clean;
      return 'ok';
    end if;
  end if;
  insert into profiles (id, role) values (v_user_id, p_role::user_role)
    on conflict (id) do update set role = p_role::user_role;
  delete from pending_manager_phones where phone = v_clean or phone = '+' || v_clean;
  return 'ok';
end;
$$;
grant execute on function set_user_role(text, text) to authenticated;

-- get_manager_phones now returns status: 'active' or 'pending'
create or replace function get_manager_phones()
returns table(phone text, user_id uuid, status text)
language plpgsql security definer set search_path = public as $$
begin
  return query
    select u.phone::text, u.id, 'active'::text
    from auth.users u
    join profiles p on p.id = u.id
    where p.role = 'manager' and u.phone is not null
  union all
    select pm.phone, null::uuid, 'pending'::text
    from pending_manager_phones pm;
end;
$$;
grant execute on function get_manager_phones() to authenticated;
