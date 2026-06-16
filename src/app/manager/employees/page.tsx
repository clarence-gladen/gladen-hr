import { createClient } from "@/lib/supabase/server";
import { EmployeesListClient } from "./employees-list-client";

export default async function EmployeesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("employees")
    .select("id, full_name, nric_last4, mobile_number, residency_status, designation, status, employment_end_date")
    .order("full_name");

  return <EmployeesListClient employees={data ?? []} />;
}
