import { describe, it, expect } from "vitest";
import { shiftMonth, anniversaryMonths, hasAnniversaryIn, yearsCompletingIn, anniversaryMonthsFor, enrichAnniversaries } from "./anniversaries";
import { getEmploymentYearBounds, getAnnualLeaveForYear } from "../leave/entitlement";

describe("shiftMonth", () => {
  it("steps back within the same year", () => {
    expect(shiftMonth(2026, 8, -1)).toEqual({ year: 2026, month: 7 });
  });

  it("rolls back across the year boundary", () => {
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });

  it("rolls forward across the year boundary", () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
  });
});

describe("anniversaryMonths", () => {
  it("returns this month then last month", () => {
    expect(anniversaryMonths("2026-08-27")).toEqual([
      { year: 2026, month: 8, mm: "08" },
      { year: 2026, month: 7, mm: "07" },
    ]);
  });

  it("reaches into the previous year in January", () => {
    // The 5 January payroll run settles December's anniversaries, so the
    // December entry must carry 2025, not 2026.
    expect(anniversaryMonths("2026-01-05")).toEqual([
      { year: 2026, month: 1, mm: "01" },
      { year: 2025, month: 12, mm: "12" },
    ]);
  });
});

describe("hasAnniversaryIn", () => {
  const [thisMonth, lastMonth] = anniversaryMonths("2026-08-27");

  it("matches an employee whose start month is this month", () => {
    expect(hasAnniversaryIn("2023-08-14", thisMonth)).toBe(true);
  });

  it("matches an employee whose start month is last month", () => {
    expect(hasAnniversaryIn("2024-07-01", lastMonth)).toBe(true);
  });

  it("excludes the joining month itself", () => {
    // Started this August — that is day one, not an anniversary.
    expect(hasAnniversaryIn("2026-08-01", thisMonth)).toBe(false);
    expect(hasAnniversaryIn("2026-07-15", lastMonth)).toBe(false);
  });

  it("excludes any other month", () => {
    expect(hasAnniversaryIn("2023-09-14", thisMonth)).toBe(false);
    expect(hasAnniversaryIn("2023-09-14", lastMonth)).toBe(false);
  });

  it("handles a missing start date", () => {
    expect(hasAnniversaryIn(null, thisMonth)).toBe(false);
    expect(hasAnniversaryIn(undefined, thisMonth)).toBe(false);
  });

  it("counts a December anniversary against the previous year in January", () => {
    const [, december] = anniversaryMonths("2026-01-05");
    expect(hasAnniversaryIn("2022-12-20", december)).toBe(true);
    // Joined December 2025 — one month of service, not an anniversary.
    expect(hasAnniversaryIn("2025-12-20", december)).toBe(false);
  });
});

describe("yearsCompletingIn", () => {
  it("counts against the anniversary's own year, not today's", () => {
    const [, december] = anniversaryMonths("2026-01-05");
    // Started Dec 2022, so December 2025 was the 3rd anniversary — even though
    // it is already 2026 when the manager looks at the list.
    expect(yearsCompletingIn("2022-12-20", december)).toBe(3);
  });

  it("counts this month's anniversaries normally", () => {
    const [thisMonth] = anniversaryMonths("2026-08-27");
    expect(yearsCompletingIn("2023-08-14", thisMonth)).toBe(3);
  });
});

describe("payout window", () => {
  // The reason last month is on this screen at all: the bonus and unused-leave
  // payout are settled against the employment year that just ENDED. If these
  // bounds ever slid forward to the year starting at the anniversary, every
  // payout would be computed from an empty year.
  it("is the employment year that just ended", () => {
    const [thisMonth] = anniversaryMonths("2026-08-27");
    const start = "2023-08-14";
    const years = yearsCompletingIn(start, thisMonth);

    expect(years).toBe(3);
    expect(getEmploymentYearBounds(start, years)).toEqual({
      yearStart: "2025-08-14",
      yearEnd: "2026-08-13",
    });
    expect(getAnnualLeaveForYear(years)).toBe(9);
  });

  it("still resolves the completed year for a December anniversary read in January", () => {
    const [, december] = anniversaryMonths("2026-01-05");
    const start = "2022-12-20";
    const years = yearsCompletingIn(start, december);

    expect(years).toBe(3);
    expect(getEmploymentYearBounds(start, years)).toEqual({
      yearStart: "2024-12-20",
      yearEnd: "2025-12-19",
    });
  });
});

