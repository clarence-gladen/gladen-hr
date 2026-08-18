import { describe, it, expect } from "vitest";
import { todaySG, todaySGPlusDays } from "./date";

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
