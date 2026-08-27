import { describe, it, expect } from "vitest";
import { shiftMonth, anniversaryMonths, hasAnniversaryIn, yearsCompletingIn } from "./anniversaries";
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
