-- Private bucket for employee documents (work permits, passports, MOM docs, etc.)
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Objects are stored under "{employee_id}/{filename}". Managers have full
-- access; employees can read and upload only into their own folder.
create policy "documents_storage_manager_all" on storage.objects
  for all using (bucket_id = 'documents' and is_manager())
  with check (bucket_id = 'documents' and is_manager());

create policy "documents_storage_self_select" on storage.objects
  for select using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = current_employee_id()::text
  );

create policy "documents_storage_self_insert" on storage.objects
  for insert with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = current_employee_id()::text
  );
