import { createClient } from "@/lib/supabase/server";
import { DocumentsClient } from "./documents-client";
import type { DocumentType } from "@/lib/types/database";

export default async function EmployeeDocumentsPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("employee_id")
    .eq("id", auth.user!.id)
    .maybeSingle();

  const employeeId = profile?.employee_id;

  const { data: raw } = employeeId
    ? await supabase
        .from("documents")
        .select("id, document_type, expiry_date, file_url")
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false })
    : { data: [] };

  const today = new Date().toISOString().slice(0, 10);
  const in60Days = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const documents = (raw ?? []).map((doc) => ({
    id: doc.id,
    document_type: doc.document_type as DocumentType,
    expiry_date: doc.expiry_date,
    file_url: doc.file_url,
    status: (
      doc.expiry_date && doc.expiry_date <= today
        ? "expired"
        : doc.expiry_date && doc.expiry_date <= in60Days
          ? "expiring"
          : "normal"
    ) as "normal" | "expiring" | "expired",
  }));

  return <DocumentsClient documents={documents} />;
}
