import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/header";
import { OvertimeTabs } from "./overtime-tabs";
import type { OtLogRow } from "./ot-log-client";

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function OvertimePage() {
  const supabase = await createClient();

  const [employeesRes, recordsRes, sitesRes, entriesRes] = await Promise.all([
    supabase
      .from("employees")
      .select("id, full_name")
      .eq("status", "active")
      .order("full_name"),
    supabase
      .from("overtime_records")
      .select("id, work_date, remarks, amount, employees(full_name)")
      .order("work_date", { ascending: false })
      .limit(200),
    supabase
      .from("contracts")
      .select("id, client_name, site_name")
      .eq("status", "active")
      .order("site_name"),
    supabase
      .from("ot_entries")
      .select(
        "id, employee_id, contract_id, work_date, period, hours, comment, employees(full_name), contracts(site_name), logged_by:profiles!ot_entries_created_by_fkey(full_name)"
      )
      .order("work_date", { ascending: false })
      .limit(300),
  ]);

  const employees = employeesRes.data ?? [];
  const sites = sitesRes.data ?? [];

  const records = (recordsRes.data ?? []).map((r) => ({
    ...r,
    employees: one(r.employees),
  }));

  const entries: OtLogRow[] = (entriesRes.data ?? []).map((e) => ({
    id: e.id,
    employee_id: e.employee_id,
    contract_id: e.contract_id,
    work_date: e.work_date,
    period: e.period,
    hours: e.hours === null ? null : Number(e.hours),
    comment: e.comment,
    employee_name: one(e.employees)?.full_name ?? "—",
    site_name: one(e.contracts)?.site_name ?? null,
    logged_by: one(e.logged_by)?.full_name ?? null,
  }));

  return (
    <>
      <Header title="Overtime" />
      <main className="flex-1 px-4 py-6">
        <div className="space-y-4">
          <OvertimeTabs employees={employees} sites={sites} records={records} entries={entries} />
        </div>
      </main>
    </>
  );
}
