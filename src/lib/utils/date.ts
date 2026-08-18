/**
 * Today's calendar date in Singapore (UTC+8) as "YYYY-MM-DD".
 *
 * The whole business operates in Singapore, but servers (Vercel) run in UTC and
 * `new Date().toISOString()` yields the UTC date — which is still "yesterday"
 * between SGT midnight and 8am. Use this for every business "today" comparison
 * so date-only logic (e.g. who is on leave today) flips at SGT midnight, not 8am.
 */
export function todaySG(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD; timeZone pins it to Singapore's calendar day.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Singapore" }).format(now);
}

/** Singapore calendar date `days` from today (negative = past), as "YYYY-MM-DD". */
export function todaySGPlusDays(days: number, now: Date = new Date()): string {
  const base = new Date(`${todaySG(now)}T00:00:00+08:00`);
  base.setUTCDate(base.getUTCDate() + days);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Singapore" }).format(base);
}

/** Converts a YYYY-MM-DD string to DD/MM/YYYY for display. */
export function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/** Formats an ISO timestamp string (e.g. created_at) as DD/MM/YYYY. */
export function fmtTimestamp(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB");
}
