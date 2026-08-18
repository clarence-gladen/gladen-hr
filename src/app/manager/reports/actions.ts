"use server";

import { createClient } from "@/lib/supabase/server";
import { buildServiceReportData } from "@/lib/reports/service-report";
import { generateServiceReportPdf } from "@/lib/reports/service-report-pdf";

const pad2 = (n: number) => String(n).padStart(2, "0");

export interface ReportFormValues {
  remarks: string;
  supervisorName: string;
  coverMessage: string;
  excludedItemIds: string[];
}

export async function saveAndGenerateReportAction(
  contractId: string,
  year: number,
  month: number,
  values: ReportFormValues
): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();

  // Persist the manager's edits so they pre-fill next time.
  const { error: upsertErr } = await supabase.from("service_reports").upsert(
    {
      contract_id: contractId,
      year,
      month,
      remarks: values.remarks || null,
      supervisor_name: values.supervisorName || null,
      cover_message: values.coverMessage || null,
      excluded_item_ids: values.excludedItemIds,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "contract_id,year,month" }
  );
  if (upsertErr) return { error: upsertErr.message };

  const data = await buildServiceReportData(supabase, contractId, year, month, {
    remarks: values.remarks,
    supervisorName: values.supervisorName,
    coverMessage: values.coverMessage,
    excludedItemIds: values.excludedItemIds,
  });
  if (!data) return { error: "Site not found." };

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await generateServiceReportPdf(data);
  } catch (e) {
    return { error: `PDF generation failed: ${e instanceof Error ? e.message : String(e)}` };
  }

  const storagePath = `service-reports/${contractId}/${year}-${pad2(month)}.pdf`;
  const { error: uploadErr } = await supabase.storage
    .from("payslips")
    .upload(storagePath, pdfBuffer, { contentType: "application/pdf", upsert: true });
  if (uploadErr) return { error: `Upload failed: ${uploadErr.message}` };

  const { data: signed } = await supabase.storage
    .from("payslips")
    .createSignedUrl(storagePath, 3600);
  if (!signed?.signedUrl) return { error: "Could not create download link." };

  return { url: signed.signedUrl };
}
