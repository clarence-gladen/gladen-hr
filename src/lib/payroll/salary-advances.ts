import type { SupabaseClient } from "@supabase/supabase-js";

export interface OutstandingAdvance {
  id: string;
  employee_id: string;
  amount: number;
  repayment_amount_per_month: number | null;
  outstanding: number;
}

/**
 * Approved salary advances that still have a balance owing, oldest first
 * (so repayments are applied to the earliest advance first).
 */
export async function getOutstandingAdvances(
  supabase: SupabaseClient
): Promise<OutstandingAdvance[]> {
  const { data, error } = await supabase
    .from("salary_advances")
    .select("id, employee_id, amount, repayment_amount_per_month, created_at, salary_advance_repayments(amount)")
    .eq("status", "approved")
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? [])
    .map((advance) => {
      const repayments = Array.isArray(advance.salary_advance_repayments)
        ? advance.salary_advance_repayments
        : [];
      const repaid = repayments.reduce((sum, r) => sum + Number(r.amount), 0);
      const outstanding = Number(advance.amount) - repaid;
      return {
        id: advance.id,
        employee_id: advance.employee_id,
        amount: Number(advance.amount),
        repayment_amount_per_month:
          advance.repayment_amount_per_month != null
            ? Number(advance.repayment_amount_per_month)
            : null,
        outstanding,
      };
    })
    .filter((advance) => advance.outstanding > 0.001);
}

/** The deduction to suggest for a single payroll run for this advance. */
export function suggestedDeduction(advance: OutstandingAdvance): number {
  const monthly = advance.repayment_amount_per_month;
  if (monthly == null || monthly <= 0) return advance.outstanding;
  return Math.min(monthly, advance.outstanding);
}

/**
 * Allocates a payslip's salary advance deduction across an employee's
 * outstanding advances (oldest first) and records the repayments.
 */
export async function recordRepayments(
  supabase: SupabaseClient,
  payslipId: string,
  employeeAdvances: OutstandingAdvance[],
  deductionAmount: number
): Promise<void> {
  let remaining = deductionAmount;
  const rows: { salary_advance_id: string; payslip_id: string; amount: number }[] = [];

  for (const advance of employeeAdvances) {
    if (remaining <= 0.001) break;
    const portion = Math.min(advance.outstanding, remaining);
    if (portion <= 0.001) continue;
    rows.push({
      salary_advance_id: advance.id,
      payslip_id: payslipId,
      amount: portion,
    });
    remaining -= portion;
  }

  if (rows.length > 0) {
    await supabase.from("salary_advance_repayments").insert(rows);
  }
}
