"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { calculatePayslip } from "@/lib/payroll/payslip";
import { getCpfRates, getFwlRates, getSdlConfig } from "@/lib/payroll/rates";
import {
  getOutstandingAdvances,
  recordRepayments,
  suggestedDeduction,
} from "@/lib/payroll/salary-advances";
import { generatePayslipPdf } from "@/lib/payroll/payslip-pdf";

function payDateForRun(month: number, year: number): string {
  return new Date(year, month, 0).toISOString().slice(0, 10);
}

function periodLabel(month: number, year: number): string {
  const lastDay = new Date(year, month, 0).getDate();
  const monthName = new Date(year, month - 1).toLocaleDateString("en-SG", { month: "long" });
  function ord(n: number) {
    const v = n % 100;
    const s = v >= 11 && v <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th";
    return `${n}${s}`;
  }
  return `${ord(1)} ${monthName} ${year} to ${ord(lastDay)} ${monthName} ${year}`;
}

export async function createPayrollRunAction(
  _prevState: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const month = Number(formData.get("month"));
  const year = Number(formData.get("year"));

  if (!month || !year || month < 1 || month > 12) {
    return { error: "Please choose a valid month and year." };
  }

  const { data: existing } = await supabase
    .from("payroll_runs")
    .select("id")
    .eq("month", month)
    .eq("year", year)
    .maybeSingle();

  if (existing) {
    redirect(`/manager/payroll/${existing.id}`);
  }

  const { data: userRes } = await supabase.auth.getUser();

  const { data: run, error } = await supabase
    .from("payroll_runs")
    .insert({ month, year, created_by: userRes.user?.id })
    .select("id")
    .single();

  if (error || !run) {
    return { error: error?.message ?? "Failed to create payroll run." };
  }

  redirect(`/manager/payroll/${run.id}`);
}

export async function generatePayslipsAction(runId: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: run } = await supabase
    .from("payroll_runs")
    .select("month, year")
    .eq("id", runId)
    .single();

  if (!run) return { error: "Payroll run not found." };

  const payDate = payDateForRun(run.month, run.year);

  const [cpfRates, fwlRates, sdlConfig, employeesRes] = await Promise.all([
    getCpfRates(supabase, payDate),
    getFwlRates(supabase, payDate),
    getSdlConfig(supabase, payDate),
    supabase
      .from("employees")
      .select("id, base_salary, date_of_birth, residency_status, skill_level")
      .eq("status", "active"),
  ]);

  if (!sdlConfig) return { error: "No statutory rates found. Please configure rates in Settings → Statutory Rates." };

  const employees = employeesRes.data ?? [];
  const outstandingAdvances = await getOutstandingAdvances(supabase);
  const advancesByEmployee = new Map<string, number>();
  for (const advance of outstandingAdvances) {
    const current = advancesByEmployee.get(advance.employee_id) ?? 0;
    advancesByEmployee.set(advance.employee_id, current + suggestedDeduction(advance));
  }

  const rows = employees.map((employee) => {
    const result = calculatePayslip(
      {
        basicSalary: Number(employee.base_salary),
        transportAllowance: 0,
        allowances: 0,
        overtimeAmount: 0,
        bonus: 0,
        reimbursement: 0,
        midMonthPayment: 0,
        salaryAdvanceDeduction: advancesByEmployee.get(employee.id) ?? 0,
        deductions: 0,
        dateOfBirth: employee.date_of_birth,
        residencyStatus: employee.residency_status,
        skillLevel: employee.skill_level,
      },
      { cpfRates, fwlRates, sdlConfig },
      payDate
    );

    return {
      payroll_run_id: runId,
      employee_id: employee.id,
      basic_salary: result.basicSalary,
      transport_allowance: result.transportAllowance,
      allowances: result.allowances,
      overtime_amount: result.overtimeAmount,
      bonus: result.bonus,
      reimbursement: result.reimbursement,
      mid_month_payment: result.midMonthPayment,
      salary_advance_deduction: result.salaryAdvanceDeduction,
      deductions: result.deductions,
      cpf_employee: result.cpfEmployee,
      cpf_employer: result.cpfEmployer,
      fwl_amount: result.fwlAmount,
      sdl_amount: result.sdlAmount,
      net_pay: result.netPay,
    };
  });

  if (rows.length > 0) {
    await supabase.from("payslips").upsert(rows, { onConflict: "payroll_run_id,employee_id" });
  }

  await supabase.from("payroll_runs").update({ status: "processing" }).eq("id", runId);
  revalidatePath(`/manager/payroll/${runId}`);
  return {};
}

