import { describe, it, expect } from "vitest";
import { parseAmount } from "./amount";

describe("parseAmount", () => {
  it("reads plain numbers", () => {
    expect(parseAmount("1200")).toBe(1200);
    expect(parseAmount("85.50")).toBe(85.5);
    expect(parseAmount("0")).toBe(0);
  });

  it("accepts thousands separators and a dollar prefix", () => {
    expect(parseAmount("1,200")).toBe(1200);
    expect(parseAmount("1,200.50")).toBe(1200.5);
    expect(parseAmount("S$ 1,200")).toBe(1200);
    expect(parseAmount("$80")).toBe(80);
    expect(parseAmount(" 300 ")).toBe(300);
  });

  it("treats a blank or missing field as 0", () => {
    expect(parseAmount("")).toBe(0);
    expect(parseAmount("   ")).toBe(0);
    expect(parseAmount(null)).toBe(0);
  });

  it("rejects text that is not an amount instead of saving 0", () => {
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("12a")).toBeNull();
    expect(parseAmount("1.2.3")).toBeNull();
    expect(parseAmount("1200-")).toBeNull();
  });
});
