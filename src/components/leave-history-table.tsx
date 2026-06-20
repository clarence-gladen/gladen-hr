import type { LeaveYearHistory } from "@/lib/leave/balances";

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  const dt = new Date(Number(y), Number(m) - 1, Number(d));
  return dt.toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
}

function LeaveTypeRow({
  label,
  data,
}: {
  label: string;
  data: { entitlement: number; used: number; unused: number };
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-black/5 last:border-0">
      <p className="text-sm text-foreground/60 w-28 shrink-0">{label}</p>
      <div className="flex gap-4 text-sm text-right">
        <div className="w-16">
          <p className="text-[10px] text-foreground/40 mb-0.5">Entitlement</p>
          <p className="font-medium text-foreground">{data.entitlement}d</p>
        </div>
        <div className="w-12">
          <p className="text-[10px] text-foreground/40 mb-0.5">Used</p>
          <p className="font-medium text-foreground">{data.used}d</p>
        </div>
        <div className="w-14">
          <p className="text-[10px] text-foreground/40 mb-0.5">Unused</p>
          <p className={`font-semibold ${data.unused > 0 ? "text-brand" : "text-foreground/40"}`}>
            {data.unused}d
          </p>
        </div>
      </div>
    </div>
  );
}

export function LeaveHistoryTable({ history }: { history: LeaveYearHistory[] }) {
  if (history.length === 0) {
    return (
      <p className="text-sm text-foreground/40 text-center py-4">No leave history yet.</p>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((yr) => (
        <div key={yr.employmentYear} className="rounded-xl bg-white shadow-sm overflow-hidden">
          {/* Year header */}
          <div className={`px-4 py-2.5 flex items-center justify-between ${yr.isCurrent ? "bg-brand" : "bg-black/5"}`}>
            <div>
              <p className={`text-xs font-bold ${yr.isCurrent ? "text-white" : "text-foreground/60"}`}>
                Employment Year {yr.employmentYear}
                {yr.isCurrent && " (Current)"}
              </p>
              <p className={`text-[10px] mt-0.5 ${yr.isCurrent ? "text-white/70" : "text-foreground/40"}`}>
                {formatDate(yr.yearStart)} – {formatDate(yr.yearEnd)}
              </p>
            </div>
          </div>

          {/* Leave rows */}
          <div className="px-4 py-1">
            <LeaveTypeRow label="Annual Leave" data={yr.annual} />
            <LeaveTypeRow label="Sick Leave" data={yr.sick} />
            <LeaveTypeRow label="Hospitalisation" data={yr.hospitalization} />
          </div>

          {yr.isCurrent && yr.employmentYear === 1 && yr.annual.entitlement < 7 && (
            <div className="px-4 pb-3">
              <p className="text-[10px] text-foreground/40 italic">
                Annual leave accrues monthly in Year 1. Full 7-day entitlement at month 12.
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
