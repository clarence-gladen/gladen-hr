/**
 * Employment anniversaries.
 *
 * The business needs two months at once, for two different jobs:
 *   · LAST month, because the anniversary bonus and unused-leave payout are
 *     credited in the payroll run made in the following month (July's
 *     anniversaries are settled when July payroll is run on 5 August).
 *   · THIS month, so a manager can answer "is it my anniversary?" at any point
 *     during the month.
 *
 * Both the dashboard count and /manager/anniversaries use these helpers so the
 * number on the tile can never disagree with the list behind it.
 */

export interface AnniversaryMonth {
  year: number;
  /** 1-12. */
  month: number;
  /** Zero-padded "MM", for comparing against a YYYY-MM-DD string. */
  mm: string;
}

/** Calendar month `delta` months from the given one. Handles the year rollover. */
export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

function toMonth(year: number, month: number): AnniversaryMonth {
  return { year, month, mm: String(month).padStart(2, "0") };
}

/**
 * The two months an anniversary list covers for a given calendar month: that
 * month first, then the one before it.
 *
 * Payroll uses this against the RUN month rather than today: the September run
 * is made on 4 October and has to settle both September's and August's
 * anniversaries, so keying it off "now" would silently drop August.
 */
export function anniversaryMonthsFor(
  year: number,
  month: number
): [AnniversaryMonth, AnniversaryMonth] {
  const previous = shiftMonth(year, month, -1);
  return [toMonth(year, month), toMonth(previous.year, previous.month)];
}

/**
 * The two months an anniversary list covers, given a Singapore business date
 * ("YYYY-MM-DD"): this month first, then last month.
 */
export function anniversaryMonths(todayStr: string): [AnniversaryMonth, AnniversaryMonth] {
  return anniversaryMonthsFor(Number(todayStr.slice(0, 4)), Number(todayStr.slice(5, 7)));
}

/**
 * Whether an employment start date falls on an anniversary in `target`.
 * A start year equal to the target year is the employee's joining month, which
 * is not an anniversary.
 */
export function hasAnniversaryIn(
  startDate: string | null | undefined,
  target: AnniversaryMonth
): boolean {
  if (!startDate) return false;
  return startDate.slice(5, 7) === target.mm && Number(startDate.slice(0, 4)) < target.year;
}

/** How many years of service the anniversary in `target` completes. */
export function yearsCompletingIn(startDate: string, target: AnniversaryMonth): number {
  return target.year - Number(startDate.slice(0, 4));
}


/* ------------------------------------------------------------------------- *
 * Enrichment
 *
 * The anniversaries screen and the payroll prep report both need the same
 * per-employee figures. Keeping the calculation here means the bonus a manager
 * reads off the screen and the one printed in the prep spreadsheet cannot
 * disagree.
 * ------------------------------------------------------------------------- */

/** The employee fields the enrichment needs. */
export interface AnniversaryEmployee {
  id: string;
  full_name: string;
  designation?: string | null;
  employment_start_date: string | null;
  base_salary?: number | null;
}

/** An approved leave row, narrowed to what the unused-leave sum needs. */
export interface AnniversaryLeaveRow {
  employee_id: string;
  leave_type: string;
  days: number;
  start_date: string;
}

export interface EnrichedAnniversary {
  id: string;
  full_name: string;
  designation: string | null;
  yearsCompleting: number;
  anniversaryDate: string;
  baseSalary: number;
  alEntitlement: number;
  alUsed: number;
  alUnused: number;
  sickUsed: number;
  yearStart: string;
  yearEnd: string;
}

/** Employees whose employment start date falls on an anniversary in `target`. */
export function employeesWithAnniversaryIn<T extends { employment_start_date: string | null }>(
  employees: readonly T[],
  target: AnniversaryMonth
): T[] {
  return employees.filter((emp) => hasAnniversaryIn(emp.employment_start_date, target));
}

/**
 * Fills in years of service, the employment year that just ended, and the
 * annual leave left unused within it — the figures the anniversary bonus and
 * leave payout are calculated from. Sorted by anniversary date.
 */
export function enrichAnniversaries(
  employees: readonly AnniversaryEmployee[],
  leaveRows: readonly AnniversaryLeaveRow[],
  target: AnniversaryMonth,
  bounds: (startDate: string, years: number) => { yearStart: string; yearEnd: string },
  entitlement: (years: number) => number
): EnrichedAnniversary[] {
  return employees
    .map((emp) => {
      const startDate = emp.employment_start_date!;
      // Counted against the anniversary's own year, not today's — a December
      // anniversary viewed in January is still that December's milestone.
      const yearsCompleting = yearsCompletingIn(startDate, target);
      const { yearStart, yearEnd } = bounds(startDate, yearsCompleting);
      const alEntitlement = entitlement(yearsCompleting);

      let alUsed = 0;
      let sickUsed = 0;
      for (const row of leaveRows) {
        if (row.employee_id !== emp.id) continue;
        if (row.start_date < yearStart || row.start_date > yearEnd) continue;
        if (row.leave_type === "annual") alUsed += row.days;
        if (row.leave_type === "sick") sickUsed += row.days;
      }

      return {
        id: emp.id,
        full_name: emp.full_name,
        designation: (emp.designation ?? null) as string | null,
        yearsCompleting,
        anniversaryDate: `${target.year}-${target.mm}-${startDate.slice(8, 10)}`,
        baseSalary: Number(emp.base_salary ?? 0),
        alEntitlement,
        alUsed,
        alUnused: Math.max(0, alEntitlement - alUsed),
        sickUsed,
        yearStart,
        yearEnd,
      };
    })
    .sort((a, b) => a.anniversaryDate.localeCompare(b.anniversaryDate));
}
