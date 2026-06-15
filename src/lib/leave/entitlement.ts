// Leave entitlement rules for Gladen Maintenance Services:
// - First 3 months of employment are probation: no annual/sick/hospitalization leave.
// - Annual leave follows the Employment Act tiered scale: 7 days in the first
//   eligible year, +1 day per additional year of service, capped at 14 days.
// - The first eligible year's 7-day entitlement is pro-rated by the number of
//   months remaining (inclusive of the confirmation month) until year end.
// - Sick (14 days) and hospitalization (60 days) leave are granted in full for
//   any year in which the employee is confirmed, with no pro-ration.

export const PROBATION_MONTHS = 3;
export const FIRST_YEAR_ANNUAL_LEAVE_DAYS = 7;
export const MAX_ANNUAL_LEAVE_DAYS = 14;
export const SICK_LEAVE_DAYS_PER_YEAR = 14;
export const HOSPITALIZATION_DAYS_PER_YEAR = 60;

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function roundToHalfDay(value: number): number {
  return Math.round(value * 2) / 2;
}

/** The date an employee is confirmed (probation ends). */
export function getConfirmationDate(employmentStartDate: string | Date): Date {
  return addMonths(toDate(employmentStartDate), PROBATION_MONTHS);
}

/**
 * Annual leave entitlement (in days) for the given calendar year.
 * Returns 0 if the employee is still on probation for the entire year.
 */
export function getAnnualLeaveEntitlement(
  employmentStartDate: string | Date,
  year: number
): number {
  const confirmationDate = getConfirmationDate(employmentStartDate);
  const confirmationYear = confirmationDate.getFullYear();

  if (year < confirmationYear) return 0;

  if (year === confirmationYear) {
    // Months remaining in the year, counting the confirmation month as a full month.
    const monthsRemaining = 12 - confirmationDate.getMonth();
    return roundToHalfDay(
      (FIRST_YEAR_ANNUAL_LEAVE_DAYS * monthsRemaining) / 12
    );
  }

  const yearsOfService = year - confirmationYear;
  return Math.min(
    MAX_ANNUAL_LEAVE_DAYS,
    FIRST_YEAR_ANNUAL_LEAVE_DAYS + yearsOfService
  );
}

/**
 * Sick (MC) leave entitlement (in days) for the given calendar year.
 * Full entitlement once confirmed; 0 while still on probation.
 */
export function getSickLeaveEntitlement(
  employmentStartDate: string | Date,
  year: number
): number {
  const confirmationYear = getConfirmationDate(employmentStartDate).getFullYear();
  return year >= confirmationYear ? SICK_LEAVE_DAYS_PER_YEAR : 0;
}

/**
 * Hospitalization leave entitlement (in days) for the given calendar year.
 * Full entitlement once confirmed; 0 while still on probation.
 */
export function getHospitalizationEntitlement(
  employmentStartDate: string | Date,
  year: number
): number {
  const confirmationYear = getConfirmationDate(employmentStartDate).getFullYear();
  return year >= confirmationYear ? HOSPITALIZATION_DAYS_PER_YEAR : 0;
}
