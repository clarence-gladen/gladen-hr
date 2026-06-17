import { createClient } from "@/lib/supabase/server";
import { AccessClient } from "./access-client";

export default async function ManageAccessPage() {
  const supabase = await createClient();

  const { data: managers } = await supabase.rpc("get_manager_phones");

  return <AccessClient managers={(managers ?? []) as { phone: string; user_id: string | null; status: string }[]} />;
}