export async function updatePayslipAction(
  payslipId: string,
  _prevState: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: payslip } = await supabase
    .from("payslips")
    .select(
      "payroll_run_id, employees(date_of_birth, residency_status, skill_level), payroll_runs(month, year)"
    )
    .eq("id", payslipId)
    .single();

  if (!payslip) return { error: "Payslip not found." };

  const employee = Array.isArray(payslip.employees) ? payslip.employees[0] : payslip.employees;
  const run = Array.isArray(payslip.payroll_runs) ? payslip.payroll_runs[0] : payslip.payroll_runs;

  if (!employee || !run) return { error: "Payslip is missing related records." };

  const payDate = payDateForRun(run.month, run.year);

  const [cpfRates, fwlRates, sdlConfig] = await Promise.all([
    getCpfRates(supabase, payDate),
    getFwlRates(supabase, payDate),
    getSdlConfig(supabase, payDate),
  ]);

  if (!sdlConfig) return { error: "Statutory rates are not configured." };

  const result = calculatePayslip(
    {
      basicSalary: Number(formData.get("basicSalary")) || 0,
      transportAllowance: Number(formData.get("transportAllowance")) || 0,
      allowances: Number(formData.get("allowances")) || 0,
      overtimeAmount: Number(formData.get("overtimeAmount")) || 0,
      bonus: Number(formData.get("bonus")) || 0,
      reimbursement: Number(formData.get("reimbursement")) || 0,
      midMonthPayment: Number(formData.get("midMonthPayment")) || 0,
      salaryAdvanceDeduction: Number(formData.get("salaryAdvanceDeduction")) || 0,
      deductions: Number(formData.get("deductions")) || 0,
      dateOfBirth: employee.date_of_birth,
      residencyStatus: employee.residency_status,
      skillLevel: employee.skill_level,
    },
    { cpfRates, fwlRates, sdlConfig },
    payDate
  );

  const { error } = await supabase
    .from("payslips")
    .update({
      basic_salary: result.basicSalary,
      transport_allowance: result.transportAllowance,
      allowances: result.allowances,
      overtime_amount: result.overtimeAmount,
      bonus: result.bonus,
      reimbursement: result.reimbursement,
      mid_month_payment: result.midMonthPayment,
      salary_advance_deduction: result.salaryAdvanceDeduction,
      deductions: result.deductions,
      cpf_employee: result.cpfEmployee,
      cpf_employer: result.cpfEmployer,
      fwl_amount: result.fwlAmount,
      sdl_amount: result.sdlAmount,
      net_pay: result.netPay,
    })
    .eq("id", payslipId);

  if (error) return { error: error.message };
  return {};
}

