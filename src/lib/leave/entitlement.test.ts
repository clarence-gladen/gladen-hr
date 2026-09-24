import { describe, it, expect } from "vitest";
import {
  annualEntitlementForCharge,
  getAvailableAnnualLeave,
  getAnnualLeaveForYear,
  getEmploymentYearNumber,
  FIRST_YEAR_ANNUAL_LEAVE,
} from "./entitlement";

/**
 * Regression cover for the 2026-09-24 bug: the manager "Record leave for employee"
 * form silently recorded annual leave that was over a first-year employee's accrued
 * entitlement, because it compared usage against the FULL first-year entitlement (7)
 * instead of what had actually accrued by the leave date.
 *
 * Real case: VICKNESWARI MANICKAM, started 2026-02-09, 2 days booked 2-3 Oct 2026.
 * She had 5 days already used; by 2 Oct she had accrued only 4.
 */
describe("annual leave accrual in year 1", () => {
  const empStart = "2026-02-09";

  it("accrues nothing during the 3-month probation", () => {
    expect(getAvailableAnnualLeave(empStart, "2026-03-01")).toBe(0);
    expect(getAvailableAnnualLeave(empStart, "2026-05-08")).toBe(0);
  });

  it("accrues floor(monthNumber / 12 x 7) from month 4", () => {
    // 2 Oct 2026: 7 full months completed since 9 Feb, so month 8 of employment.
    expect(getAvailableAnnualLeave(empStart, "2026-10-02")).toBe(4);
    expect(Math.floor((8 / 12) * FIRST_YEAR_ANNUAL_LEAVE)).toBe(4);
  });

  it("reaches the full 7 days by the end of year 1", () => {
    expect(getAvailableAnnualLeave(empStart, "2027-02-08")).toBe(7);
  });

  it("is the accrual, NOT the full year entitlement — the bug", () => {
    // The old manager-side check used this value and so never fired.
    expect(getAnnualLeaveForYear(1)).toBe(7);
    // The correct basis on 2 Oct is 4, which 7 days of usage clearly exceeds.
    expect(getAvailableAnnualLeave(empStart, "2026-10-02")).toBe(4);
  });
});

describe("annualEntitlementForCharge", () => {
  const empStart = "2026-02-09";

  it("uses the accrual when charging year 1 from inside year 1", () => {
    const naturalYear = getEmploymentYearNumber(empStart, "2026-10-02");
    expect(naturalYear).toBe(1);
    expect(annualEntitlementForCharge(empStart, 1, naturalYear, "2026-10-02")).toBe(4);
  });

  it("would have flagged the Vickneswari booking as over entitlement", () => {
    const naturalYear = getEmploymentYearNumber(empStart, "2026-10-02");
    const entitlement = annualEntitlementForCharge(empStart, 1, naturalYear, "2026-10-02");
    const alreadyUsed = 5; // 9 Jun (1) + 22-24 Jun (3) + 27 Jun (1)
    const requested = 2; // 2-3 Oct
    const available = Math.max(0, entitlement - alreadyUsed);
    expect(available).toBe(0);
    expect(requested > available).toBe(true);
  });

  it("gives the full first-year entitlement when year 1 is charged from a later year", () => {
    // Leave falls in year 2 but is charged back to year 1, which is complete by then.
    const naturalYear = getEmploymentYearNumber(empStart, "2027-03-01");
    expect(naturalYear).toBe(2);
    expect(annualEntitlementForCharge(empStart, 1, naturalYear, "2027-03-01")).toBe(7);
  });

  it("uses the full entitlement for year 2 and beyond", () => {
    expect(annualEntitlementForCharge(empStart, 2, 2, "2027-03-01")).toBe(8);
    expect(annualEntitlementForCharge(empStart, 3, 3, "2028-03-01")).toBe(9);
  });

  it("caps at 14 days for long-service employees", () => {
    expect(annualEntitlementForCharge(empStart, 12, 12, "2037-03-01")).toBe(14);
  });
});
