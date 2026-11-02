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
  const [thisMonth, lastMonth, twoMonthsAgo] = anniversaryMonths(todayStr);

  const { data: employees } = await supabase
    .from("employees")
    .select("id, full_name, designation, employment_start_date, base_salary, work_days_per_week")
    .eq("status", "active");

  const matching = (target: AnniversaryMonth) =>
    employeesWithAnniversaryIn(employees ?? [], target);

  const thisMonthEmps = matching(thisMonth);
  const lastMonthEmps = matching(lastMonth);
  const twoMonthsAgoEmps = matching(twoMonthsAgo);
  const empIds = [...thisMonthEmps, ...lastMonthEmps, ...twoMonthsAgoEmps].map((e) => e.id);

  const { data: leaveRows } = empIds.length
    ? await supabase
        .from("leave_requests")
        .select("employee_id, leave_type, days, start_date")
        .in("employee_id", empIds)
        .eq("status", "approved")
    : { data: [] };

  // Bonus Paid/Unpaid flags, keyed "employeeId|YYYY-MM-DD". No row = Unpaid.
  const { data: bonusRows } = empIds.length
    ? await supabase
        .from("anniversary_bonus_payments")
        .select("employee_id, anniversary_date, paid")
        .in("employee_id", empIds)
    : { data: [] };
  const paidKeys = new Set(
    (bonusRows ?? []).filter((r) => r.paid).map((r) => `${r.employee_id}|${r.anniversary_date}`)
  );

  function enrich(emps: NonNullable<typeof employees>, target: AnniversaryMonth) {
    return enrichAnniversaries(
      emps,
      leaveRows ?? [],
      target,
      getEmploymentYearBounds,
      getAnnualLeaveForYear
    ).map((emp) => ({ ...emp, bonusPaid: paidKeys.has(`${emp.id}|${emp.anniversaryDate}`) }));
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
    {
      key: "twoAgo",
      heading: "2 months ago",
      monthLabel: monthLabel(twoMonthsAgo.year, twoMonthsAgo.month),
      note: `Credit the bonus and unused leave in the ${monthLabel(twoMonthsAgo.year, twoMonthsAgo.month)} payroll run if not yet paid.`,
      employees: enrich(twoMonthsAgoEmps, twoMonthsAgo),
    },
  ];

  return (
    <>
      <Header title="Anniversaries" />
      <AnniversariesClient groups={groups} />
    </>
  );
}
