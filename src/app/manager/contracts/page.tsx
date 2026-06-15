import { createClient } from "@/lib/supabase/server";
import { ContractsListClient } from "./contracts-list-client";

export default async function ManagerContractsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contracts")
    .select("id, client_name, site_name, monthly_value, status")
    .order("created_at", { ascending: false });

  return <ContractsListClient contracts={data ?? []} />;
}
