-- Dedicated removal RPC that uses user_id directly (avoids phone format issues).
-- For pending (not yet logged in), falls back to deleting by phone from whitelist.
create or replace function remove_manager_access(p_user_id uuid, p_phone text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_manager() then raise exception 'Not authorized'; end if;
  if p_user_id is not null then
    update profiles set role = 'employee' where id = p_user_id;
  else
    delete from pending_manager_phones
      where phone = ltrim(p_phone, '+') or phone = '+' || ltrim(p_phone, '+');
  end if;
end;
$$;
grant execute on function remove_manager_access(uuid, text) to authenticated;
