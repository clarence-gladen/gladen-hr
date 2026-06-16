import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/header";
import type { ResidencyStatus } from "@/lib/types/database";

const residencyLabel: Record<ResidencyStatus, string> = {
  citizen: "Singaporean",
  pr: "Permanent Resident",
  work_permit: "Work Permit",
  s_pass: "S Pass",
};

export default async function EmployeeProfilePage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("employee_id")
    .eq("id", auth.user!.id)
    .maybeSingle();

  const employeeId = profile?.employee_id;

  const { data: employee } = employeeId
    ? await supabase
        .from("employees")
        .select(
          "full_name, designation, employment_start_date, residency_status, bank_name, bank_account_number, mobile_number"
        )
        .eq("id", employeeId)
        .maybeSingle()
    : { data: null };

  function Row({ label, value }: { label: string; value: string | null | undefined }) {
    if (!value) return null;
    return (
      <div className="flex items-start justify-between gap-3 border-t border-black/5 px-4 py-3">
        <span className="text-sm text-foreground/60">{label}</span>
        <span className="text-right text-sm font-medium text-foreground">{value}</span>
      </div>
    );
  }

  return (
    <>
      <Header titleKey="profile.title" />
      <main className="flex-1 px-4 py-6">
        {!employee ? (
          <p className="text-sm text-foreground/60">No employee record linked to your account.</p>
        ) : (
          <>
            <div className="mb-4 overflow-hidden rounded-xl bg-white shadow-sm">
              <div className="px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40">
                  Employment
                </p>
              </div>
              <Row label="Full Name" value={employee.full_name} />
              <Row label="Designation" value={employee.designation} />
              <Row label="Start Date" value={employee.employment_start_date} />
              <Row
                label="Residency"
                value={residencyLabel[employee.residency_status as ResidencyStatus]}
              />
              <Row label="Mobile" value={employee.mobile_number} />
            </div>

            {(employee.bank_name || employee.bank_account_number) && (
              <div className="mb-4 overflow-hidden rounded-xl bg-white shadow-sm">
                <div className="px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40">
                    Bank Info
                  </p>
                </div>
                <Row label="Bank" value={employee.bank_name} />
                <Row label="Account No." value={employee.bank_account_number} />
              </div>
            )}

            <div className="overflow-hidden rounded-xl bg-white shadow-sm">
              <Link
                href="/employee/documents"
                className="flex items-center justify-between px-4 py-4"
              >
                <span className="text-base font-medium text-foreground">My Documents</span>
                <span className="text-foreground/40">›</span>
              </Link>
            </div>
          </>
        )}
      </main>
    </>
  );
}
