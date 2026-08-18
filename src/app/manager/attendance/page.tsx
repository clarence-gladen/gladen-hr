import { Header } from "@/components/header";
import { createClient } from "@/lib/supabase/server";
import { todaySG } from "@/lib/utils/date";

interface EventRow {
  id: string;
  employee_id: string;
  contract_id: string;
  event_type: string;
  status: string;
  occurred_at: string;
  distance_m: number | null;
  within_fence: boolean | null;
  accuracy_m: number | null;
  flags: string[];
  employees: { full_name: string } | { full_name: string }[] | null;
  contracts: { site_name: string; client_name: string } | { site_name: string; client_name: string }[] | null;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
function fmtDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

const FLAG_LABEL: Record<string, string> = {
  outside_fence: "outside fence",
  low_accuracy: "weak GPS",
  shared_device: "shared device",
  no_site_pin: "no site pin",
};

export default async function ManagerAttendancePage() {
  const supabase = await createClient();

  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceStr = since.toISOString();
  const todayStr = todaySG();

  const { data } = await supabase
    .from("attendance_events")
    .select(
      "id, employee_id, contract_id, event_type, status, occurred_at, distance_m, within_fence, accuracy_m, flags, employees(full_name), contracts(site_name, client_name)"
    )
    .gte("occurred_at", sinceStr)
    .order("occurred_at", { ascending: false })
    .limit(300);

  const rows = (data ?? []) as EventRow[];

  // "On site now" = latest accepted event today per employee+site is a check_in.
  const latestToday = new Map<string, EventRow>();
  for (const r of rows) {
    if (r.status !== "accepted") continue;
    if (r.occurred_at.slice(0, 10) !== todayStr) continue;
    const key = `${r.employee_id}:${r.contract_id}`;
    if (!latestToday.has(key)) latestToday.set(key, r); // rows are desc, first seen = latest
  }
  const onSite = [...latestToday.values()].filter((r) => r.event_type === "check_in");

  // Group all events by day for the log.
  const byDay = new Map<string, EventRow[]>();
  for (const r of rows) {
    const day = r.occurred_at.slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(r);
  }

  return (
    <>
      <Header title="Attendance" />
      <main className="flex-1 px-4 py-6 space-y-5">
        {/* On site now */}
        <section className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <p className="mb-2 text-sm font-semibold">On site now</p>
          {onSite.length === 0 ? (
            <p className="text-sm text-foreground/50">No one is currently checked in.</p>
          ) : (
            <ul className="space-y-2">
              {onSite.map((r) => (
                <li key={r.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{one(r.employees)?.full_name}</p>
                    <p className="text-xs text-foreground/50">{one(r.contracts)?.site_name}</p>
                  </div>
                  <span className="text-xs text-green-700">since {fmtTime(r.occurred_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {rows.length === 0 && (
          <p className="text-sm text-foreground/50">
            No check-in activity in the last 7 days.
          </p>
        )}

        {/* Daily log */}
        {[...byDay.entries()].map(([day, evs]) => (
          <section key={day}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/50">
              {fmtDay(day)}
            </p>
            <ul className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
              {evs.map((r) => {
                const rejected = r.status !== "accepted";
                return (
                  <li key={r.id} className="border-b border-black/5 px-4 py-3 last:border-b-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{one(r.employees)?.full_name}</p>
                      <span className="text-sm tabular-nums text-foreground/70">{fmtTime(r.occurred_at)}</span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between">
                      <p className="text-xs text-foreground/50">
                        {r.event_type === "check_in" ? "Check in" : "Check out"} · {one(r.contracts)?.site_name}
                        {r.distance_m != null && ` · ${Math.round(r.distance_m)}m`}
                      </p>
                      <div className="flex flex-wrap justify-end gap-1">
                        {rejected && (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
                            {r.status === "rejected_out_of_fence"
                              ? "rejected · too far"
                              : r.status === "rejected_low_accuracy"
                              ? "rejected · weak GPS"
                              : "rejected · no site pin"}
                          </span>
                        )}
                        {r.flags?.map((f) => (
                          <span
                            key={f}
                            className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800"
                          >
                            {FLAG_LABEL[f] ?? f}
                          </span>
                        ))}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </main>
    </>
  );
}
