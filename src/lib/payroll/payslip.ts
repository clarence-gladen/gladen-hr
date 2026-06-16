import type { ResidencyStatus, SkillLevel } from "@/lib/types/database";
import {
  calculateAge,
  calculateCpf,
  type CpfRate,
  type FwlRate,
  type SdlConfig,
} from "./statutory";

export interface PayslipInputs {
  basicSalary: number;
  transportAllowance: number;
  allowances: number; // "Other Allowance"
  overtimeAmount: number;
  midMonthPayment: number;
  salaryAdvanceDeduction: number; // "Salary Loan"
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
  midMonthPayment: number;
  salaryAdvanceDeduction: number;
  deductions: number;
  cpfEmployee: number;
  cpfEmployer: number;
  fwlAmount: number;
  sdlAmount: number; // kept for DB column compatibility, always 0
  netPay: number;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Computes a full payslip breakdown for one employee.
 *
 * CPF applies to citizens/PRs only (on ordinary wage).
 * FWL applies to Work Permit / S Pass holders (employer cost only).
 * SDL is an employer cost and is NOT calculated or deducted from employee pay.
 * Net pay = earnings - CPF(employee) - mid-month payment - salary loan - other deductions.
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
    const cpf = calculateCpf(ordinaryWage, age, rates.cpfRates);
    cpfEmployee = cpf.employeeContribution;
    cpfEmployer = cpf.employerContribution;
  }

  const fwlAmount = 0; // employer cost only, not included in payroll calculation

  const netPay = roundCurrency(
    ordinaryWage -
      cpfEmployee -
      inputs.midMonthPayment -
      inputs.salaryAdvanceDeduction -
      inputs.deductions
  );

  return {
    basicSalary: inputs.basicSalary,
    transportAllowance: inputs.transportAllowance,
    allowances: inputs.allowances,
    overtimeAmount: inputs.overtimeAmount,
    midMonthPayment: inputs.midMonthPayment,
    salaryAdvanceDeduction: inputs.salaryAdvanceDeduction,
    deductions: inputs.deductions,
    cpfEmployee,
    cpfEmployer,
    fwlAmount,
    sdlAmount: 0,
    netPay,
  };
}
