"use client";

import Link from "next/link";
import { Header } from "@/components/header";
import { useLanguage } from "@/lib/i18n/language-provider";
import type { ContractStatus } from "@/lib/types/database";

export interface ContractRow {
  id: string;
  client_name: string;
  site_name: string;
  monthly_value: number;
  status: ContractStatus;
}

export function ContractsListClient({ contracts }: { contracts: ContractRow[] }) {
  const { t } = useLanguage();

  const statusLabel: Record<ContractStatus, string> = {
    active: t("contracts.active"),
    completed: t("contracts.completed"),
    terminated: t("contracts.terminated"),
  };

  return (
    <>
      <Header titleKey="contracts.title" />
      <main className="flex-1 px-4 py-6">
        <Link
          href="/manager/contracts/new"
          className="mb-4 block rounded-lg bg-brand py-3 text-center text-base font-semibold text-white"
        >
          {t("contracts.addContract")}
        </Link>

        {contracts.length === 0 ? (
          <p className="text-center text-sm text-foreground/60">{t("contracts.noContracts")}</p>
        ) : (
          <ul className="space-y-3">
            {contracts.map((contract) => (
              <li key={contract.id} className="rounded-xl bg-white p-4 shadow-sm">
                <Link href={`/manager/contracts/${contract.id}`} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{contract.client_name}</p>
                    <p className="mt-1 text-sm text-foreground/60">{contract.site_name}</p>
                    <p className="mt-1 text-sm text-foreground/60">
                      S${Number(contract.monthly_value).toFixed(2)} / mo
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                      contract.status === "active"
                        ? "bg-brand-surface text-brand"
                        : "bg-black/5 text-foreground/60"
                    }`}
                  >
                    {statusLabel[contract.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
