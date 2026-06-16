"use client";

import { Header } from "@/components/header";
import { useLanguage } from "@/lib/i18n/language-provider";
import type { DocumentType } from "@/lib/types/database";

export interface DocumentRow {
  id: string;
  document_type: DocumentType;
  expiry_date: string | null;
  file_url: string;
  status: "normal" | "expiring" | "expired";
}

export function DocumentsClient({ documents }: { documents: DocumentRow[] }) {
  const { t } = useLanguage();

  const docTypeLabel: Record<DocumentType, string> = {
    work_permit: t("documents.workPermit"),
    passport: t("documents.passport"),
    mom_doc: t("documents.momDoc"),
    employment_contract: t("documents.employmentContract"),
    other: t("documents.other"),
  };

  return (
    <>
      <Header titleKey="documents.title" />
      <main className="flex-1 px-4 py-6">
        {documents.length === 0 ? (
          <p className="text-center text-sm text-foreground/60">{t("documents.noDocuments")}</p>
        ) : (
          <ul className="space-y-3">
            {documents.map((doc) => (
              <li key={doc.id} className="rounded-xl bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">
                      {docTypeLabel[doc.document_type]}
                    </p>
                    {doc.expiry_date && (
                      <p
                        className={`mt-1 text-sm ${
                          doc.status === "expired"
                            ? "font-medium text-red-600"
                            : doc.status === "expiring"
                              ? "font-medium text-amber-600"
                              : "text-foreground/60"
                        }`}
                      >
                        {t("documents.expiresOn")} {doc.expiry_date}
                        {doc.status === "expired"
                          ? ` · ${t("documents.expired")}`
                          : doc.status === "expiring"
                            ? ` · ${t("documents.expiringSoonLabel")}`
                            : ""}
                      </p>
                    )}
                  </div>
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand"
                  >
                    {t("documents.download")}
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
