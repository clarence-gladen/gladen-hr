import { createClient } from "@/lib/supabase/server";
import { getEmploymentYearBounds, getAnnualLeaveForYear } from "@/lib/leave/entitlement";
import { Header } from "@/components/header";
import { todaySG } from "@/lib/utils/date";
import {
  anniversaryMonths,
  hasAnniversaryIn,
  yearsCompletingIn,
  type AnniversaryMonth,
} from "@/lib/hr/anniversaries";
import { AnniversariesClient, type AnniversaryGroup } from "./anniversaries-client";

function monthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat("en-SG", { timeZone: "UTC", month: "long", year: "numeric" })
    .format(new Date(Date.UTC(year, month - 1, 1)));
}

export default async function AnniversariesPage() {
  const supabase = await createClient();

  // Singapore business date — the server runs in UTC, so on the 1st of a month
  // an unpinned date would still be in the previous month until 8am local time.
  const todayStr = todaySG();
  const [thisMonth, lastMonth] = anniversaryMonths(todayStr);

  const { data: employees } = await supabase
    .from("employees")
    .select("id, full_name, designation, employment_start_date, base_salary, work_days_per_week")
    .eq("status", "active");

  const matching = (target: AnniversaryMonth) =>
    (employees ?? []).filter((emp) => hasAnniversaryIn(emp.employment_start_date, target));

  const thisMonthEmps = matching(thisMonth);
  const lastMonthEmps = matching(lastMonth);
  const empIds = [...thisMonthEmps, ...lastMonthEmps].map((e) => e.id);

  const { data: leaveRows } = empIds.length
    ? await supabase
        .from("leave_requests")
        .select("employee_id, leave_type, days, start_date")
        .in("employee_id", empIds)
        .eq("status", "approved")
    : { data: [] };

  function enrich(emps: NonNullable<typeof employees>, target: AnniversaryMonth) {
    return emps
      .map((emp) => {
        const startDate = emp.employment_start_date!;
        // Counted against the anniversary's own year, not today's — a December
        // anniversary viewed in January is still that December's milestone.
        const yearsCompleting = yearsCompletingIn(startDate, target);
        const { yearStart, yearEnd } = getEmploymentYearBounds(startDate, yearsCompleting);
        const alEntitlement = getAnnualLeaveForYear(yearsCompleting);

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
          anniversaryDate: `${target.year}-${target.mm}-${startDate.slice(8, 10)}`,
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
  }

  const groups: AnniversaryGroup[] = [
    {
      key: "this",
      heading: "This month",
      monthLabel: monthLabel(thisMonth.year, thisMonth.month),
      note: "Bonus and unused leave are processed with next month's payroll.",
      employees: enrich(thisMonthEmps, thisMonth),
    },
    {
      key: "last",
      heading: "Last month",
      monthLabel: monthLabel(lastMonth.year, lastMonth.month),
      note: `Credit the bonus and unused leave in the ${monthLabel(lastMonth.year, lastMonth.month)} payroll run.`,
      employees: enrich(lastMonthEmps, lastMonth),
    },
  ];

  return (
    <>
      <Header title="Anniversaries" />
      <AnniversariesClient groups={groups} />
    </>
  );
}
