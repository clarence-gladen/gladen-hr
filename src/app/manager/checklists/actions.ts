"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// ── Areas ────────────────────────────────────────────────────────────────
export async function addAreaAction(
  contractId: string,
  name: string,
  assignedEmployeeId: string | null
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const trimmed = name.trim();
  if (!trimmed) return { error: "Please enter an area name." };

  const { data: last } = await supabase
    .from("checklist_areas")
    .select("sort_order")
    .eq("contract_id", contractId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("checklist_areas").insert({
    contract_id: contractId,
    name: trimmed,
    assigned_employee_id: assignedEmployeeId || null,
    sort_order: (last?.sort_order ?? 0) + 1,
  });
  if (error) return { error: error.message };

  revalidatePath(`/manager/checklists/${contractId}`);
  return {};
}

export async function assignAreaAction(
  contractId: string,
  areaId: string,
  assignedEmployeeId: string | null
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("checklist_areas")
    .update({ assigned_employee_id: assignedEmployeeId || null })
    .eq("id", areaId);
  if (error) return { error: error.message };
  revalidatePath(`/manager/checklists/${contractId}`);
  return {};
}

export async function deleteAreaAction(
  contractId: string,
  areaId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("checklist_areas").delete().eq("id", areaId);
  if (error) return { error: error.message };
  revalidatePath(`/manager/checklists/${contractId}`);
  return {};
}

// ── Tasks ────────────────────────────────────────────────────────────────
export async function addChecklistItemAction(
  contractId: string,
  areaId: string,
  description: string,
  frequency: string,
  requiresPhoto: boolean
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const trimmed = description.trim();
  if (!trimmed) return { error: "Please enter a task description." };
  if (!["daily", "weekly", "monthly"].includes(frequency)) return { error: "Invalid frequency." };

  const { data: last } = await supabase
    .from("checklist_items")
    .select("sort_order")
    .eq("area_id", areaId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("checklist_items").insert({
    contract_id: contractId,
    area_id: areaId,
    description: trimmed,
    frequency,
    requires_photo: requiresPhoto,
    sort_order: (last?.sort_order ?? 0) + 1,
  });
  if (error) return { error: error.message };

  revalidatePath(`/manager/checklists/${contractId}`);
  return {};
}

export async function deleteChecklistItemAction(
  contractId: string,
  itemId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("checklist_items").delete().eq("id", itemId);
  if (error) return { error: error.message };
  revalidatePath(`/manager/checklists/${contractId}`);
  return {};
}
