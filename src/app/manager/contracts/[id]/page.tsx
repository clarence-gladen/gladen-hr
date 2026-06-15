import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ContractDetailClient } from "./contract-detail-client";

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: contract } = await supabase
    .from("contracts")
    .select("id, client_name, site_name, start_date, end_date, monthly_value, status")
    .eq("id", id)
    .single();

  if (!contract) {
    notFound();
  }

  const [assignmentsRes, expensesRes, employeesRes] = await Promise.all([
    supabase
      .from("contract_assignments")
      .select("id, employee_id, role_on_site, assigned_from, assigned_to, employees(full_name, base_salary)")
      .eq("contract_id", id)
      .is("assigned_to", null),
    supabase
      .from("contract_expenses")
      .select("id, description, amount, expense_type, expense_date")
      .eq("contract_id", id)
      .order("expense_date", { ascending: false }),
    supabase
      .from("employees")
      .select("id, full_name")
      .eq("status", "active")
      .order("full_name"),
  ]);

  return (
    <ContractDetailClient
      contract={contract}
      assignments={assignmentsRes.data ?? []}
      expenses={expensesRes.data ?? []}
      employees={employeesRes.data ?? []}
    />
  );
}
