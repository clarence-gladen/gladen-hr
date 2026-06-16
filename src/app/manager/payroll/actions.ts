"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
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
  // Last day of the payroll month.
  return new Date(year, month, 0).toISOString().slice(0, 10);
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

export async function generatePayslipsAction(runId: string): Promise<void> {
  const supabase = await createClient();

  const { data: run } = await supabase
    .from("payroll_runs")
    .select("month, year")
    .eq("id", runId)
    .single();

  if (!run) return;

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

  if (!sdlConfig) return;

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
        overtimeAmount: 0,
        allowances: 0,
        reimbursements: 0,
        deductions: 0,
        salaryAdvanceDeduction: advancesByEmployee.get(employee.id) ?? 0,
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
      overtime_amount: result.overtimeAmount,
      allowances: result.allowances,
      reimbursements: result.reimbursements,
      deductions: result.deductions,
      salary_advance_deduction: result.salaryAdvanceDeduction,
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

  if (!payslip) {
    return { error: "Payslip not found." };
  }

  const employee = Array.isArray(payslip.employees) ? payslip.employees[0] : payslip.employees;
  const run = Array.isArray(payslip.payroll_runs) ? payslip.payroll_runs[0] : payslip.payroll_runs;

  if (!employee || !run) {
    return { error: "Payslip is missing related records." };
  }

  const payDate = payDateForRun(run.month, run.year);

  const [cpfRates, fwlRates, sdlConfig] = await Promise.all([
    getCpfRates(supabase, payDate),
    getFwlRates(supabase, payDate),
    getSdlConfig(supabase, payDate),
  ]);

  if (!sdlConfig) {
    return { error: "Statutory rates are not configured." };
  }

  const result = calculatePayslip(
    {
      basicSalary: Number(formData.get("basicSalary")) || 0,
      overtimeAmount: Number(formData.get("overtimeAmount")) || 0,
      allowances: Number(formData.get("allowances")) || 0,
      reimbursements: Number(formData.get("reimbursements")) || 0,
      deductions: Number(formData.get("deductions")) || 0,
      salaryAdvanceDeduction: Number(formData.get("salaryAdvanceDeduction")) || 0,
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
      overtime_amount: result.overtimeAmount,
      allowances: result.allowances,
      reimbursements: result.reimbursements,
      deductions: result.deductions,
      salary_advance_deduction: result.salaryAdvanceDeduction,
      cpf_employee: result.cpfEmployee,
      cpf_employer: result.cpfEmployer,
      fwl_amount: result.fwlAmount,
      sdl_amount: result.sdlAmount,
      net_pay: result.netPay,
    })
    .eq("id", payslipId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/manager/payroll/${payslip.payroll_run_id}`);
  return {};
}

export async function generatePdfsAction(runId: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: run } = await supabase
    .from("payroll_runs")
    .select("month, year")
    .eq("id", runId)
    .single();

  if (!run) return { error: "Payroll run not found." };

  const periodLabel = new Date(run.year, run.month - 1).toLocaleDateString("en-SG", {
    month: "long",
    year: "numeric",
  });

  const { data: payslips } = await supabase
    .from("payslips")
    .select("id, employee_id, basic_salary, overtime_amount, allowances, reimbursements, deductions, salary_advance_deduction, cpf_employee, cpf_employer, fwl_amount, sdl_amount, net_pay, employees(full_name)")
    .eq("payroll_run_id", runId);

  if (!payslips || payslips.length === 0) return { error: "No payslips to generate." };

  for (const payslip of payslips) {
    const emp = Array.isArray(payslip.employees) ? payslip.employees[0] : payslip.employees;

    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await generatePayslipPdf({
        employeeName: emp?.full_name ?? "Unknown",
        periodLabel,
        basicSalary: Number(payslip.basic_salary),
        overtimeAmount: Number(payslip.overtime_amount),
        allowances: Number(payslip.allowances),
        reimbursements: Number(payslip.reimbursements),
        deductions: Number(payslip.deductions),
        salaryAdvanceDeduction: Number(payslip.salary_advance_deduction),
        cpfEmployee: Number(payslip.cpf_employee),
        cpfEmployer: Number(payslip.cpf_employer),
        fwlAmount: Number(payslip.fwl_amount),
        netPay: Number(payslip.net_pay),
      });
    } catch (e) {
      return { error: `PDF render failed: ${e instanceof Error ? e.message : String(e)}` };
    }

    const path = `${payslip.employee_id}/${payslip.id}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("payslips")
      .upload(path, pdfBuffer, { contentType: "application/pdf", upsert: true });

    if (uploadError) {
      return { error: `Upload failed: ${uploadError.message}` };
    }

    const { error: updateError } = await supabase
      .from("payslips")
      .update({ pdf_url: path })
      .eq("id", payslip.id);

    if (updateError) {
      return { error: `DB update failed: ${updateError.message}` };
    }
  }

  revalidatePath(`/manager/payroll/${runId}`);
  return {};
}

export async function finalizePayrollRunAction(runId: string): Promise<void> {
  const supabase = await createClient();

  const { data: run } = await supabase
    .from("payroll_runs")
    .select("status")
    .eq("id", runId)
    .single();

  if (run?.status !== "completed") {
    const { data: payslips } = await supabase
      .from("payslips")
      .select("id, employee_id, salary_advance_deduction")
      .eq("payroll_run_id", runId);

    const outstandingAdvances = await getOutstandingAdvances(supabase);
    const advancesByEmployee = new Map<string, typeof outstandingAdvances>();
    for (const advance of outstandingAdvances) {
      const list = advancesByEmployee.get(advance.employee_id) ?? [];
      list.push(advance);
      advancesByEmployee.set(advance.employee_id, list);
    }

    for (const payslip of payslips ?? []) {
      const deduction = Number(payslip.salary_advance_deduction);
      if (deduction <= 0) continue;
      const employeeAdvances = advancesByEmployee.get(payslip.employee_id) ?? [];
      await recordRepayments(supabase, payslip.id, employeeAdvances, deduction);
    }
  }

  await supabase.from("payroll_runs").update({ status: "completed" }).eq("id", runId);
  revalidatePath(`/manager/payroll/${runId}`);
  revalidatePath("/manager/payroll");
  revalidatePath("/manager/salary-advances");
}
