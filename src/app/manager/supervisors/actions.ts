"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function grantSupervisorAction(employeeId: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("employees")
    .update({ is_supervisor: true })
    .eq("id", employeeId);
  if (error) return { error: error.message };

  return {};
}

export async function revokeSupervisorAction(employeeId: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error: sitesError } = await supabase
    .from("supervisor_sites")
    .delete()
    .eq("employee_id", employeeId);
  if (sitesError) return { error: sitesError.message };

  const { error } = await supabase
    .from("employees")
    .update({ is_supervisor: false })
    .eq("id", employeeId);
  if (error) return { error: error.message };

  return {};
}

export async function saveSupervisorSitesAction(
  employeeId: string,
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const contractIds = formData.getAll("contractIds").map(String).filter(Boolean);

  const { error: delError } = await supabase
    .from("supervisor_sites")
    .delete()
    .eq("employee_id", employeeId);
  if (delError) return { error: delError.message };

  if (contractIds.length > 0) {
    const rows = contractIds.map((contractId) => ({
      employee_id: employeeId,
      contract_id: contractId,
    }));
    const { error: insError } = await supabase.from("supervisor_sites").insert(rows);
    if (insError) return { error: insError.message };
  }

  revalidatePath("/manager/supervisors");
  return {};
}