/** Step 3: generate PDFs + record advance repayments + mark completed — all in one. */
export async function finalisePayrollAction(runId: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: run } = await supabase
    .from("payroll_runs")
    .select("month, year, status")
    .eq("id", runId)
    .single();

  if (!run) return { error: "Payroll run not found." };
  if (run.status === "completed") return {};

  const label = periodLabel(run.month, run.year);

  const { data: payslips } = await supabase
    .from("payslips")
    .select(
      "id, employee_id, basic_salary, transport_allowance, allowances, overtime_amount, bonus, reimbursement, mid_month_payment, salary_advance_deduction, deductions, cpf_employee, cpf_employer, net_pay, employees(full_name)"
    )
    .eq("payroll_run_id", runId);

  if (!payslips || payslips.length === 0) return { error: "No payslips to finalise." };

  // Generate and upload PDFs
  for (const payslip of payslips) {
    const emp = Array.isArray(payslip.employees) ? payslip.employees[0] : payslip.employees;

    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await generatePayslipPdf({
        employeeName: emp?.full_name ?? "Unknown",
        periodLabel: label,
        basicSalary: Number(payslip.basic_salary),
        transportAllowance: Number(payslip.transport_allowance),
        allowances: Number(payslip.allowances),
        overtimeAmount: Number(payslip.overtime_amount),
        bonus: Number(payslip.bonus),
        reimbursement: Number(payslip.reimbursement),
        midMonthPayment: Number(payslip.mid_month_payment),
        salaryAdvanceDeduction: Number(payslip.salary_advance_deduction),
        deductions: Number(payslip.deductions),
        cpfEmployee: Number(payslip.cpf_employee),
        cpfEmployer: Number(payslip.cpf_employer),
        netPay: Number(payslip.net_pay),
      });
    } catch (e) {
      return { error: `PDF render failed: ${e instanceof Error ? e.message : String(e)}` };
    }

    const path = `${payslip.employee_id}/${payslip.id}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("payslips")
      .upload(path, pdfBuffer, { contentType: "application/pdf", upsert: true });

    if (uploadError) return { error: `Upload failed: ${uploadError.message}` };

    await supabase.from("payslips").update({ pdf_url: path }).eq("id", payslip.id);
  }

  // Record salary advance repayments
  const outstandingAdvances = await getOutstandingAdvances(supabase);
  const advancesByEmployee = new Map<string, typeof outstandingAdvances>();
  for (const advance of outstandingAdvances) {
    const list = advancesByEmployee.get(advance.employee_id) ?? [];
    list.push(advance);
    advancesByEmployee.set(advance.employee_id, list);
  }
  for (const payslip of payslips) {
    const deduction = Number(payslip.salary_advance_deduction);
    if (deduction <= 0) continue;
    const employeeAdvances = advancesByEmployee.get(payslip.employee_id) ?? [];
    await recordRepayments(supabase, payslip.id, employeeAdvances, deduction);
  }

  await supabase.from("payroll_runs").update({ status: "completed" }).eq("id", runId);

  revalidatePath(`/manager/payroll/${runId}`);
  revalidatePath("/manager/payroll");
  revalidatePath("/manager/salary-advances");
  return {};
}

export async function deletePayrollRunAction(runId: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: run } = await supabase
    .from("payroll_runs")
    .select("status")
    .eq("id", runId)
    .single();

  if (!run) return { error: "Payroll run not found." };
  if (run.status === "completed") return { error: "Completed payroll runs cannot be deleted." };

  const { error } = await supabase.from("payroll_runs").delete().eq("id", runId);
  if (error) return { error: error.message };

  redirect("/manager/payroll");
}

export async function downloadPayrollExcelAction(
  runId: string
): Promise<{ base64?: string; filename?: string; error?: string }> {
  const supabase = await createClient();

  const { data: run } = await supabase
    .from("payroll_runs")
    .select("month, year")
    .eq("id", runId)
    .single();

  if (!run) return { error: "Payroll run not found." };

  const { data: payslips } = await supabase
    .from("payslips")
    .select(
      `id, basic_salary, transport_allowance, allowances, overtime_amount, bonus,
       reimbursement, mid_month_payment, salary_advance_deduction, deductions,
       cpf_employee, cpf_employer, net_pay,
       employees(full_name, bank_name, bank_account_number)`
    )
    .eq("payroll_run_id", runId)
    .order("employees(full_name)");

  if (!payslips || payslips.length === 0) return { error: "No payslips found." };

  const monthName = new Date(run.year, run.month - 1).toLocaleDateString("en-SG", {
    month: "long",
    year: "numeric",
  });

  const rows = payslips.map((p, i) => {
    const emp = Array.isArray(p.employees) ? p.employees[0] : p.employees;
    return {
      "No.": i + 1,
      "Employee Name": emp?.full_name ?? "",
      "Bank Name": emp?.bank_name ?? "",
      "Bank Account No.": emp?.bank_account_number ?? "",
      "Basic Salary": Number(p.basic_salary),
      "Transport Allowance": Number(p.transport_allowance),
      "Other Allowances": Number(p.allowances),
      "Overtime": Number(p.overtime_amount),
      "Bonus": Number(p.bonus),
      "Reimbursement": Number(p.reimbursement),
      "Mid-Month Advance": Number(p.mid_month_payment),
      "Salary Advance Repayment": Number(p.salary_advance_deduction),
      "Other Deductions": Number(p.deductions),
      "CPF (Employee)": Number(p.cpf_employee),
      "CPF (Employer)": Number(p.cpf_employer),
      "Net Pay": Number(p.net_pay),
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);

  // Column widths
  ws["!cols"] = [
    { wch: 5 },  // No.
    { wch: 28 }, // Employee Name
    { wch: 16 }, // Bank Name
    { wch: 20 }, // Bank Account No.
    { wch: 14 }, // Basic Salary
    { wch: 20 }, // Transport Allowance
    { wch: 16 }, // Other Allowances
    { wch: 10 }, // Overtime
    { wch: 10 }, // Bonus
    { wch: 14 }, // Reimbursement
    { wch: 18 }, // Mid-Month Advance
    { wch: 24 }, // Salary Advance Repayment
    { wch: 16 }, // Other Deductions
    { wch: 16 }, // CPF (Employee)
    { wch: 16 }, // CPF (Employer)
    { wch: 12 }, // Net Pay
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, monthName);

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const base64 = buffer.toString("base64");
  const filename = `Payroll_${run.year}_${String(run.month).padStart(2, "0")}.xlsx`;

  return { base64, filename };
}
