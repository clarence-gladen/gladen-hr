import { createClient } from "@/lib/supabase/server";
import { getEmploymentYearBounds, getAnnualLeaveForYear } from "@/lib/leave/entitlement";
import { Header } from "@/components/header";
import { todaySG } from "@/lib/utils/date";
import {
  anniversaryMonths,
  employeesWithAnniversaryIn,
  enrichAnniversaries,
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
    employeesWithAnniversaryIn(employees ?? [], target);

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
    return enrichAnniversaries(
      emps,
      leaveRows ?? [],
      target,
      getEmploymentYearBounds,
      getAnnualLeaveForYear
    );
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
