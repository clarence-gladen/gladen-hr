"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Header } from "@/components/header";
import { useLanguage } from "@/lib/i18n/language-provider";
import { setEmployeeStatusAction } from "./actions";
import type { EmployeeStatus, ResidencyStatus } from "@/lib/types/database";

export interface EmployeeRow {
  id: string;
  full_name: string;
  nric_last4: string;
  mobile_number: string;
  residency_status: ResidencyStatus;
  designation: string | null;
  status: EmployeeStatus;
  employment_end_date: string | null;
}

function EmployeeCard({ employee, isPending, onToggle }: {
  employee: EmployeeRow;
  isPending: boolean;
  onToggle: () => void;
}) {
  const { t } = useLanguage();

  const residencyLabel: Record<ResidencyStatus, string> = {
    citizen: t("employees.citizen"),
    pr: t("employees.pr"),
    work_permit: t("employees.workPermit"),
    s_pass: t("employees.sPass"),
  };

  return (
    <li className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href={`/manager/employees/${employee.id}`} className="font-semibold text-foreground">
            {employee.full_name}
          </Link>
          <p className="mt-1 text-sm text-foreground/60">
            {employee.designation || "—"} · {residencyLabel[employee.residency_status]}
          </p>
          <p className="mt-1 text-sm text-foreground/60">
            +{employee.mobile_number} · NRIC •••{employee.nric_last4}
          </p>
          {employee.status === "inactive" && employee.employment_end_date && (
            <p className="mt-1 text-xs text-foreground/40">
              {t("employees.endedOn")} {employee.employment_end_date}
            </p>
          )}
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={onToggle}
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
            employee.status === "active"
              ? "bg-brand/10 text-brand"
              : "bg-black/5 text-foreground/60"
          }`}
        >
          {employee.status === "active" ? t("employees.deactivate") : t("employees.activate")}
        </button>
      </div>
    </li>
  );
}

export function EmployeesListClient({ employees }: { employees: EmployeeRow[] }) {
  const { t } = useLanguage();
  const [isPending, startTransition] = useTransition();
  const [showOffboarded, setShowOffboarded] = useState(false);

  const active = employees.filter((e) => e.status === "active");
  const offboarded = employees.filter((e) => e.status === "inactive");

  function toggleStatus(id: string, current: EmployeeStatus) {
    const next: EmployeeStatus = current === "active" ? "inactive" : "active";
    startTransition(() => { setEmployeeStatusAction(id, next); });
  }

  return (
    <>
      <Header titleKey="employees.title" />
      <main className="flex-1 px-4 py-6">
        <Link
          href="/manager/employees/new"
          className="mb-4 block rounded-lg bg-brand py-3 text-center text-base font-semibold text-white"
        >
          {t("employees.addEmployee")}
        </Link>

        {active.length === 0 ? (
          <p className="text-center text-sm text-foreground/60">{t("employees.noEmployees")}</p>
        ) : (
          <ul className="space-y-3">
            {active.map((employee) => (
              <EmployeeCard
                key={employee.id}
                employee={employee}
                isPending={isPending}
                onToggle={() => toggleStatus(employee.id, employee.status)}
              />
            ))}
          </ul>
        )}

        {offboarded.length > 0 && (
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setShowOffboarded((v) => !v)}
              className="flex w-full items-center justify-between rounded-xl bg-black/5 px-4 py-3"
            >
              <span className="text-sm font-semibold text-foreground/60">
                {t("employees.offboardedSection")} ({offboarded.length})
              </span>
              <span className="text-foreground/40">{showOffboarded ? "▲" : "▼"}</span>
            </button>

            {showOffboarded && (
              <ul className="mt-3 space-y-3">
                {offboarded.map((employee) => (
                  <EmployeeCard
                    key={employee.id}
                    employee={employee}
                    isPending={isPending}
                    onToggle={() => toggleStatus(employee.id, employee.status)}
                  />
                ))}
              </ul>
            )}
          </div>
        )}
      </main>
    </>
  );
}
