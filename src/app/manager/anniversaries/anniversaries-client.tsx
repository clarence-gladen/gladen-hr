"use client";

import { fmtDateShort, fmtDateRange } from "@/lib/utils/date";

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

export type AnniversaryEmployee = {
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

export type AnniversaryGroup = {
  key: string;
  heading: string;
  monthLabel: string;
  note: string;
  employees: AnniversaryEmployee[];
};

function Card({ emp }: { emp: AnniversaryEmployee }) {
  return (
    <div className="g-card space-y-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold">{emp.full_name}</p>
          <p className="text-[12.5px] text-muted">{emp.designation ?? "—"}</p>
        </div>
        <span className="g-pill g-pill-attention">{ordinal(emp.yearsCompleting)} year</span>
      </div>

      <div className="flex items-center rounded-lg border border-attention-line bg-attention-surface px-3 py-2">
        <span className="text-[12.5px] font-medium text-attention">Anniversary</span>
        <span className="g-num ml-auto text-[13px] font-semibold text-attention">
          {fmtDateShort(emp.anniversaryDate)}
        </span>
      </div>

      <p className="text-center text-[11.5px] text-muted">
        Year completed · {fmtDateRange(emp.yearStart, emp.yearEnd)}
      </p>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-line-soft bg-[#fbfcfd] px-3 py-2">
          <p className="text-[11.5px] text-muted">Basic salary</p>
          <p className="g-num mt-0.5 text-sm font-semibold">
            S$
            {emp.baseSalary.toLocaleString("en-SG", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
        <div className="rounded-lg border border-attention-line bg-attention-surface px-3 py-2">
          <p className="text-[11.5px] text-attention">Bonus</p>
          <p className="mt-0.5 text-sm font-semibold text-attention">2 weeks</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="g-label">Leave taken that year</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border border-line-soft bg-[#fbfcfd] px-2 py-2">
            <p className="g-num text-lg font-semibold text-brand">{emp.alEntitlement}</p>
            <p className="text-[11px] text-muted">AL entitlement</p>
          </div>
          <div className="rounded-lg border border-line-soft bg-[#fbfcfd] px-2 py-2">
            <p className="g-num text-lg font-semibold">{emp.alUsed}</p>
            <p className="text-[11px] text-muted">AL used</p>
          </div>
          <div
            className={`rounded-lg px-2 py-2 ${
              emp.alUnused > 0
                ? "border border-attention-line bg-attention-surface"
                : "border border-line-soft bg-[#fbfcfd]"
            }`}
          >
            <p className={`g-num text-lg font-semibold ${emp.alUnused > 0 ? "text-attention" : ""}`}>
              {emp.alUnused}
            </p>
            <p className={`text-[11px] ${emp.alUnused > 0 ? "text-attention" : "text-muted"}`}>
              AL unused
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-line-soft bg-[#fbfcfd] px-3 py-2">
          <p className="text-[12.5px] text-muted">Sick leave used</p>
          <p className="g-num text-sm font-semibold">{emp.sickUsed} days</p>
        </div>
      </div>
    </div>
  );
}

export function AnniversariesClient({ groups }: { groups: AnniversaryGroup[] }) {
  const total = groups.reduce((sum, g) => sum + g.employees.length, 0);

  if (total === 0) {
    return (
      <main className="flex-1 px-4 py-5">
        <p className="text-sm text-muted">
          No employment anniversaries in {groups.map((g) => g.monthLabel).join(" or ")}.
        </p>
      </main>
    );
  }

  return (
    <main className="flex-1 space-y-6 px-4 py-5">
      {groups.map((group) => (
        <section key={group.key}>
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h2 className="g-label">
              {group.heading} · {group.monthLabel}
            </h2>
            {group.employees.length > 0 && (
              <span className="g-num text-[12.5px] font-medium text-muted">
                {group.employees.length}
              </span>
            )}
          </div>

          {group.employees.length === 0 ? (
            <p className="g-card px-4 py-3.5 text-[13px] text-muted">
              No anniversaries in {group.monthLabel}.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-[12.5px] leading-snug text-muted">{group.note}</p>
              {group.employees.map((emp) => (
                <Card key={`${group.key}-${emp.id}`} emp={emp} />
              ))}
            </div>
          )}
        </section>
      ))}
    </main>
  );
}
