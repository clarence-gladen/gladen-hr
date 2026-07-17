import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OtClient, type SupervisorEmployee, type OtEntryRow } from "./ot-client";

export default async function SupervisorOtPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("employee_id, employees(is_supervisor)")
    .eq("id", auth.user!.id)
    .maybeSingle();

  const employee = Array.isArray(profile?.employees)
    ? profile?.employees[0]
    : profile?.employees;

  if (!employee?.is_supervisor) {
    redirect("/employee");
  }

  const [employeesRes, entriesRes] = await Promise.all([
    supabase.rpc("get_supervisor_employees"),
    supabase.rpc("get_supervisor_ot_entries"),
  ]);

  return (
    <OtClient
      employees={(employeesRes.data ?? []) as SupervisorEmployee[]}
      entries={(entriesRes.data ?? []) as OtEntryRow[]}
    />
  );
}
