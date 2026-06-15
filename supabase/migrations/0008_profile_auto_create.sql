-- Automatically create a profile row whenever a new auth user is created.
-- Runs as security definer so it bypasses RLS (the client has no INSERT
-- policy on profiles, since only managers should normally create them).
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, role)
  values (new.id, 'employee')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Allow a user to create their own profile row as a defensive fallback
-- (e.g. for users that existed before this trigger was added).
create policy "profiles_insert_own" on profiles
  for insert with check (id = auth.uid());
