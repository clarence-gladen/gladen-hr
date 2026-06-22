"use server";

import { createClient } from "@/lib/supabase/server";
import { generateIr8aPdf } from "@/lib/payroll/ir8a-pdf";

export async function generateIr8aPdfAction(
  employeeId: string,
  year: number,
): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();

  const { data: employee, error: empErr } = await supabase
    .from("employees")
    .select("full_name, nric_last4, date_of_birth, designation, employment_start_date, employment_end_date")
    .eq("id", employeeId)
    .single();

  if (empErr || !employee) return { error: "Employee not found." };

  const { data: runs } = await supabase
    .from("payroll_runs")
    .select("id")
    .eq("year", year)
    .eq("status", "completed");

  const runIds = (runs ?? []).map((r) => r.id);
  if (runIds.length === 0) return { error: `No completed payroll runs for ${year}.` };

  const { data: payslips } = await supabase
    .from("payslips")
    .select("basic_salary, transport_allowance, allowances, overtime_amount, bonus, reimbursement, cpf_employee, cpf_employer")
    .eq("employee_id", employeeId)
    .in("payroll_run_id", runIds);

  if (!payslips || payslips.length === 0) {
    return { error: `No payslips found for this employee in ${year}.` };
  }

  let employmentIncome = 0;
  let bonus = 0;
  let reimbursement = 0;
  let cpfEmployee = 0;
  let cpfEmployer = 0;

  for (const p of payslips) {
    employmentIncome +=
      Number(p.basic_salary) + Number(p.transport_allowance) + Number(p.allowances) + Number(p.overtime_amount);
    bonus += Number(p.bonus);
    reimbursement += Number(p.reimbursement);
    cpfEmployee += Number(p.cpf_employee);
    cpfEmployer += Number(p.cpf_employer);
  }

  const jan1 = `${year}-01-01`;
  const dec31 = `${year}-12-31`;
  const empStart = employee.employment_start_date ?? jan1;
  const periodStart = empStart >= jan1 ? empStart : jan1;
  const periodEnd =
    employee.employment_end_date && employee.employment_end_date <= dec31
      ? employee.employment_end_date
      : dec31;

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await generateIr8aPdf({
      year,
      employeeName: employee.full_name,
      nricLast4: employee.nric_last4 ?? "????",
      dateOfBirth: employee.date_of_birth ?? jan1,
      designation: employee.designation ?? null,
      periodStart,
      periodEnd,
      employmentIncome,
      bonus,
      reimbursement,
      cpfEmployee,
      cpfEmployer,
    });
  } catch (e) {
    return { error: `PDF generation failed: ${e instanceof Error ? e.message : String(e)}` };
  }

  const storagePath = `ir8a/${year}/${employeeId}.pdf`;
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
