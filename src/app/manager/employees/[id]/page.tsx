import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmployeeDetailClient } from "./employee-detail-client";
import { ensureLeaveBalances, getLeaveHistory } from "@/lib/leave/balances";
import type { DocumentType, EmployeeDetail, ResidencyStatus, SkillLevel, EmployeeStatus } from "@/lib/types/database";
import type { EmployeeDocumentRow } from "./employee-documents-section";

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [employeeRes, rawDocsRes] = await Promise.all([
    supabase
      .from("employees")
      .select(
        "id, full_name, nric_last4, date_of_birth, mobile_number, residency_status, designation, employment_start_date, employment_end_date, base_salary, skill_level, bank_name, bank_account_number, status"
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("documents")
      .select("id, document_type, file_url, created_at")
      .eq("employee_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!employeeRes.data) notFound();
  const data = employeeRes.data;

  const employee: EmployeeDetail = {
    id: data.id,
    full_name: data.full_name,
    nric_last4: data.nric_last4,
    date_of_birth: data.date_of_birth,
    mobile_number: data.mobile_number,
    residency_status: data.residency_status as ResidencyStatus,
    designation: data.designation,
    employment_start_date: data.employment_start_date,
    employment_end_date: data.employment_end_date,
    base_salary: Number(data.base_salary),
    skill_level: data.skill_level as SkillLevel,
    bank_name: data.bank_name,
    bank_account_number: data.bank_account_number,
    status: data.status as EmployeeStatus,
  };

  const rawDocs = rawDocsRes.data ?? [];
  const signedUrls = await Promise.all(
    rawDocs.map((doc) =>
      supabase.storage.from("documents").createSignedUrl(doc.file_url, 60 * 60)
    )
  );
  const employeeDocuments: EmployeeDocumentRow[] = rawDocs.map((doc, i) => ({
    id: doc.id,
    document_type: doc.document_type as DocumentType,
    file_url: doc.file_url,
    signedUrl: signedUrls[i].data?.signedUrl ?? null,
    created_at: doc.created_at,
  }));

  // Ensure leave balance rows are up-to-date, then fetch last 3 years' history
  await ensureLeaveBalances(supabase, id, data.employment_start_date);
  const leaveHistory = await getLeaveHistory(supabase, id, data.employment_start_date, 3);

  return (
    <EmployeeDetailClient
      employee={employee}
      leaveHistory={leaveHistory}
      employeeDocuments={employeeDocuments}
    />
  );
}
