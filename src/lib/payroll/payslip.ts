import type { ResidencyStatus, SkillLevel } from "@/lib/types/database";
import {
  calculateAge,
  calculateCpf,
  calculateCpfOnAw,
  calculateFwl,
  calculateSdl,
  getSprYearIndex,
  resolveCpfCategory,
  selectCpfRatesByCategory,
  type CpfRate,
  type FwlRate,
  type SdlConfig,
} from "./statutory";

export interface PayslipInputs {
  basicSalary: number;
  transportAllowance: number;
  allowances: number; // "Other Allowance"
  overtimeAmount: number;
  bonus: number; // Additional Wage — CPF applies; annual AW ceiling checked manually
  reimbursement: number; // Tax-exempt — not subject to CPF or income tax
  midMonthPayment: number;
  salaryAdvanceDeduction: number; // "Salary Loan"
  unpaidLeave: number; // "Unpaid Leave"
  deductions: number; // "Other Deductions"
  dateOfBirth: string;
  residencyStatus: ResidencyStatus;
  skillLevel?: SkillLevel;
  // Date the employee obtained PR status (YYYY-MM-DD). Drives graduated CPF for
  // 1st/2nd-year PRs; null/undefined falls back to full rates.
  sprEffectiveDate?: string | null;
}

export interface PayslipRateTables {
  cpfRates: CpfRate[];
  fwlRates: FwlRate[];
  sdlConfig: SdlConfig;
}

export interface PayslipResult {
  basicSalary: number;
  transportAllowance: number;
  allowances: number;
  overtimeAmount: number;
  bonus: number;
  reimbursement: number;
  midMonthPayment: number;
  salaryAdvanceDeduction: number;
  unpaidLeave: number;
  deductions: number;
  cpfEmployee: number;
  cpfEmployer: number;
  fwlAmount: number;
  sdlAmount: number;
  netPay: number;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Computes a full payslip breakdown for one employee.
 *
 * CPF on Ordinary Wage (OW) and on bonus (Additional Wage) applies to citizens/PRs.
 * FWL and SDL are employer costs and are not deducted from employee net pay.
 * Net pay = OW + bonus − CPF(employee, OW) − CPF(employee, AW) − mid-month − salary loan − other deductions.
 */
export function calculatePayslip(
  inputs: PayslipInputs,
  rates: PayslipRateTables,
  payDate: string = new Date().toISOString().slice(0, 10)
): PayslipResult {
  const ordinaryWage =
    inputs.basicSalary +
    inputs.transportAllowance +
    inputs.allowances +
    inputs.overtimeAmount;

  const isCpfEligible =
    inputs.residencyStatus === "citizen" || inputs.residencyStatus === "pr";

  let cpfEmployee = 0;
  let cpfEmployer = 0;
  if (isCpfEligible) {
    // CPF age band uses age as at the FIRST day of the salary month — CPF rates
    // change from the first day of the month AFTER the employee's birthday month.
    const ageAsOf = payDate.slice(0, 8) + "01";
    const age = calculateAge(inputs.dateOfBirth, ageAsOf);
    // PRs pay lower graduated rates in their first two years of PR status.
    const sprYear = getSprYearIndex(inputs.sprEffectiveDate, ageAsOf);
    const category = resolveCpfCategory(inputs.residencyStatus, sprYear);
    const applicableRates = selectCpfRatesByCategory(rates.cpfRates, category);
    const cpfOw = calculateCpf(ordinaryWage, age, applicableRates);
    const cpfAw = calculateCpfOnAw(inputs.bonus, age, applicableRates);
    cpfEmployee = cpfOw.employeeContribution + cpfAw.employeeContribution;
    cpfEmployer = cpfOw.employerContribution + cpfAw.employerContribution;
  }

  const netPay = roundCurrency(
    ordinaryWage +
      inputs.bonus +
      inputs.reimbursement -
      cpfEmployee -
      inputs.midMonthPayment -
      inputs.salaryAdvanceDeduction -
      inputs.unpaidLeave -
      inputs.deductions
  );

  return {
    basicSalary: inputs.basicSalary,
    transportAllowance: inputs.transportAllowance,
    allowances: inputs.allowances,
    overtimeAmount: inputs.overtimeAmount,
    bonus: inputs.bonus,
    reimbursement: inputs.reimbursement,
    midMonthPayment: inputs.midMonthPayment,
    salaryAdvanceDeduction: inputs.salaryAdvanceDeduction,
    unpaidLeave: inputs.unpaidLeave,
    deductions: inputs.deductions,
    cpfEmployee,
    cpfEmployer,
    fwlAmount: inputs.skillLevel
      ? calculateFwl(inputs.residencyStatus, inputs.skillLevel, rates.fwlRates)
      : 0,
    sdlAmount: calculateSdl(ordinaryWage + inputs.bonus, rates.sdlConfig),
    netPay,
  };
}
