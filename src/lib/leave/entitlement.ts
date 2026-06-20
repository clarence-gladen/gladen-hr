// Employment-anniversary leave entitlement for Gladen Maintenance Services.
//
// Leave year runs from employment start date to the day before the next anniversary.
// Year 1 annual leave accrues monthly (floor(monthNumber / 12 × 7)); months 1–3 are
// probation with 0 leave. Year 2+ annual leave is granted in full on the anniversary.
// Sick (14 days) and hospitalisation (60 days) are granted in full from month 4 onward
// and reset on each employment anniversary.

export const PROBATION_MONTHS = 3;
export const FIRST_YEAR_ANNUAL_LEAVE = 7;
export const MAX_ANNUAL_LEAVE = 14;
export const SICK_LEAVE_PER_YEAR = 14;
export const HOSPITALIZATION_PER_YEAR = 60;

function parseLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Full calendar months completed between startDate and referenceDate.
 * E.g. Jun 1 → Sep 1 = 3; Jun 1 → Sep 15 = 3; Jun 15 → Sep 14 = 2.
 */
function monthsCompleted(startDateStr: string, refDateStr: string): number {
  const s = parseLocal(startDateStr);
  const r = parseLocal(refDateStr);
  let months = (r.getFullYear() - s.getFullYear()) * 12 + (r.getMonth() - s.getMonth());
  if (r.getDate() < s.getDate()) months -= 1;
  return Math.max(0, months);
}

/** Which employment year the referenceDate falls in (1-indexed). */
export function getEmploymentYearNumber(startDateStr: string, refDateStr: string): number {
  return Math.floor(monthsCompleted(startDateStr, refDateStr) / 12) + 1;
}

/** Start and end dates of the Nth employment year (yearNum is 1-indexed). */
export function getEmploymentYearBounds(
  startDateStr: string,
  yearNum: number
): { yearStart: string; yearEnd: string } {
  const s = parseLocal(startDateStr);
  const ys = new Date(s.getFullYear() + yearNum - 1, s.getMonth(), s.getDate());
  const ye = new Date(s.getFullYear() + yearNum, s.getMonth(), s.getDate());
  ye.setDate(ye.getDate() - 1);
  return { yearStart: toStr(ys), yearEnd: toStr(ye) };
}

/** Full annual leave entitlement for year N: 7, 8, …, capped at 14. */
export function getAnnualLeaveForYear(yearNum: number): number {
  return Math.min(MAX_ANNUAL_LEAVE, FIRST_YEAR_ANNUAL_LEAVE - 1 + yearNum);
}

/**
 * Annual leave available to the employee as of referenceDate.
 * Year 1: accrues per month (0 during months 1–3 probation).
 * Year 2+: full entitlement from the anniversary date.
 */
export function getAvailableAnnualLeave(startDateStr: string, refDateStr: string): number {
  const empYear = getEmploymentYearNumber(startDateStr, refDateStr);

  if (empYear === 1) {
    const completed = monthsCompleted(startDateStr, refDateStr);
    const monthNumber = completed + 1; // 1-indexed month of employment
    if (monthNumber < 4) return 0; // probation
    return Math.floor((monthNumber / 12) * FIRST_YEAR_ANNUAL_LEAVE);
  }

  return getAnnualLeaveForYear(empYear);
}

/** True if the employee is still within their 3-month probation period. */
export function isOnProbation(startDateStr: string, refDateStr: string): boolean {
  return monthsCompleted(startDateStr, refDateStr) < PROBATION_MONTHS;
}

/** Date on which probation ends (employmentStartDate + 3 months). */
export function getConfirmationDate(startDateStr: string): Date {
  const s = parseLocal(startDateStr);
  return new Date(s.getFullYear(), s.getMonth() + PROBATION_MONTHS, s.getDate());
}

/**
 * Sick leave available as of referenceDate: 14 if confirmed, 0 during probation.
 * Resets to 14 on each employment anniversary.
 */
export function getAvailableSickLeave(startDateStr: string, refDateStr: string): number {
  return isOnProbation(startDateStr, refDateStr) ? 0 : SICK_LEAVE_PER_YEAR;
}

/**
 * Hospitalisation leave available as of referenceDate: 60 if confirmed, 0 during probation.
 * Resets to 60 on each employment anniversary.
 */
export function getAvailableHospitalizationLeave(startDateStr: string, refDateStr: string): number {
  return isOnProbation(startDateStr, refDateStr) ? 0 : HOSPITALIZATION_PER_YEAR;
}
