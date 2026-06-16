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
  sdlAmount: number;
  netPay: number;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Computes a full payslip breakdown for one employee for one payroll run.
 *
 * Ordinary Wage (CPF basis) = basic + transport allowance + other allowance + overtime.
 * FWL and SDL are employer-only costs and do not reduce employee net pay.
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

  const fwlAmount = isCpfEligible
    ? 0
    : calculateFwl(
        inputs.residencyStatus,
        inputs.skillLevel ?? "basic_skilled",
        rates.fwlRates
      );

  const sdlAmount = calculateSdl(ordinaryWage, rates.sdlConfig);

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
    sdlAmount,
    netPay,
  };
}