describe("anniversaryMonthsFor — payroll run month", () => {
  it("covers the run month and the one before it", () => {
    // The September 2026 run is made on 4 October and settles both months.
    const [runMonth, prior] = anniversaryMonthsFor(2026, 9);
    expect(runMonth).toEqual({ year: 2026, month: 9, mm: "09" });
    expect(prior).toEqual({ year: 2026, month: 8, mm: "08" });
  });

  it("rolls back across the year boundary", () => {
    const [runMonth, prior] = anniversaryMonthsFor(2027, 1);
    expect(runMonth).toEqual({ year: 2027, month: 1, mm: "01" });
    expect(prior).toEqual({ year: 2026, month: 12, mm: "12" });
  });

  it("keys off the run month, not today — the whole point of the helper", () => {
    // Run September while the calendar says October: still Sept + Aug.
    const byRun = anniversaryMonthsFor(2026, 9);
    const byToday = anniversaryMonths("2026-10-04");
    expect(byRun[0].mm).toBe("09");
    expect(byToday[0].mm).toBe("10");
  });
});

describe("enrichAnniversaries", () => {
  const bounds = (start: string, years: number) => ({
    yearStart: `${Number(start.slice(0, 4)) + years - 1}${start.slice(4)}`,
    yearEnd: `${Number(start.slice(0, 4)) + years}${start.slice(4)}`,
  });
  const entitlement = (years: number) => (years <= 1 ? 7 : Math.min(14, 7 + years));

  const target = { year: 2026, month: 9, mm: "09" };
  const employees = [
    { id: "e1", full_name: "Bee", employment_start_date: "2020-09-15", base_salary: 2400 },
    { id: "e2", full_name: "Ang", employment_start_date: "2022-09-03", base_salary: 1900 },
  ];

  it("sorts by anniversary date, not by name", () => {
    const rows = enrichAnniversaries(employees, [], target, bounds, entitlement);
    expect(rows.map((r) => r.full_name)).toEqual(["Ang", "Bee"]);
  });

  it("counts unused annual leave within the employment year that just ended", () => {
    const rows = enrichAnniversaries(
      [employees[0]],
      [
        // inside the 2025-09-15 → 2026-09-15 year
        { employee_id: "e1", leave_type: "annual", days: 4, start_date: "2026-02-10" },
        // outside it — the year before
        { employee_id: "e1", leave_type: "annual", days: 3, start_date: "2025-01-10" },
        { employee_id: "e1", leave_type: "sick", days: 2, start_date: "2026-03-01" },
      ],
      target,
      bounds,
      entitlement
    );
    expect(rows[0].alUsed).toBe(4);
    expect(rows[0].sickUsed).toBe(2);
    expect(rows[0].alUnused).toBe(rows[0].alEntitlement - 4);
  });

  it("never reports negative unused leave when someone overdraws", () => {
    const rows = enrichAnniversaries(
      [employees[0]],
      [{ employee_id: "e1", leave_type: "annual", days: 99, start_date: "2026-02-10" }],
      target,
      bounds,
      entitlement
    );
    expect(rows[0].alUnused).toBe(0);
  });

  it("ignores leave belonging to another employee", () => {
    const rows = enrichAnniversaries(
      [employees[0]],
      [{ employee_id: "e2", leave_type: "annual", days: 5, start_date: "2026-02-10" }],
      target,
      bounds,
      entitlement
    );
    expect(rows[0].alUsed).toBe(0);
  });
});
