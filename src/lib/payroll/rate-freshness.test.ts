import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

/**
 * STATUTORY RATE EXPIRY ALARM
 *
 * Singapore CPF / FWL / SDL rates change most Januaries. The failure mode this
 * guards against is silent and expensive: nobody updates the rate tables, the
 * app keeps calculating payroll confidently with last year's numbers, and the
 * error only surfaces when somebody happens to read a payslip. That is exactly
 * how the 2026 CPF age-bracket bug went undetected for months.
 *
 * These tests fail the build as soon as the newest seeded rate set is older
 * than the current year, so a stale rate table becomes a loud, dated failure
 * instead of a quiet wrong number.
 *
 * WHEN THIS FAILS: look up the current rates on the official source, add a new
 * migration seeding them with the new effective_date, apply it, and these pass
 * again. Do NOT edit the expected year here to make it green.
 *   CPF: cpf.gov.sg/employer  ·  FWL: mom.gov.sg  ·  SDL: skillsfuture.gov.sg
 */

const MIGRATIONS_DIR = "supabase/migrations";

/** Newest effective_date literal seeded for a table across all migrations. */
function newestEffectiveDate(table: string): string | null {
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql"));
  let newest: string | null = null;

  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    // Each INSERT ... INTO <table> ... ; block, then every date literal inside it.
    const inserts = sql.matchAll(new RegExp(`insert\\s+into\\s+${table}\\b[\\s\\S]*?;`, "gi"));
    for (const stmt of inserts) {
      for (const d of stmt[0].matchAll(/'(\d{4}-\d{2}-\d{2})'/g)) {
        if (!newest || d[1] > newest) newest = d[1];
      }
    }
  }
  return newest;
}

const RATE_TABLES = ["cpf_rates", "fwl_rates", "sdl_config"] as const;

describe("statutory rate freshness", () => {
  const currentYear = new Date().getFullYear();

  it.each(RATE_TABLES)(
    "%s has a rate set for the current year or later",
    (table) => {
      const newest = newestEffectiveDate(table);

      expect(
        newest,
        `No effective_date found for ${table} in ${MIGRATIONS_DIR}. ` +
          `Rates must be seeded via a migration so the repo stays the source of truth.`
      ).not.toBeNull();

      const newestYear = Number(newest!.slice(0, 4));

      expect(
        newestYear,
        `\n\n  STATUTORY RATES ARE STALE — payroll may be calculating with outdated figures.\n` +
          `  ${table}: newest seeded rates are effective ${newest} (${newestYear}), ` +
          `but it is now ${currentYear}.\n` +
          `  Fix: check the official ${table === "cpf_rates" ? "CPF Board" : table === "fwl_rates" ? "MOM" : "SkillsFuture"} ` +
          `figures for ${currentYear}, add a migration seeding them, and apply it.\n` +
          `  Do NOT weaken this test to make the build pass.\n`
      ).toBeGreaterThanOrEqual(currentYear);
    }
  );

  it("seeds rates through a migration rather than only in the live database", () => {
    // Guards against the schema-drift pattern that has bitten this project
    // before (columns added via the dashboard, absent from migrations).
    for (const table of RATE_TABLES) {
      expect(newestEffectiveDate(table), `${table} has no seeded rates in migrations`).toBeTruthy();
    }
  });
});
