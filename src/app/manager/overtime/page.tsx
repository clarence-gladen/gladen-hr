import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/header";
import { OvertimeClient } from "./overtime-client";

export default async function OvertimePage() {
  const supabase = await createClient();

  const [employeesRes, recordsRes] = await Promise.all([
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
  ]);

  const employees = employeesRes.data ?? [];
  const records = (recordsRes.data ?? []).map((r) => ({
    ...r,
    employees: Array.isArray(r.employees) ? (r.employees[0] ?? null) : r.employees,
  }));

  return (
    <>
      <Header title="Overtime" />
      <main className="flex-1 px-4 py-6">
        <div className="space-y-4">
          <OvertimeClient employees={employees} records={records} />
        </div>
      </main>
    </>
  );
}
