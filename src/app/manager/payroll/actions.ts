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
import { calculateAge, getCpfBracket } from "@/lib/payroll/statutory";
import {
  isOnProbation,
  getAvailableAnnualLeave,
  getAvailableSickLeave,
  getAvailableHospitalizationLeave,
} from "@/lib/leave/entitlement";

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

  const monthStart = `${run.year}-${String(run.month).padStart(2, "0")}-01`;
  const nextMonth = run.month === 12 ? 1 : run.month + 1;
  const nextYear = run.month === 12 ? run.year + 1 : run.year;
  const monthEnd = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

  const [cpfRates, fwlRates, sdlConfig, employeesRes, otRes, prevRunRes] = await Promise.all([
    getCpfRates(supabase, payDate),
    getFwlRates(supabase, payDate),
    getSdlConfig(supabase, payDate),
    supabase
      .from("employees")
      .select("id, base_salary, date_of_birth, residency_status, skill_level")
      .eq("status", "active"),
    supabase
      .from("overtime_records")
      .select("employee_id, amount")
      .gte("work_date", monthStart)
      .lt("work_date", monthEnd),
    supabase
      .from("payroll_runs")
      .select("id")
      .neq("id", runId)
      .or(`year.lt.${run.year},and(year.eq.${run.year},month.lt.${run.month})`)
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(1),
  ]);

  if (!sdlConfig) return { error: "No statutory rates found. Please configure rates in Settings → Statutory Rates." };

  const employees = employeesRes.data ?? [];
  const otByEmployee = new Map<string, number>();
  for (const ot of otRes.data ?? []) {
    const current = otByEmployee.get(ot.employee_id) ?? 0;
    otByEmployee.set(ot.employee_id, current + Number(ot.amount));
  }

  // Carry over recurring fields from the most recent previous payroll run
  type PrevFields = { transport_allowance: number; allowances: number; deductions: number; mid_month_payment: number };
  const prevPayslips = new Map<string, PrevFields>();
  const prevRunId = prevRunRes.data?.[0]?.id ?? null;
  if (prevRunId) {
    const { data: prevData } = await supabase
      .from("payslips")
      .select("employee_id, transport_allowance, allowances, deductions, mid_month_payment")
      .eq("payroll_run_id", prevRunId);
    for (const p of prevData ?? []) {
      prevPayslips.set(p.employee_id, {
        transport_allowance: Number(p.transport_allowance),
        allowances: Number(p.allowances),
        deductions: Number(p.deductions),
        mid_month_payment: Number(p.mid_month_payment),
      });
    }
  }

  const outstandingAdvances = await getOutstandingAdvances(supabase);
  const advancesByEmployee = new Map<string, number>();
  for (const advance of outstandingAdvances) {
    const current = advancesByEmployee.get(advance.employee_id) ?? 0;
    advancesByEmployee.set(advance.employee_id, current + suggestedDeduction(advance));
  }

  const rows = employees.map((employee) => {
    const prev = prevPayslips.get(employee.id);
    const result = calculatePayslip(
      {
        basicSalary: Number(employee.base_salary),
        transportAllowance: prev?.transport_allowance ?? 0,
        allowances: prev?.allowances ?? 0,
        overtimeAmount: otByEmployee.get(employee.id) ?? 0,
        bonus: 0,
        reimbursement: 0,
        midMonthPayment: prev?.mid_month_payment ?? 0,
        salaryAdvanceDeduction: advancesByEmployee.get(employee.id) ?? 0,
        unpaidLeave: 0,
        deductions: prev?.deductions ?? 0,
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
      unpaid_leave: result.unpaidLeave,
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
      unpaidLeave: Number(formData.get("unpaidLeave")) || 0,
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
      unpaid_leave: result.unpaidLeave,
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

/** Regenerate payslip PDFs for an already-completed run (e.g. after a template update). */
export async function regeneratePdfsAction(runId: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: run } = await supabase
    .from("payroll_runs")
    .select("month, year")
    .eq("id", runId)
    .single();

  if (!run) return { error: "Payroll run not found." };

  const label = periodLabel(run.month, run.year);
  const payDate = payDateForRun(run.month, run.year);

  const { data: payslips } = await supabase
    .from("payslips")
    .select(
      "id, employee_id, basic_salary, transport_allowance, allowances, overtime_amount, bonus, reimbursement, mid_month_payment, salary_advance_deduction, unpaid_leave, deductions, cpf_employee, cpf_employer, net_pay, employees(full_name, nric_last4, date_of_birth, employment_start_date, residency_status)"
    )
    .eq("payroll_run_id", runId);

  if (!payslips || payslips.length === 0) return { error: "No payslips found." };

  const cpfRates = await getCpfRates(supabase, payDate);
  const employeeIds = payslips.map((p) => p.employee_id);
  const { data: leaveBalancesData } = await supabase
    .from("leave_balances")
    .select("employee_id, annual_used, sick_used, hospitalization_used")
    .in("employee_id", employeeIds)
    .lte("year_start", payDate)
    .gte("year_end", payDate);
  const leaveBalanceMap = new Map(
    (leaveBalancesData ?? []).map((lb) => [lb.employee_id, lb])
  );

  const pdfFailures: string[] = [];
  for (const payslip of payslips) {
    const emp = Array.isArray(payslip.employees) ? payslip.employees[0] : payslip.employees;
    const empName = (emp as { full_name?: string } | null)?.full_name ?? "Unknown";
    const dob = (emp as { date_of_birth?: string } | null)?.date_of_birth ?? "";
    const startDate = (emp as { employment_start_date?: string } | null)?.employment_start_date ?? "";
    const residency = (emp as { residency_status?: string } | null)?.residency_status ?? "";
    const nricLast4 = (emp as { nric_last4?: string } | null)?.nric_last4 ?? "";

    const isCpfEligible = residency === "citizen" || residency === "pr";
    const age = dob ? calculateAge(dob, payDate) : null;
    const bracket = isCpfEligible && age !== null ? getCpfBracket(age, cpfRates) : null;

    const lb = leaveBalanceMap.get(payslip.employee_id);
    const onProbation = startDate ? isOnProbation(startDate, payDate) : true;
    const annualEntitlement = startDate && !onProbation ? getAvailableAnnualLeave(startDate, payDate) : 0;
    const sickEntitlement = startDate && !onProbation ? getAvailableSickLeave(startDate, payDate) : 0;
    const hospEntitlement = startDate && !onProbation ? getAvailableHospitalizationLeave(startDate, payDate) : 0;

    try {
      const pdfBuffer = await generatePayslipPdf({
        employeeName: empName,
        nricMasked: nricLast4 ? `*****${nricLast4}` : "N/A",
        dateOfBirth: dob,
        employmentStartDate: startDate,
        cpfEmployeeRate: bracket?.employee_rate ?? 0,
        cpfEmployerRate: bracket?.employer_rate ?? 0,
        periodLabel: label,
        basicSalary: Number(payslip.basic_salary),
        transportAllowance: Number(payslip.transport_allowance),
        allowances: Number(payslip.allowances),
        overtimeAmount: Number(payslip.overtime_amount),
        bonus: Number(payslip.bonus),
        reimbursement: Number(payslip.reimbursement),
        midMonthPayment: Number(payslip.mid_month_payment),
        salaryAdvanceDeduction: Number(payslip.salary_advance_deduction),
        unpaidLeave: Number(payslip.unpaid_leave),
        deductions: Number(payslip.deductions),
        cpfEmployee: Number(payslip.cpf_employee),
        cpfEmployer: Number(payslip.cpf_employer),
        netPay: Number(payslip.net_pay),
        annualLeaveBalance: Math.max(0, annualEntitlement - Number(lb?.annual_used ?? 0)),
        sickLeaveBalance: Math.max(0, sickEntitlement - Number(lb?.sick_used ?? 0) - Number(lb?.hospitalization_used ?? 0)),
        hospitalizationLeaveBalance: Math.max(0, hospEntitlement - Number(lb?.hospitalization_used ?? 0)),
      });

      const path = `${payslip.employee_id}/${payslip.id}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("payslips")
        .upload(path, pdfBuffer, { contentType: "application/pdf", upsert: true });

      if (uploadError) {
        pdfFailures.push(empName);
        continue;
      }

      await supabase.from("payslips").update({ pdf_url: path }).eq("id", payslip.id);
    } catch {
      pdfFailures.push(empName);
      continue;
    }
  }

  if (pdfFailures.length > 0) {
    return { error: `PDFs could not be generated for: ${pdfFailures.join(", ")}. Please check their employee records and try again.` };
  }
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
      "id, employee_id, basic_salary, transport_allowance, allowances, overtime_amount, bonus, reimbursement, mid_month_payment, salary_advance_deduction, unpaid_leave, deductions, cpf_employee, cpf_employer, net_pay, employees(full_name, nric_last4, date_of_birth, employment_start_date, residency_status)"
    )
    .eq("payroll_run_id", runId);

  if (!payslips || payslips.length === 0) return { error: "No payslips to finalise." };

  const payDate = payDateForRun(run.month, run.year);
  const cpfRates = await getCpfRates(supabase, payDate);

  const employeeIds = payslips.map((p) => p.employee_id);
  const { data: leaveBalancesData } = await supabase
    .from("leave_balances")
    .select("employee_id, annual_used, sick_used, hospitalization_used")
    .in("employee_id", employeeIds)
    .lte("year_start", payDate)
    .gte("year_end", payDate);
  const leaveBalanceMap = new Map(
    (leaveBalancesData ?? []).map((lb) => [lb.employee_id, lb])
  );

  // Generate and upload PDFs. A single employee's failure must NOT abort the
  // whole run — collect failures and keep going so everyone else still gets a PDF.
  const pdfFailures: string[] = [];
  for (const payslip of payslips) {
    const emp = Array.isArray(payslip.employees) ? payslip.employees[0] : payslip.employees;
    const empName = (emp as { full_name?: string } | null)?.full_name ?? "Unknown";

    const dob = (emp as { date_of_birth?: string } | null)?.date_of_birth ?? "";
    const startDate = (emp as { employment_start_date?: string } | null)?.employment_start_date ?? "";
    const residency = (emp as { residency_status?: string } | null)?.residency_status ?? "";
    const nricLast4 = (emp as { nric_last4?: string } | null)?.nric_last4 ?? "";

    const isCpfEligible = residency === "citizen" || residency === "pr";
    const age = dob ? calculateAge(dob, payDate) : null;
    const bracket = isCpfEligible && age !== null ? getCpfBracket(age, cpfRates) : null;

    const lb = leaveBalanceMap.get(payslip.employee_id);
    const onProbation = startDate ? isOnProbation(startDate, payDate) : true;
    const annualEntitlement = startDate && !onProbation ? getAvailableAnnualLeave(startDate, payDate) : 0;
    const sickEntitlement = startDate && !onProbation ? getAvailableSickLeave(startDate, payDate) : 0;
    const hospEntitlement = startDate && !onProbation ? getAvailableHospitalizationLeave(startDate, payDate) : 0;

    try {
      const pdfBuffer = await generatePayslipPdf({
        employeeName: empName,
        nricMasked: nricLast4 ? `*****${nricLast4}` : "N/A",
        dateOfBirth: dob,
        employmentStartDate: startDate,
        cpfEmployeeRate: bracket?.employee_rate ?? 0,
        cpfEmployerRate: bracket?.employer_rate ?? 0,
        periodLabel: label,
        basicSalary: Number(payslip.basic_salary),
        transportAllowance: Number(payslip.transport_allowance),
        allowances: Number(payslip.allowances),
        overtimeAmount: Number(payslip.overtime_amount),
        bonus: Number(payslip.bonus),
        reimbursement: Number(payslip.reimbursement),
        midMonthPayment: Number(payslip.mid_month_payment),
        salaryAdvanceDeduction: Number(payslip.salary_advance_deduction),
        unpaidLeave: Number(payslip.unpaid_leave),
        deductions: Number(payslip.deductions),
        cpfEmployee: Number(payslip.cpf_employee),
        cpfEmployer: Number(payslip.cpf_employer),
        netPay: Number(payslip.net_pay),
        annualLeaveBalance: Math.max(0, annualEntitlement - Number(lb?.annual_used ?? 0)),
        sickLeaveBalance: Math.max(0, sickEntitlement - Number(lb?.sick_used ?? 0) - Number(lb?.hospitalization_used ?? 0)),
        hospitalizationLeaveBalance: Math.max(0, hospEntitlement - Number(lb?.hospitalization_used ?? 0)),
      });

      const path = `${payslip.employee_id}/${payslip.id}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("payslips")
        .upload(path, pdfBuffer, { contentType: "application/pdf", upsert: true });

      if (uploadError) {
        pdfFailures.push(empName);
        continue;
      }

      await supabase.from("payslips").update({ pdf_url: path }).eq("id", payslip.id);
    } catch {
      pdfFailures.push(empName);
      continue;
    }
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

  // Notify employees their payslips are ready
  const monthName = new Date(run.year, run.month - 1).toLocaleDateString("en-SG", {
    month: "long",
    year: "numeric",
  });
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, employee_id")
    .in("employee_id", employeeIds);
  if (profiles && profiles.length > 0) {
    const notificationRows = profiles.map((prof) => {
      const payslip = payslips.find((p) => p.employee_id === prof.employee_id);
      const netPay = payslip ? Number(payslip.net_pay).toFixed(2) : null;
      return {
        user_id: prof.id,
        title: `Payslip Ready — ${monthName}`,
        body: netPay
          ? `Your payslip for ${monthName} is available. Net pay: S$${netPay}.`
          : `Your payslip for ${monthName} is now available.`,
        type: "payslip",
        is_read: false,
      };
    });
    await supabase.from("notifications").insert(notificationRows);
  }

  revalidatePath(`/manager/payroll/${runId}`);
  revalidatePath("/manager/payroll");
  revalidatePath("/manager/salary-advances");

  if (pdfFailures.length > 0) {
    return {
      error: `Payroll finalised, but PDFs could not be generated for: ${pdfFailures.join(", ")}. Use "Regenerate PDFs" to retry.`,
    };
  }
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

export async function downloadAllPdfsAction(
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
    .select("id, pdf_url, employees(full_name)")
    .eq("payroll_run_id", runId)
    .not("pdf_url", "is", null);

  if (!payslips || payslips.length === 0)
    return { error: "No PDFs found. Finalise the payroll run first." };

  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const monthLabel = new Date(run.year, run.month - 1).toLocaleDateString("en-SG", {
    month: "long",
    year: "numeric",
  }).replace(" ", ""); // e.g. "June2026"

  await Promise.all(
    payslips.map(async (payslip) => {
      const emp = Array.isArray(payslip.employees) ? payslip.employees[0] : payslip.employees;
      const name = (emp as { full_name?: string } | null)?.full_name ?? payslip.id;

      const { data: fileData, error: dlError } = await supabase.storage
        .from("payslips")
        .download(payslip.pdf_url!);

      if (dlError || !fileData) return;

      const arrayBuffer = await fileData.arrayBuffer();
      const safeName = name.replace(/[^a-zA-Z0-9 _\-]/g, "").trim();
      zip.file(`${safeName}_${monthLabel}.pdf`, arrayBuffer);
    })
  );

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  const month = String(run.month).padStart(2, "0");

  return {
    base64: zipBuffer.toString("base64"),
    filename: `Payslips_${run.year}_${month}.zip`,
  };
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
       reimbursement, mid_month_payment, salary_advance_deduction, unpaid_leave, deductions,
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
      "Unpaid Leave": Number(p.unpaid_leave),
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
    { wch: 14 }, // Unpaid Leave
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

export async function downloadCpfSubmissionAction(
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
      "employee_id, basic_salary, transport_allowance, allowances, overtime_amount, bonus, cpf_employee, cpf_employer, employees(full_name)"
    )
    .eq("payroll_run_id", runId)
    .order("employees(full_name)");

  if (!payslips || payslips.length === 0) return { error: "No payslips found." };

  const nricResults = await Promise.all(
    payslips.map((p) =>
      supabase.rpc("get_employee_nric", {
        p_employee_id: p.employee_id,
        p_secret: process.env.NRIC_ENCRYPTION_KEY!,
      })
    )
  );

  const monthName = new Date(run.year, run.month - 1).toLocaleDateString("en-SG", {
    month: "long",
    year: "numeric",
  });

  const rows = payslips.map((p, i) => {
    const emp = Array.isArray(p.employees) ? p.employees[0] : p.employees;
    const ow = Number(p.basic_salary) + Number(p.transport_allowance) + Number(p.allowances) + Number(p.overtime_amount);
    const aw = Number(p.bonus);
    const eeCpf = Number(p.cpf_employee);
    const erCpf = Number(p.cpf_employer);
    return {
      "No.": i + 1,
      "Employee Name": emp?.full_name ?? "",
      "NRIC / FIN": (nricResults[i].data as string | null) ?? "—",
      "Ordinary Wages": ow,
      "Additional Wages": aw,
      "Total Wages": ow + aw,
      "CPF (Employee)": eeCpf,
      "CPF (Employer)": erCpf,
      "Total CPF": eeCpf + erCpf,
    };
  });

  const totalRow = {
    "No.": "",
    "Employee Name": "TOTAL",
    "NRIC / FIN": "",
    "Ordinary Wages": rows.reduce((s, r) => s + Number(r["Ordinary Wages"]), 0),
    "Additional Wages": rows.reduce((s, r) => s + Number(r["Additional Wages"]), 0),
    "Total Wages": rows.reduce((s, r) => s + Number(r["Total Wages"]), 0),
    "CPF (Employee)": rows.reduce((s, r) => s + Number(r["CPF (Employee)"]), 0),
    "CPF (Employer)": rows.reduce((s, r) => s + Number(r["CPF (Employer)"]), 0),
    "Total CPF": rows.reduce((s, r) => s + Number(r["Total CPF"]), 0),
  };

  const ws = XLSX.utils.json_to_sheet([...rows, totalRow]);
  ws["!cols"] = [
    { wch: 5 }, { wch: 28 }, { wch: 14 },
    { wch: 18 }, { wch: 18 }, { wch: 14 },
    { wch: 16 }, { wch: 16 }, { wch: 14 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `CPF ${monthName}`);
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return {
    base64: buffer.toString("base64"),
    filename: `CPF_Submission_${run.year}_${String(run.month).padStart(2, "0")}.xlsx`,
  };
}

export async function downloadGiroAction(
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
    .select("net_pay, employees(full_name, bank_name, bank_account_number)")
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
      "Account Number": emp?.bank_account_number ?? "",
      "Net Pay (SGD)": Number(p.net_pay),
      "Payment Reference": `Salary ${monthName}`,
    };
  });

  const totalRow = {
    "No.": "",
    "Employee Name": "TOTAL",
    "Bank Name": "",
    "Account Number": "",
    "Net Pay (SGD)": rows.reduce((s, r) => s + Number(r["Net Pay (SGD)"]), 0),
    "Payment Reference": "",
  };

  const ws = XLSX.utils.json_to_sheet([...rows, totalRow]);
  ws["!cols"] = [
    { wch: 5 }, { wch: 28 }, { wch: 18 }, { wch: 24 }, { wch: 16 }, { wch: 22 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `GIRO ${monthName}`);
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return {
    base64: buffer.toString("base64"),
    filename: `GIRO_${run.year}_${String(run.month).padStart(2, "0")}.xlsx`,
  };
}
