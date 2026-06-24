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
