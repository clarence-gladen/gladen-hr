-- Private bucket for generated payslip PDFs
insert into storage.buckets (id, name, public)
values ('payslips', 'payslips', false)
on conflict (id) do nothing;

-- Managers can upload and read all payslip PDFs
create policy "payslips_storage_manager_all" on storage.objects
  for all using (bucket_id = 'payslips' and is_manager())
  with check (bucket_id = 'payslips' and is_manager());

-- Employees can only read their own payslip PDFs (path: {employee_id}/{payslip_id}.pdf)
create policy "payslips_storage_self_select" on storage.objects
  for select using (
    bucket_id = 'payslips'
    and (storage.foldername(name))[1] = current_employee_id()::text
  );
