"use client";

import { fmtDate } from "@/lib/utils/date";

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

type AnniversaryEmployee = {
  id: string;
  full_name: string;
  designation: string | null;
  yearsCompleting: number;
  anniversaryDate: string;
  baseSalary: number;
  alEntitlement: number;
  alUsed: number;
  alUnused: number;
  sickUsed: number;
  yearStart: string;
  yearEnd: string;
};

export function AnniversariesClient({
  employees,
  monthLabel,
}: {
  employees: AnniversaryEmployee[];
  monthLabel: string;
}) {
  if (employees.length === 0) {
    return (
      <main className="flex-1 px-4 py-6">
        <p className="text-sm text-foreground/50">No employment anniversaries this month.</p>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 py-6 space-y-4">
      <p className="text-xs text-foreground/50">
        {employees.length} employee{employees.length !== 1 ? "s" : ""} with anniversaries in {monthLabel}.
        Bonus and unused leave to be processed by the 5th of next month.
      </p>

      {employees.map((emp) => (
        <div key={emp.id} className="rounded-xl bg-white p-4 shadow-sm space-y-3">
          {/* Name + year badge */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-foreground">{emp.full_name}</p>
              <p className="text-xs text-foreground/50">{emp.designation ?? "—"}</p>
            </div>
            <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
              {ordinal(emp.yearsCompleting)} year
            </span>
          </div>

          {/* Anniversary date */}
          <div className="flex items-center rounded-lg bg-amber-50 px-3 py-2">
            <span className="text-xs font-medium text-amber-700">Anniversary</span>
            <span className="ml-auto text-xs font-semibold text-amber-800">{fmtDate(emp.anniversaryDate)}</span>
          </div>

          {/* Employment year period */}
          <p className="text-[11px] text-center text-foreground/40">
            {fmtDate(emp.yearStart)} – {fmtDate(emp.yearEnd)}
          </p>

          {/* Salary + bonus */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-black/[0.03] px-3 py-2">
              <p className="text-[11px] text-foreground/50">Basic Salary</p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">
                S${" "}
                {emp.baseSalary.toLocaleString("en-SG", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            <div className="rounded-lg bg-amber-50 px-3 py-2">
              <p className="text-[11px] text-amber-600">Bonus</p>
              <p className="mt-0.5 text-sm font-semibold text-amber-700">2 weeks</p>
            </div>
          </div>

          {/* Leave summary */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-foreground/40">
              Leave This Year
            </p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-black/[0.03] px-2 py-2">
                <p className="text-base font-bold text-brand">{emp.alEntitlement}</p>
                <p className="text-[10px] text-foreground/50">AL entitlement</p>
              </div>
              <div className="rounded-lg bg-black/[0.03] px-2 py-2">
                <p className="text-base font-bold text-foreground">{emp.alUsed}</p>
                <p className="text-[10px] text-foreground/50">AL used</p>
              </div>
              <div
                className={`rounded-lg px-2 py-2 ${
                  emp.alUnused > 0 ? "bg-brand/10" : "bg-black/[0.03]"
                }`}
              >
                <p
                  className={`text-base font-bold ${
                    emp.alUnused > 0 ? "text-brand" : "text-foreground"
                  }`}
                >
                  {emp.alUnused}
                </p>
                <p className="text-[10px] text-foreground/50">AL unused</p>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-black/[0.03] px-3 py-2">
              <p className="text-xs text-foreground/60">Sick leave used</p>
              <p className="text-sm font-semibold text-foreground">{emp.sickUsed} days</p>
            </div>
          </div>
        </div>
      ))}
    </main>
  );
}
