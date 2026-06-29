import { createClient } from "@/lib/supabase/server";
import { getEmploymentYearBounds, getAnnualLeaveForYear } from "@/lib/leave/entitlement";
import { Header } from "@/components/header";
import { AnniversariesClient } from "./anniversaries-client";

export default async function AnniversariesPage() {
  const supabase = await createClient();
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = String(today.getMonth() + 1).padStart(2, "0");
  const monthLabel = today.toLocaleDateString("en-SG", { month: "long", year: "numeric" });

  const { data: employees } = await supabase
    .from("employees")
    .select("id, full_name, designation, employment_start_date, base_salary, work_days_per_week")
    .eq("status", "active");

  const anniversaryEmps = (employees ?? []).filter((emp) => {
    if (!emp.employment_start_date) return false;
    const month = emp.employment_start_date.slice(5, 7);
    const year = parseInt(emp.employment_start_date.slice(0, 4), 10);
    return month === currentMonth && year < currentYear;
  });

  if (anniversaryEmps.length === 0) {
    return (
      <>
        <Header title={`Anniversaries — ${monthLabel}`} />
        <main className="flex-1 px-4 py-6">
          <p className="text-sm text-foreground/50">No employment anniversaries this month.</p>
        </main>
      </>
    );
  }

  const empIds = anniversaryEmps.map((e) => e.id);

  const { data: leaveRows } = await supabase
    .from("leave_requests")
    .select("employee_id, leave_type, days, start_date")
    .in("employee_id", empIds)
    .eq("status", "approved");

  const enriched = anniversaryEmps
    .map((emp) => {
      const yearsCompleting = currentYear - parseInt(emp.employment_start_date.slice(0, 4), 10);
      const { yearStart, yearEnd } = getEmploymentYearBounds(emp.employment_start_date, yearsCompleting);
      const alEntitlement = getAnnualLeaveForYear(yearsCompleting);
      const day = emp.employment_start_date.slice(8, 10);
      const anniversaryDate = `${currentYear}-${currentMonth}-${day}`;

      let alUsed = 0;
      let sickUsed = 0;
      for (const row of leaveRows ?? []) {
        if (row.employee_id !== emp.id) continue;
        if (row.start_date < yearStart || row.start_date > yearEnd) continue;
        if (row.leave_type === "annual") alUsed += row.days;
        if (row.leave_type === "sick") sickUsed += row.days;
      }

      return {
        id: emp.id,
        full_name: emp.full_name,
        designation: emp.designation as string | null,
        yearsCompleting,
        anniversaryDate,
        baseSalary: (emp.base_salary ?? 0) as number,
        alEntitlement,
        alUsed,
        alUnused: Math.max(0, alEntitlement - alUsed),
        sickUsed,
        yearStart,
        yearEnd,
      };
    })
    .sort((a, b) => a.anniversaryDate.localeCompare(b.anniversaryDate));

  return (
    <>
      <Header title={`Anniversaries — ${monthLabel}`} />
      <AnniversariesClient employees={enriched} monthLabel={monthLabel} />
    </>
  );
}
