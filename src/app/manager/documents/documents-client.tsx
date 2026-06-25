"use client";

import { useActionState, useTransition } from "react";
import { Header } from "@/components/header";
import { useLanguage } from "@/lib/i18n/language-provider";
import { deleteDocumentAction, uploadDocumentAction } from "./actions";
import type { DocumentType } from "@/lib/types/database";

interface ExpiringDocRow {
  id: string;
  employee_id: string;
  document_type: DocumentType;
  expiry_date: string | null;
  employees: { full_name: string } | { full_name: string }[] | null;
}

interface DocumentRow extends ExpiringDocRow {
  file_url: string;
  signedUrl: string | null;
}

interface EmployeeOption {
  id: string;
  full_name: string;
}

function employeeName(row: ExpiringDocRow): string {
  const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;
  return employee?.full_name ?? "—";
}

const inputClass =
  "w-full rounded-lg border border-black/10 bg-white px-4 py-3 text-base focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";
const labelClass = "mb-1 block text-sm font-medium text-foreground";

export function DocumentsClient({
  expiring,
  documents,
  employees,
}: {
  expiring: ExpiringDocRow[];
  documents: DocumentRow[];
  employees: EmployeeOption[];
}) {
  const { t } = useLanguage();
  const [state, formAction, pending] = useActionState(uploadDocumentAction, {});
  const [isPending, startTransition] = useTransition();

  const documentTypeLabel: Record<DocumentType, string> = {
    nric_front: t("documents.nricFront"),
    nric_back: t("documents.nricBack"),
    passport: t("documents.passport"),
    work_permit_front: t("documents.workPermitFront"),
    work_permit_back: t("documents.workPermitBack"),
    employment_contract: t("documents.employmentContract"),
    wsq_certification: t("documents.wsqCertification"),
    medical_report: t("documents.medicalReport"),
    other: t("documents.other"),
    work_permit: t("documents.workPermit"),
    mom_doc: t("documents.momDoc"),
  };

  function handleDelete(documentId: string, filePath: string) {
    startTransition(() => {
      deleteDocumentAction(documentId, filePath);
    });
  }

  return (
    <>
      <Header titleKey="documents.title" />
      <main className="flex-1 px-4 py-6">
        <h2 className="mb-2 text-sm font-semibold text-foreground/60">
          {t("documents.expiringSoon")}
        </h2>
        {expiring.length === 0 ? (
          <p className="mb-6 text-sm text-foreground/60">{t("documents.noExpiring")}</p>
        ) : (
          <ul className="mb-6 space-y-2">
            {expiring.map((doc) => (
              <li key={doc.id} className="rounded-xl bg-white p-3 shadow-sm">
                <p className="font-medium text-foreground">{employeeName(doc)}</p>
                <p className="text-sm text-foreground/60">
                  {documentTypeLabel[doc.document_type]} · {t("documents.expiresOn")} {doc.expiry_date}
                </p>
              </li>
            ))}
          </ul>
        )}

        <h2 className="mb-2 text-sm font-semibold text-foreground/60">
          {t("documents.uploadDocument")}
        </h2>
        <form action={formAction} className="mb-6 space-y-3 rounded-xl bg-white p-4 shadow-sm">
          <div>
            <label className={labelClass} htmlFor="employeeId">
              {t("documents.employee")}
            </label>
            <select id="employeeId" name="employeeId" className={inputClass} defaultValue="">
              <option value="" disabled>
                {t("documents.employee")}
              </option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="documentType">
              {t("documents.documentType")}
            </label>
            <select id="documentType" name="documentType" className={inputClass} defaultValue="work_permit">
              <option value="work_permit">{t("documents.workPermit")}</option>
              <option value="passport">{t("documents.passport")}</option>
              <option value="mom_doc">{t("documents.momDoc")}</option>
              <option value="employment_contract">{t("documents.employmentContract")}</option>
              <option value="other">{t("documents.other")}</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="expiryDate">
              {t("documents.expiryDate")}
            </label>
            <input id="expiryDate" name="expiryDate" type="date" className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="file">
              {t("documents.file")}
            </label>
            <input id="file" name="file" type="file" required className={inputClass} />
          </div>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-brand py-3 text-base font-semibold text-white transition disabled:opacity-60"
          >
            {pending ? t("common.loading") : t("documents.upload")}
          </button>
        </form>

        <h2 className="mb-2 text-sm font-semibold text-foreground/60">
          {t("documents.allDocuments")}
        </h2>
        {documents.length === 0 ? (
          <p className="text-sm text-foreground/60">{t("documents.noDocuments")}</p>
        ) : (
          <ul className="space-y-2">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 shadow-sm">
                <div>
                  <p className="font-medium text-foreground">{employeeName(doc)}</p>
                  <p className="text-sm text-foreground/60">
                    {documentTypeLabel[doc.document_type]}
                    {doc.expiry_date ? ` · ${t("documents.expiresOn")} ${doc.expiry_date}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {doc.signedUrl && (
                    <a
                      href={doc.signedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-brand"
                    >
                      {t("documents.download")}
                    </a>
                  )}
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleDelete(doc.id, doc.file_url)}
                    className="rounded-full bg-black/5 px-3 py-1 text-xs font-medium text-foreground disabled:opacity-60"
                  >
                    {t("documents.delete")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
