import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { todaySG } from "@/lib/utils/date";
import { ChecklistClient, type AreaGroup } from "./checklist-client";

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

  if (!employeeId || !employee?.feature_checklist) {
    redirect("/employee");
  }

  const today = todaySG();

  // Areas assigned to this employee.
  const { data: areasData } = await supabase
    .from("checklist_areas")
    .select("id, name, contract_id, contracts(site_name)")
    .eq("assigned_employee_id", employeeId)
    .eq("active", true)
    .order("sort_order");

  const areas = areasData ?? [];
  if (areas.length === 0) {
    return <ChecklistClient groups={[]} />;
  }

  const areaIds = areas.map((a) => a.id);
  const contractIds = [...new Set(areas.map((a) => a.contract_id))];

  const [itemsRes, completionsRes, checkinsRes] = await Promise.all([
    supabase
      .from("checklist_items")
      .select("id, area_id, description, frequency")
      .in("area_id", areaIds)
      .eq("active", true)
      .order("sort_order"),
    supabase
      .from("checklist_completions")
      .select("item_id")
      .in("contract_id", contractIds)
      .eq("done_date", today),
    supabase
      .from("attendance_events")
      .select("contract_id, event_type, occurred_at")
      .eq("employee_id", employeeId)
      .in("contract_id", contractIds)
      .eq("status", "accepted")
      .gte("occurred_at", `${today}T00:00:00`)
      .order("occurred_at", { ascending: false }),
  ]);

  const doneIds = new Set((completionsRes.data ?? []).map((c) => c.item_id));

  // Latest accepted event per contract → checked-in if it's a check_in.
  const checkedInContracts = new Set<string>();
  const seenContract = new Set<string>();
  for (const e of checkinsRes.data ?? []) {
    if (seenContract.has(e.contract_id)) continue; // first seen = latest (desc)
    seenContract.add(e.contract_id);
    if (e.event_type === "check_in") checkedInContracts.add(e.contract_id);
  }

  const itemsByArea = new Map<string, { id: string; description: string; frequency: string }[]>();
  for (const i of itemsRes.data ?? []) {
    if (!itemsByArea.has(i.area_id)) itemsByArea.set(i.area_id, []);
    itemsByArea.get(i.area_id)!.push({ id: i.id, description: i.description, frequency: i.frequency });
  }

  const groups: AreaGroup[] = areas.map((a) => {
    const contract = Array.isArray(a.contracts) ? a.contracts[0] : a.contracts;
    return {
      areaId: a.id,
      areaName: a.name,
      siteName: contract?.site_name ?? "",
      checkedIn: checkedInContracts.has(a.contract_id),
      tasks: (itemsByArea.get(a.id) ?? []).map((t) => ({
        id: t.id,
        description: t.description,
        frequency: t.frequency,
        done: doneIds.has(t.id),
      })),
    };
  });

  return <ChecklistClient groups={groups} />;
}
