import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdvanceDetailClient } from "./advance-detail-client";

export default async function AdvanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: advance } = await supabase
    .from("salary_advances")
    .select(
      "id, employee_id, amount, repayment_amount_per_month, status, notes, created_at, employees(full_name), salary_advance_repayments(id, amount, created_at)"
    )
    .eq("id", id)
    .maybeSingle();

  if (!advance) notFound();

  const repayments = Array.isArray(advance.salary_advance_repayments)
    ? advance.salary_advance_repayments
    : [];
  const totalRepaid = repayments.reduce((sum, r) => sum + Number(r.amount), 0);
  const outstanding = Number(advance.amount) - totalRepaid;

  const emp = Array.isArray(advance.employees) ? advance.employees[0] : advance.employees;

  return (
    <AdvanceDetailClient
      advance={{
        id: advance.id,
        employeeName: emp?.full_name ?? "—",
        amount: Number(advance.amount),
        repayment_amount_per_month:
          advance.repayment_amount_per_month != null
            ? Number(advance.repayment_amount_per_month)
            : null,
        status: advance.status,
        notes: advance.notes ?? "",
        created_at: advance.created_at,
        outstanding,
        repayments: repayments.map((r) => ({
          id: r.id,
          amount: Number(r.amount),
          created_at: r.created_at,
        })),
      }}
    />
  );
}
