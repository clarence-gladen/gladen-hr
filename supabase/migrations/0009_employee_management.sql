-- Skill level drives Foreign Worker Levy rates for work permit / S Pass holders.
create type skill_level as enum ('basic_skilled', 'higher_skilled');

alter table employees
  add column skill_level skill_level not null default 'basic_skilled';

-- NRIC encryption helpers. The passphrase is supplied by the application
-- (server-side env var) at call time and is never stored in the database.
create or replace function encrypt_nric(plain text, secret text)
returns bytea as $$
  select pgp_sym_encrypt(plain, secret);
$$ language sql;

create or replace function decrypt_nric(encrypted bytea, secret text)
returns text as $$
  select pgp_sym_decrypt(encrypted, secret);
$$ language sql stable;

-- Link a new auth user to their pre-created employee record (matched by
-- mobile number) when their profile is auto-created.
create or replace function handle_new_user()
returns trigger as $$
declare
  matched_employee_id uuid;
  matched_full_name text;
begin
  select id, full_name into matched_employee_id, matched_full_name
  from employees
  where mobile_number = new.phone
  limit 1;

  insert into profiles (id, role, employee_id, full_name)
  values (new.id, 'employee', matched_employee_id, matched_full_name)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
