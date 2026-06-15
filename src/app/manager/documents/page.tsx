import { createClient } from "@/lib/supabase/server";
import { getExpiringDocuments } from "@/lib/documents/expiry";
import { DocumentsClient } from "./documents-client";

export default async function ManagerDocumentsPage() {
  const supabase = await createClient();

  const [expiring, allDocsRes, employeesRes] = await Promise.all([
    getExpiringDocuments(supabase),
    supabase
      .from("documents")
      .select("id, employee_id, document_type, file_url, expiry_date, employees(full_name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("employees")
      .select("id, full_name")
      .eq("status", "active")
      .order("full_name"),
  ]);

  const documents = allDocsRes.data ?? [];

  const signedUrls = await Promise.all(
    documents.map((doc) =>
      supabase.storage.from("documents").createSignedUrl(doc.file_url, 60 * 60)
    )
  );

  const documentsWithUrls = documents.map((doc, index) => ({
    ...doc,
    signedUrl: signedUrls[index].data?.signedUrl ?? null,
  }));

  return (
    <DocumentsClient
      expiring={expiring ?? []}
      documents={documentsWithUrls}
      employees={employeesRes.data ?? []}
    />
  );
}
