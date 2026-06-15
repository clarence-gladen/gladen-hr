import { createClient } from "@/lib/supabase/server";
import { SalaryAdvancesClient } from "./salary-advances-client";

export default async function SalaryAdvancesPage() {
  const supabase = await createClient();

  const [advancesRes, employeesRes] = await Promise.all([
    supabase
      .from("salary_advances")
      .select(
        "id, employee_id, amount, repayment_amount_per_month, status, notes, created_at, employees(full_name), salary_advance_repayments(id, amount, created_at)"
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("employees")
      .select("id, full_name")
      .eq("status", "active")
      .order("full_name"),
  ]);

  const advances = (advancesRes.data ?? []).map((advance) => {
    const repayments = Array.isArray(advance.salary_advance_repayments)
      ? advance.salary_advance_repayments
      : [];
    const repaid = repayments.reduce((sum, r) => sum + Number(r.amount), 0);
    const outstanding = Number(advance.amount) - repaid;
    return { ...advance, repaid, outstanding };
  });

  return (
    <SalaryAdvancesClient
      advances={advances}
      employees={employeesRes.data ?? []}
    />
  );
}
