"use client";

import Link from "next/link";
import { Header } from "@/components/header";
import { useLanguage } from "@/lib/i18n/language-provider";

export interface PayslipRow {
  id: string;
  net_pay: number;
  month: number | null;
  year: number | null;
}

function formatPeriod(month: number, year: number): { label: string; range: string } {
  const label = new Date(year, month - 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const lastDay = new Date(year, month, 0).getDate();
  const start = new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const end = new Date(year, month - 1, lastDay).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return { label, range: `${start} – ${end}` };
}

export function PayslipsClient({ payslips }: { payslips: PayslipRow[] }) {
  const { t } = useLanguage();

  return (
    <>
      <Header titleKey="payslips.title" />
      <main className="flex-1 px-4 py-6">
        {payslips.length === 0 ? (
          <p className="text-center text-sm text-foreground/60">{t("payslips.noPayslips")}</p>
        ) : (
          <ul className="space-y-3">
            {payslips.map((slip) => {
              const period =
                slip.month && slip.year ? formatPeriod(slip.month, slip.year) : null;
              return (
                <li key={slip.id}>
                  <Link
                    href={`/employee/payslips/${slip.id}`}
                    className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm"
                  >
                    <div>
                      <p className="font-semibold text-foreground">
                        {period?.label ?? "—"}
                      </p>
                      {period && (
                        <p className="text-xs text-foreground/50">{period.range}</p>
                      )}
                      <p className="mt-1 text-sm text-foreground/60">
                        {t("payroll.netPay")}: S${slip.net_pay.toFixed(2)}
                      </p>
                    </div>
                    <span className="text-foreground/40">›</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
