import type { ResidencyStatus, SkillLevel } from "@/lib/types/database";
import {
  calculateAge,
  calculateCpf,
  calculateFwl,
  calculateSdl,
  type CpfRate,
  type FwlRate,
  type SdlConfig,
} from "./statutory";

export interface PayslipInputs {
  basicSalary: number;
  overtimeAmount: number;
  allowances: number;
  reimbursements: number;
  deductions: number;
  salaryAdvanceDeduction: number;
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
  overtimeAmount: number;
  allowances: number;
  reimbursements: number;
  deductions: number;
  salaryAdvanceDeduction: number;
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
 * Computes a full payslip breakdown for one employee for one payroll run.
 *
 * - CPF applies only to citizens/PRs, on basic + OT + allowances (Ordinary Wage).
 * - FWL applies only to work permit / S Pass holders, as a flat monthly levy
 *   (an employer cost; it does not reduce the employee's net pay).
 * - SDL applies to every employee's wage and is also an employer-only cost.
 * - Net pay = wage + reimbursements - deductions - salary advance repayment
 *   - employee's own CPF contribution.
 */
export function calculatePayslip(
  inputs: PayslipInputs,
  rates: PayslipRateTables,
  payDate: string = new Date().toISOString().slice(0, 10)
): PayslipResult {
  const wage = inputs.basicSalary + inputs.overtimeAmount + inputs.allowances;
  const isCpfEligible =
    inputs.residencyStatus === "citizen" || inputs.residencyStatus === "pr";

  let cpfEmployee = 0;
  let cpfEmployer = 0;
  if (isCpfEligible) {
    const age = calculateAge(inputs.dateOfBirth, payDate);
    const cpf = calculateCpf(wage, age, rates.cpfRates);
    cpfEmployee = cpf.employeeContribution;
    cpfEmployer = cpf.employerContribution;
  }

  const fwlAmount = isCpfEligible
    ? 0
    : calculateFwl(
        inputs.residencyStatus,
        inputs.skillLevel ?? "basic_skilled",
        rates.fwlRates
      );

  const sdlAmount = calculateSdl(wage, rates.sdlConfig);

  const netPay = roundCurrency(
    wage +
      inputs.reimbursements -
      inputs.deductions -
      inputs.salaryAdvanceDeduction -
      cpfEmployee
  );

  return {
    basicSalary: inputs.basicSalary,
    overtimeAmount: inputs.overtimeAmount,
    allowances: inputs.allowances,
    reimbursements: inputs.reimbursements,
    deductions: inputs.deductions,
    salaryAdvanceDeduction: inputs.salaryAdvanceDeduction,
    cpfEmployee,
    cpfEmployer,
    fwlAmount,
    sdlAmount,
    netPay,
  };
}
