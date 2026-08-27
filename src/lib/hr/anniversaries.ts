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
 * The two months an anniversary list covers, given a Singapore business date
 * ("YYYY-MM-DD"): this month first, then last month.
 */
export function anniversaryMonths(todayStr: string): [AnniversaryMonth, AnniversaryMonth] {
  const year = Number(todayStr.slice(0, 4));
  const month = Number(todayStr.slice(5, 7));
  const previous = shiftMonth(year, month, -1);
  return [toMonth(year, month), toMonth(previous.year, previous.month)];
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
