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

/**
 * Parses "YYYY-MM-DD" as a UTC instant so that formatting it with
 * `timeZone: "UTC"` always returns the same calendar day that was stored,
 * regardless of where the code runs.
 */
function parseDateOnly(dateStr: string): Date | null {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * Weekday / day / month parts for a date-only value.
 * The month is clipped to three letters because en-GB renders September as
 * "Sept", which reads inconsistently next to Aug, Dec and Jan in a list.
 */
function shortParts(date: Date): { weekday: string; day: string; month: string } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  return { weekday: get("weekday"), day: get("day"), month: get("month").slice(0, 3) };
}

/**
 * "Thu 27 Aug" — the readable form used wherever a date is being scanned
 * rather than filled into a field. `fmtDate` (DD/MM/YYYY) remains the right
 * choice for form values and anywhere the exact numeric date matters.
 * The year is appended only when it is not the current Singapore year.
 */
export function fmtDateShort(dateStr: string | null | undefined, now: Date = new Date()): string {
  if (!dateStr) return "—";
  const date = parseDateOnly(dateStr);
  if (!date) return dateStr;
  const { weekday, day, month } = shortParts(date);
  const label = `${weekday} ${day} ${month}`;
  return dateStr.slice(0, 4) === todaySG(now).slice(0, 4) ? label : `${label} ${dateStr.slice(0, 4)}`;
}

/**
 * "Fri 5 – Sat 6 Sep" for a range, "Thu 27 Aug" for a single day.
 * The month is written once when both ends share it.
 */
export function fmtDateRange(
  startStr: string | null | undefined,
  endStr: string | null | undefined,
  now: Date = new Date()
): string {
  if (!startStr) return "—";
  if (!endStr || startStr === endStr) return fmtDateShort(startStr, now);

  const start = parseDateOnly(startStr);
  const end = parseDateOnly(endStr);
  if (!start || !end) return `${fmtDate(startStr)} – ${fmtDate(endStr)}`;

  const sameMonth = startStr.slice(0, 7) === endStr.slice(0, 7);
  if (!sameMonth) return `${fmtDateShort(startStr, now)} – ${fmtDateShort(endStr, now)}`;

  // Same month: drop the month from the start so it reads "Fri 5 – Sat 6 Sep".
  const { weekday, day } = shortParts(start);
  return `${weekday} ${day} – ${fmtDateShort(endStr, now)}`;
}
