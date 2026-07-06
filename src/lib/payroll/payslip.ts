import type { ResidencyStatus, SkillLevel } from "@/lib/types/database";
import {
  calculateAge,
  calculateCpf,
  calculateCpfOnAw,
  calculateFwl,
  calculateSdl,
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
    const age = calculateAge(inputs.dateOfBirth, payDate);
    const cpfOw = calculateCpf(ordinaryWage, age, rates.cpfRates);
    const cpfAw = calculateCpfOnAw(inputs.bonus, age, rates.cpfRates);
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
