import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { todaySG } from "@/lib/utils/date";
import {
  ChecklistManageClient,
  type Area,
  type Task,
  type EmployeeOption,
} from "./manage-client";

export default async function ManageChecklistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: contract } = await supabase
    .from("contracts")
    .select("id, client_name, site_name")
    .eq("id", id)
    .maybeSingle();
  if (!contract) notFound();

  const today = todaySG();

  const [areasRes, itemsRes, assignedRes] = await Promise.all([
    supabase
      .from("checklist_areas")
      .select("id, name, assigned_employee_id, sort_order")
      .eq("contract_id", id)
      .order("sort_order"),
    supabase
      .from("checklist_items")
      .select("id, area_id, description, frequency, requires_photo, active, sort_order")
      .eq("contract_id", id)
      .order("sort_order"),
    // Employees currently assigned to this site — the pool to assign areas to.
    supabase
      .from("contract_assignments")
      .select("employee_id, employees(full_name)")
      .eq("contract_id", id)
      .lte("assigned_from", today)
      .or(`assigned_to.is.null,assigned_to.gte.${today}`),
  ]);

  const areas = (areasRes.data ?? []) as Area[];
  const tasks = (itemsRes.data ?? []) as Task[];

  const seen = new Set<string>();
  const employees: EmployeeOption[] = [];
  for (const a of assignedRes.data ?? []) {
    const emp = Array.isArray(a.employees) ? a.employees[0] : a.employees;
    if (a.employee_id && !seen.has(a.employee_id)) {
      seen.add(a.employee_id);
      employees.push({ id: a.employee_id, fullName: emp?.full_name ?? "—" });
    }
  }

  return (
    <ChecklistManageClient
      contractId={id}
      siteName={contract.site_name}
      clientName={contract.client_name}
      areas={areas}
      tasks={tasks}
      employees={employees}
    />
  );
}
