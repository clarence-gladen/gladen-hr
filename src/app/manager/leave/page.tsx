import { createClient } from "@/lib/supabase/server";
import { LeaveApprovalsClient } from "./leave-approvals-client";

export default async function ManagerLeavePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leave_requests")
    .select(
      "id, employee_id, leave_type, start_date, end_date, days, reason, status, created_at, employees(full_name)"
    )
    .order("created_at", { ascending: false });

  return <LeaveApprovalsClient requests={data ?? []} />;
}
