"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { compressFile } from "@/lib/utils/compress";
import { uploadEmployeeDocumentAction, deleteEmployeeDocumentAction } from "../actions";
import { fmtTimestamp } from "@/lib/utils/date";
import type { DocumentType, ResidencyStatus } from "@/lib/types/database";

export interface EmployeeDocumentRow {
  id: string;
  document_type: DocumentType;
  file_url: string;
  signedUrl: string | null;
  created_at: string;
}

const CITIZEN_TYPES: DocumentType[] = [
  "nric_front",
  "nric_back",
  "employment_contract",
  "wsq_certification",
  "other",
];

const FOREIGN_TYPES: DocumentType[] = [
  "passport",
  "work_permit_front",
  "work_permit_back",
  "employment_contract",
  "wsq_certification",
  "medical_report",
  "other",
];

const DOC_LABELS: Record<DocumentType, string> = {
  nric_front: "NRIC (Front)",
  nric_back: "NRIC (Back)",
  passport: "Passport",
  work_permit_front: "Work Permit (Front)",
  work_permit_back: "Work Permit (Back)",
  employment_contract: "Employment Contract",
  wsq_certification: "WSQ Certification",
  medical_report: "Medical Report",
  other: "Other",
  // Legacy
  work_permit: "Work Permit",
  mom_doc: "MOM Document",
};

export function EmployeeDocumentsSection({
  employeeId,
  residencyStatus,
  documents,
}: {
  employeeId: string;
  residencyStatus: ResidencyStatus;
  documents: EmployeeDocumentRow[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingType, setPendingType] = useState<DocumentType | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const isForeigner = residencyStatus === "work_permit" || residencyStatus === "s_pass";
  const knownTypes = isForeigner ? FOREIGN_TYPES : CITIZEN_TYPES;

  // Bucket docs into known slots; anything with an unrecognised type falls into "other"
  const byType = new Map<DocumentType, EmployeeDocumentRow[]>();
  for (const doc of documents) {
    const key = (knownTypes as string[]).includes(doc.document_type)
      ? doc.document_type
      : "other";
    const arr = byType.get(key) ?? [];
    arr.push(doc);
    byType.set(key, arr);
  }

  function handleUploadClick(type: DocumentType) {
    setPendingType(type);
    setUploadError(null);
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !pendingType) return;

    setUploading(true);
    setUploadError(null);

    const compressed = await compressFile(file);
    const formData = new FormData();
    formData.set("file", compressed);

    const result = await uploadEmployeeDocumentAction(employeeId, pendingType, formData);
    setUploading(false);
    setPendingType(null);

    if (result.error) {
      setUploadError(result.error);
    } else {
      router.refresh();
    }
  }

  function handleDelete(doc: EmployeeDocumentRow) {
    setDeletingId(doc.id);
    startTransition(async () => {
      await deleteEmployeeDocumentAction(doc.id, doc.file_url);
      setDeletingId(null);
      router.refresh();
    });
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {uploadError && (
        <p className="mb-2 text-sm text-red-600">{uploadError}</p>
      )}

      <div className="space-y-2">
        {knownTypes.map((type) => {
          const docs = byType.get(type) ?? [];
          const isUploading = uploading && pendingType === type;

          return (
            <div key={type} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-sm font-semibold text-foreground">
                  {DOC_LABELS[type]}
                </p>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => handleUploadClick(type)}
                  className="shrink-0 text-xs font-semibold text-brand disabled:opacity-40"
                >
                  {isUploading ? "Uploading…" : "+ Upload"}
                </button>
              </div>

              {docs.length === 0 ? (
                <p className="text-xs text-foreground/40">No file uploaded</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {docs.map((doc) => (
                    <li
                      key={doc.id}
                      className="flex items-center justify-between gap-2 border-t border-black/5 pt-2"
                    >
                      <p className="text-xs text-foreground/50">
                        {fmtTimestamp(doc.created_at)}
                      </p>
                      <div className="flex shrink-0 items-center gap-3">
                        {doc.signedUrl && (
                          <a
                            href={doc.signedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-brand"
                          >
                            View
                          </a>
                        )}
                        <button
                          type="button"
                          disabled={deletingId === doc.id}
                          onClick={() => handleDelete(doc)}
                          className="text-xs font-semibold text-red-500 disabled:opacity-40"
                        >
                          {deletingId === doc.id ? "…" : "Delete"}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
