/**
 * Parse a dollar amount typed into a payslip field.
 *
 * Accepts the ways people actually type money — "1200", "1,200.50", "S$ 1,200",
 * "$80" — and treats a blank field as 0. Anything else is rejected rather than
 * silently becoming 0: `Number("1,200") || 0` used to save a 1,200 salary as 0.
 */
export function parseAmount(raw: FormDataEntryValue | null): number | null {
  if (raw === null) return 0;
  const cleaned = String(raw).trim().replace(/^S?\$/i, "").replace(/[,\s]/g, "");
  if (cleaned === "") return 0;
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  return Number(cleaned);
}
