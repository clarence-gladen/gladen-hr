"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/lib/i18n/language-provider";
import type { LeaveType } from "@/lib/types/database";
import { fmtDate } from "@/lib/utils/date";

export interface LeaveCalendarEntry {
  id: string;
  full_name: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toDateString(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function LeaveCalendar({ entries }: { entries: LeaveCalendarEntry[] }) {
  const { t } = useLanguage();
  const today = new Date();
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = today.getFullYear();
  const month = today.getMonth() + monthOffset;
  const displayDate = new Date(year, month, 1);
  const displayYear = displayDate.getFullYear();
  const displayMonth = displayDate.getMonth();

  const leaveTypeLabel: Record<LeaveType, string> = {
    annual: t("leave.annual"),
    sick: t("leave.sick"),
    hospitalization: t("leave.hospitalization"),
    no_pay: t("leave.noPay"),
    off_day: t("leave.offDay"),
  };

  function entriesOnDate(dateStr: string): LeaveCalendarEntry[] {
    return entries.filter((e) => e.start_date <= dateStr && e.end_date >= dateStr);
  }

  const monthLabel = displayDate.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const cells = useMemo(() => {
    const firstDay = new Date(displayYear, displayMonth, 1).getDay();
    const total = daysInMonth(displayYear, displayMonth);
    const result: { date: string; day: number; count: number }[] = [];

    for (let i = 0; i < firstDay; i++) {
      result.push({ date: "", day: 0, count: 0 });
    }
    for (let day = 1; day <= total; day++) {
      const date = toDateString(displayYear, displayMonth, day);
      result.push({ date, day, count: entriesOnDate(date).length });
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayYear, displayMonth, entries]);

  const monthStart = toDateString(displayYear, displayMonth, 1);
  const monthEnd = toDateString(displayYear, displayMonth, daysInMonth(displayYear, displayMonth));
  const monthEntries = entries
    .filter((e) => e.start_date <= monthEnd && e.end_date >= monthStart)
    .sort((a, b) => a.start_date.localeCompare(b.start_date));

  const selectedEntries = selectedDate ? entriesOnDate(selectedDate) : [];

  const weekdayLabels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(undefined, { weekday: "short" });
    return Array.from({ length: 7 }, (_, i) => formatter.format(new Date(2024, 0, 7 + i)));
  }, []);

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex overflow-hidden rounded-lg border border-black/10 text-xs font-medium">
          <button
            type="button"
            onClick={() => setView("calendar")}
            className={`px-3 py-1.5 ${view === "calendar" ? "bg-brand text-white" : "text-foreground/60"}`}
          >
            {t("leave.calendarView")}
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            className={`px-3 py-1.5 ${view === "list" ? "bg-brand text-white" : "text-foreground/60"}`}
          >
            {t("leave.listView")}
          </button>
        </div>
        {view === "calendar" && (
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <button
              type="button"
              onClick={() => {
                setMonthOffset((m) => m - 1);
                setSelectedDate(null);
              }}
              className="px-1 text-foreground/50"
              aria-label="Previous month"
            >
              ‹
            </button>
            <span>{monthLabel}</span>
            <button
              type="button"
              onClick={() => {
                setMonthOffset((m) => m + 1);
                setSelectedDate(null);
              }}
              className="px-1 text-foreground/50"
              aria-label="Next month"
            >
              ›
            </button>
          </div>
        )}
      </div>

      {view === "calendar" ? (
        <>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-foreground/40">
            {weekdayLabels.map((label) => (
              <div key={label} className="py-1">
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, i) => {
              if (!cell.date) return <div key={`empty-${i}`} />;
              const isToday = cell.date === toDateString(today.getFullYear(), today.getMonth(), today.getDate());
              const isSelected = cell.date === selectedDate;
              return (
                <button
                  key={cell.date}
                  type="button"
                  onClick={() => setSelectedDate(cell.date === selectedDate ? null : cell.date)}
                  className={`relative aspect-square rounded-lg text-sm ${
                    isSelected
                      ? "bg-brand text-white"
                      : isToday
                        ? "bg-brand/10 text-brand"
                        : "text-foreground hover:bg-black/5"
                  }`}
                >
                  {cell.day}
                  {cell.count > 0 && (
                    <span
                      className={`absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold ${
                        isSelected ? "bg-white text-brand" : "bg-brand text-white"
                      }`}
                    >
                      {cell.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-3 border-t border-black/5 pt-3">
            {selectedDate ? (
              selectedEntries.length === 0 ? (
                <p className="text-sm text-foreground/60">{t("leave.noOneOnLeave")}</p>
              ) : (
                <ul className="space-y-1">
                  {selectedEntries.map((entry) => (
                    <li key={entry.id} className="flex justify-between text-sm">
                      <span className="text-foreground">{entry.full_name}</span>
                      <span className="text-foreground/60">{leaveTypeLabel[entry.leave_type]}</span>
                    </li>
                  ))}
                </ul>
              )
            ) : (
              <p className="text-sm text-foreground/60">{t("leave.selectADay")}</p>
            )}
          </div>
        </>
      ) : (
        <ul className="space-y-2">
          {monthEntries.length === 0 ? (
            <p className="text-sm text-foreground/60">{t("leave.noOneOnLeave")}</p>
          ) : (
            monthEntries.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between rounded-lg bg-black/5 px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-foreground">{entry.full_name}</p>
                  <p className="text-foreground/60">{leaveTypeLabel[entry.leave_type]}</p>
                </div>
                <span className="text-foreground/60">
                  {fmtDate(entry.start_date)} – {fmtDate(entry.end_date)}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
