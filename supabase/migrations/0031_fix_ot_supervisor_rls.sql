-- Fix: supervisors couldn't insert into ot_entries.
-- The insert/update policies' EXISTS subquery reads contract_assignments, which
-- has manager-only RLS — evaluated as the supervisor it always returned empty,
-- so every insert violated the policy. Move the site check into a SECURITY
-- DEFINER helper so it bypasses RLS (same pattern as the get_supervisor_* RPCs)
-- without granting supervisors read access to contract_assignments.

create or replace function can_log_ot_for(p_employee_id uuid, p_contract_id uuid)
returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1
    from supervisor_sites ss
    join contract_assignments ca on ca.contract_id = ss.contract_id
    where ss.employee_id = current_employee_id()
      and ca.employee_id = p_employee_id
      and ss.contract_id = p_contract_id
  );
$$;

drop policy "ot_entries_supervisor_insert" on ot_entries;
create policy "ot_entries_supervisor_insert" on ot_entries
  for insert with check (
    is_supervisor()
    and created_by = auth.uid()
    and can_log_ot_for(employee_id, contract_id)
  );

drop policy "ot_entries_supervisor_update" on ot_entries;
create policy "ot_entries_supervisor_update" on ot_entries
  for update using (created_by = auth.uid() and is_supervisor())
  with check (
    created_by = auth.uid()
    and can_log_ot_for(employee_id, contract_id)
  );
