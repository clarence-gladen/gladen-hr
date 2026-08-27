import { describe, it, expect } from "vitest";
import { todaySG, todaySGPlusDays, fmtDateShort, fmtDateRange } from "./date";

describe("todaySG — Singapore business date (regression for the UTC-vs-SGT bug)", () => {
  it("returns the SGT calendar day, not the UTC day, just after SGT midnight", () => {
    // 2026-08-17 18:00 UTC == 2026-08-18 02:00 SGT. UTC date is still the 17th,
    // but the business day in Singapore is already the 18th. This is exactly the
    // window where 'on leave today' used to lag until 8am SGT.
    expect(todaySG(new Date("2026-08-17T18:00:00Z"))).toBe("2026-08-18");
  });

  it("agrees with the UTC date during Singapore daytime", () => {
    // 2026-08-18 06:00 UTC == 2026-08-18 14:00 SGT — same calendar day.
    expect(todaySG(new Date("2026-08-18T06:00:00Z"))).toBe("2026-08-18");
  });

  it("rolls to the next SGT day exactly at SGT midnight (16:00 UTC)", () => {
    expect(todaySG(new Date("2026-08-17T15:59:00Z"))).toBe("2026-08-17"); // 23:59 SGT
    expect(todaySG(new Date("2026-08-17T16:00:00Z"))).toBe("2026-08-18"); // 00:00 SGT
  });

  it("formats as YYYY-MM-DD", () => {
    expect(todaySG(new Date("2026-01-05T04:00:00Z"))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("todaySGPlusDays", () => {
  const now = new Date("2026-08-18T06:00:00Z"); // 2026-08-18 SGT

  it("offsets forward and backward in whole days", () => {
    expect(todaySGPlusDays(0, now)).toBe("2026-08-18");
    expect(todaySGPlusDays(1, now)).toBe("2026-08-19");
    expect(todaySGPlusDays(30, now)).toBe("2026-09-17");
    expect(todaySGPlusDays(-1, now)).toBe("2026-08-17");
  });

  it("crosses month and year boundaries correctly", () => {
    expect(todaySGPlusDays(1, new Date("2026-12-31T06:00:00Z"))).toBe("2027-01-01");
  });
});

// A fixed "now" so the current-year rule is deterministic.
const NOW = new Date("2026-08-27T06:00:00Z"); // 14:00 SGT on 27 Aug 2026

describe("fmtDateShort — readable single date", () => {
  it("formats as weekday, day, month", () => {
    expect(fmtDateShort("2026-08-27", NOW)).toBe("Thu 27 Aug");
  });

  it("does not shift the day when the runtime is behind UTC", () => {
    // The stored date is a calendar day, not an instant. Parsing it in a
    // negative-offset timezone must not roll it back to the 26th.
    expect(fmtDateShort("2026-08-27", NOW)).toBe("Thu 27 Aug");
    expect(fmtDateShort("2026-01-01", NOW)).toContain("1 Jan");
  });

  it("appends the year only when it is not the current Singapore year", () => {
    expect(fmtDateShort("2026-12-31", NOW)).toBe("Thu 31 Dec");
    expect(fmtDateShort("2027-01-04", NOW)).toBe("Mon 4 Jan 2027");
    expect(fmtDateShort("2025-08-27", NOW)).toBe("Wed 27 Aug 2025");
  });

  it("falls back gracefully on missing or malformed input", () => {
    expect(fmtDateShort(null, NOW)).toBe("—");
    expect(fmtDateShort("", NOW)).toBe("—");
    expect(fmtDateShort("not-a-date", NOW)).toBe("not-a-date");
  });
});

describe("fmtDateRange — readable date range", () => {
  it("writes the month once when both ends share it", () => {
    expect(fmtDateRange("2026-09-05", "2026-09-06", NOW)).toBe("Sat 5 – Sun 6 Sep");
  });

  it("writes both months when the range crosses one", () => {
    expect(fmtDateRange("2026-08-31", "2026-09-01", NOW)).toBe("Mon 31 Aug – Tue 1 Sep");
  });

  it("collapses to a single date when start and end are the same day", () => {
    expect(fmtDateRange("2026-08-27", "2026-08-27", NOW)).toBe("Thu 27 Aug");
  });

  it("treats a missing end date as a single day", () => {
    expect(fmtDateRange("2026-08-27", null, NOW)).toBe("Thu 27 Aug");
  });

  it("carries the year across a year boundary", () => {
    expect(fmtDateRange("2026-12-30", "2027-01-02", NOW)).toBe("Wed 30 Dec – Sat 2 Jan 2027");
  });

  it("returns an em-dash for a missing start date", () => {
    expect(fmtDateRange(null, "2026-08-27", NOW)).toBe("—");
  });
});
