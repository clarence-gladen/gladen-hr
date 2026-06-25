export function countWorkingDays(
  start: string,
  end: string,
  workDays: 5 | 6 = 5,
  restDay: 0 | 6 = 0,
  publicHolidays: Set<string> = new Set()
): number {
  const cur = new Date(start);
  const endDate = new Date(end);
  if (endDate < cur) return 0;
  let count = 0;
  while (cur <= endDate) {
    const day = cur.getDay();
    const dateStr = cur.toISOString().slice(0, 10);
    const isWorkingDay =
      workDays === 5 ? day !== 0 && day !== 6 : day !== restDay;
    if (isWorkingDay && !publicHolidays.has(dateStr)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export function countCalendarDays(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  if (e < s) return 0;
  return Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1;
}
