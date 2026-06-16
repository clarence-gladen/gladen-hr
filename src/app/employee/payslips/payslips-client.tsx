"use client";

import Link from "next/link";
import { Header } from "@/components/header";
import { useLanguage } from "@/lib/i18n/language-provider";

export interface PayslipRow {
  id: string;
  net_pay: number;
  label: string;
  periodRange: string | null;
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
            {payslips.map((slip) => (
              <li key={slip.id}>
                <Link
                  href={`/employee/payslips/${slip.id}`}
                  className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm"
                >
                  <div>
                    <p className="font-semibold text-foreground">{slip.label}</p>
                    {slip.periodRange && (
                      <p className="text-xs text-foreground/50">{slip.periodRange}</p>
                    )}
                    <p className="mt-1 text-sm text-foreground/60">
                      {t("payroll.netPay")}: S${slip.net_pay.toFixed(2)}
                    </p>
                  </div>
                  <span className="text-foreground/40">›</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
