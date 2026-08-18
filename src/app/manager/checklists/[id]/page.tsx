import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChecklistManageClient, type ChecklistItem } from "./manage-client";

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

  const { data: items } = await supabase
    .from("checklist_items")
    .select("id, description, frequency, area, requires_photo, active, sort_order")
    .eq("contract_id", id)
    .order("sort_order");

  return (
    <ChecklistManageClient
      contractId={id}
      siteName={contract.site_name}
      clientName={contract.client_name}
      items={(items ?? []) as ChecklistItem[]}
    />
  );
}
