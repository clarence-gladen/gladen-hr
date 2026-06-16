import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/header";
import type { DocumentType } from "@/lib/types/database";

const docTypeLabel: Record<DocumentType, string> = {
  work_permit: "Work Permit",
  passport: "Passport",
  mom_doc: "MOM Document",
  employment_contract: "Employment Contract",
  other: "Other",
};

export default async function EmployeeDocumentsPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("employee_id")
    .eq("id", auth.user!.id)
    .maybeSingle();

  const employeeId = profile?.employee_id;

  const { data: documents } = employeeId
    ? await supabase
        .from("documents")
        .select("id, document_type, expiry_date, file_url, created_at")
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false })
    : { data: [] };

  const today = new Date().toISOString().slice(0, 10);
  const in60Days = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return (
    <>
      <Header titleKey="documents.title" />
      <main className="flex-1 px-4 py-6">
        {!documents || documents.length === 0 ? (
          <p className="text-center text-sm text-foreground/60">No documents uploaded yet.</p>
        ) : (
          <ul className="space-y-3">
            {documents.map((doc) => {
              const expiring =
                doc.expiry_date && doc.expiry_date > today && doc.expiry_date <= in60Days;
              const expired = doc.expiry_date && doc.expiry_date <= today;

              return (
                <li key={doc.id} className="rounded-xl bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">
                        {docTypeLabel[doc.document_type as DocumentType] ?? doc.document_type}
                      </p>
                      {doc.expiry_date && (
                        <p
                          className={`mt-1 text-sm ${
                            expired
                              ? "font-medium text-red-600"
                              : expiring
                                ? "font-medium text-amber-600"
                                : "text-foreground/60"
                          }`}
                        >
                          Expires {doc.expiry_date}
                          {expired ? " · Expired" : expiring ? " · Expiring soon" : ""}
                        </p>
                      )}
                    </div>
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand"
                    >
                      View
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
