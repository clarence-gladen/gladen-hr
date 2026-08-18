import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { todaySG } from "@/lib/utils/date";
import { ChecklistClient, type ChecklistTask } from "./checklist-client";

export default async function EmployeeChecklistPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("employee_id, employees(feature_checklist)")
    .eq("id", auth.user!.id)
    .maybeSingle();

  const employee = Array.isArray(profile?.employees)
    ? profile?.employees[0]
    : profile?.employees;
  const employeeId = profile?.employee_id;

  // Feature gate.
  if (!employeeId || !employee?.feature_checklist) {
    redirect("/employee");
  }

  const today = todaySG();

  // The employee's active site(s) today. Trial cleaners have one site.
  const { data: assignments } = await supabase
    .from("contract_assignments")
    .select("contract_id, contracts(site_name, client_name)")
    .eq("employee_id", employeeId)
    .lte("assigned_from", today)
    .or(`assigned_to.is.null,assigned_to.gte.${today}`);

  const assignment = (assignments ?? [])[0];
  if (!assignment) {
    return <ChecklistClient siteName={null} tasks={[]} checkedIn={false} />;
  }
  const contract = Array.isArray(assignment.contracts)
    ? assignment.contracts[0]
    : assignment.contracts;
  const contractId = assignment.contract_id;

  const [itemsRes, completionsRes, checkinRes] = await Promise.all([
    supabase
      .from("checklist_items")
      .select("id, description, frequency, area, requires_photo, sort_order")
      .eq("contract_id", contractId)
      .eq("active", true)
      .order("sort_order"),
    supabase
      .from("checklist_completions")
      .select("item_id")
      .eq("contract_id", contractId)
      .eq("done_date", today),
    supabase
      .from("attendance_events")
      .select("event_type")
      .eq("employee_id", employeeId)
      .eq("contract_id", contractId)
      .eq("status", "accepted")
      .gte("occurred_at", `${today}T00:00:00`)
      .order("occurred_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const doneIds = new Set((completionsRes.data ?? []).map((c) => c.item_id));
  const tasks: ChecklistTask[] = (itemsRes.data ?? []).map((i) => ({
    id: i.id,
    description: i.description,
    frequency: i.frequency,
    area: i.area,
    done: doneIds.has(i.id),
  }));

  const checkedIn = checkinRes.data?.event_type === "check_in";

  return (
    <ChecklistClient
      siteName={contract?.site_name ?? null}
      tasks={tasks}
      checkedIn={checkedIn}
    />
  );
}
