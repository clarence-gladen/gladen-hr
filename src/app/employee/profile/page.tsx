import { createClient } from "@/lib/supabase/server";
import { ProfileClient } from "./profile-client";
import type { ResidencyStatus } from "@/lib/types/database";

export default async function EmployeeProfilePage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("employee_id")
    .eq("id", auth.user!.id)
    .maybeSingle();

  const employeeId = profile?.employee_id;

  const [employeeRes, leaveRes] = await Promise.all([
    employeeId
      ? supabase
          .from("employees")
          .select("full_name, designation, employment_start_date, residency_status, bank_name, bank_account_number, mobile_number")
          .eq("id", employeeId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    employeeId
      ? supabase
          .from("leave_requests")
          .select("id, leave_type, start_date, end_date, days, reason, status, created_at")
          .eq("employee_id", employeeId)
          .order("start_date", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const employee = employeeRes.data;

  return (
    <ProfileClient
      employee={
        employee
          ? {
              full_name: employee.full_name,
              designation: employee.designation,
              employment_start_date: employee.employment_start_date,
              residency_status: employee.residency_status as ResidencyStatus,
              mobile_number: employee.mobile_number,
              bank_name: employee.bank_name,
              bank_account_number: employee.bank_account_number,
            }
          : null
      }
      leaveRequests={(leaveRes.data ?? []) as import("../leave/leave-client").LeaveRequestRow[]}
    />
  );
}
