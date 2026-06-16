import { createClient } from "@/lib/supabase/server";
import { RecordLeaveClient } from "./record-leave-client";

export default async function RecordLeavePage() {
  const supabase = await createClient();

  const { data: employees } = await supabase
    .from("employees")
    .select("id, full_name")
    .eq("status", "active")
    .order("full_name");

  return <RecordLeaveClient employees={employees ?? []} />;
}
