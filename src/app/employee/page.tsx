"use client";

import { Header } from "@/components/header";
import { useLanguage } from "@/lib/i18n/language-provider";

const summaryCards = [
  { labelKey: "summary.leaveBalance", value: "7 days" },
  { labelKey: "summary.sickBalance", value: "14 days" },
  { labelKey: "summary.hospitalizationBalance", value: "60 days" },
  { labelKey: "summary.unreadAnnouncements", value: "0" },
];

export default function EmployeeDashboardPage() {
  const { t } = useLanguage();

  return (
    <>
      <Header titleKey="dashboard.employeeTitle" />
      <main className="flex-1 px-4 py-6">
        <div className="grid grid-cols-2 gap-4">
          {summaryCards.map((card) => (
            <div
              key={card.labelKey}
              className="rounded-xl bg-white p-4 shadow-sm"
            >
              <p className="text-2xl font-semibold text-brand">
                {card.value}
              </p>
              <p className="mt-1 text-sm text-foreground/60">
                {t(card.labelKey)}
              </p>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
