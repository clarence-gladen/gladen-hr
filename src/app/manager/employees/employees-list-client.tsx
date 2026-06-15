"use client";

import Link from "next/link";
import { useTransition } from "react";
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
}

export function EmployeesListClient({ employees }: { employees: EmployeeRow[] }) {
  const { t } = useLanguage();
  const [isPending, startTransition] = useTransition();

  const residencyLabel: Record<ResidencyStatus, string> = {
    citizen: t("employees.citizen"),
    pr: t("employees.pr"),
    work_permit: t("employees.workPermit"),
    s_pass: t("employees.sPass"),
  };

  function toggleStatus(id: string, current: EmployeeStatus) {
    const next: EmployeeStatus = current === "active" ? "inactive" : "active";
    startTransition(() => {
      setEmployeeStatusAction(id, next);
    });
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

        {employees.length === 0 ? (
          <p className="text-center text-sm text-foreground/60">
            {t("employees.noEmployees")}
          </p>
        ) : (
          <ul className="space-y-3">
            {employees.map((employee) => (
              <li key={employee.id} className="rounded-xl bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/manager/employees/${employee.id}`}
                      className="font-semibold text-foreground"
                    >
                      {employee.full_name}
                    </Link>
                    <p className="mt-1 text-sm text-foreground/60">
                      {employee.designation || "—"} ·{" "}
                      {residencyLabel[employee.residency_status]}
                    </p>
                    <p className="mt-1 text-sm text-foreground/60">
                      +{employee.mobile_number} · NRIC •••{employee.nric_last4}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => toggleStatus(employee.id, employee.status)}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                      employee.status === "active"
                        ? "bg-brand-surface text-brand"
                        : "bg-black/5 text-foreground/60"
                    }`}
                  >
                    {employee.status === "active"
                      ? t("employees.deactivate")
                      : t("employees.activate")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
