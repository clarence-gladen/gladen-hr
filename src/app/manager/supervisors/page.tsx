import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/header";
import { SupervisorsClient } from "./supervisors-client";

export default async function SupervisorsPage() {
  const supabase = await createClient();

  const [employeesRes, contractsRes, sitesRes] = await Promise.all([
    supabase
      .from("employees")
      .select("id, full_name, is_supervisor")
      .eq("status", "active")
      .order("full_name"),
    supabase
      .from("contracts")
      .select("id, client_name, site_name")
      .eq("status", "active")
      .order("site_name"),
    supabase.from("supervisor_sites").select("employee_id, contract_id"),
  ]);

  return (
    <>
      <Header title="Supervisors" />
      <main className="flex-1 px-4 py-6">
        <SupervisorsClient
          employees={employeesRes.data ?? []}
          contracts={contractsRes.data ?? []}
          assignments={sitesRes.data ?? []}
        />
      </main>
    </>
  );
}
