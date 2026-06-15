"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { DocumentType } from "@/lib/types/database";

interface DocumentFormState {
  error?: string;
}

export async function uploadDocumentAction(
  _prevState: DocumentFormState,
  formData: FormData
): Promise<DocumentFormState> {
  const supabase = await createClient();

  const employeeId = String(formData.get("employeeId") ?? "");
  const documentType = String(formData.get("documentType") ?? "other") as DocumentType;
  const expiryDate = String(formData.get("expiryDate") ?? "") || null;
  const file = formData.get("file") as File | null;

  if (!employeeId || !file || file.size === 0) {
    return { error: "Please select an employee and a file." };
  }

  const { data: userRes } = await supabase.auth.getUser();
  const path = `${employeeId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage.from("documents").upload(path, file);

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { error } = await supabase.from("documents").insert({
    employee_id: employeeId,
    document_type: documentType,
    file_url: path,
    expiry_date: expiryDate,
    uploaded_by: userRes.user?.id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/manager/documents");
  return {};
}

export async function deleteDocumentAction(documentId: string, filePath: string): Promise<void> {
  const supabase = await createClient();
  await supabase.storage.from("documents").remove([filePath]);
  await supabase.from("documents").delete().eq("id", documentId);
  revalidatePath("/manager/documents");
}
