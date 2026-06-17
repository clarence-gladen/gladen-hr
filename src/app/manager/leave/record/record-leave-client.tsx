"use client";

import { useActionState } from "react";
import { Header } from "@/components/header";
import { useLanguage } from "@/lib/i18n/language-provider";
import { createLeaveForEmployeeAction } from "../actions";

const inputClass =
  "w-full rounded-lg border border-black/10 bg-white px-4 py-3 text-base focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";
const labelClass = "mb-1 block text-sm font-medium text-foreground";

export function RecordLeaveClient({
  employees,
}: {
  employees: { id: string; full_name: string }[];
}) {
  const { t } = useLanguage();
  const [state, formAction, pending] = useActionState(createLeaveForEmployeeAction, {});

  return (
    <>
      <Header titleKey="leave.recordLeaveTitle" />
      <main className="flex-1 px-4 py-6">
        <p className="mb-4 text-sm text-foreground/60">
          {t("leave.recordLeaveHint")}
        </p>
        <form action={formAction} className="space-y-4 rounded-xl bg-white p-4 shadow-sm">
          <div>
            <label className={labelClass} htmlFor="employeeId">
              {t("employees.title")}
            </label>
            <select id="employeeId" name="employeeId" required className={inputClass} defaultValue="">
              <option value="" disabled>{t("leave.selectEmployee")}</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.full_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="leaveType">
              {t("leave.leaveType")}
            </label>
            <select id="leaveType" name="leaveType" required className={inputClass} defaultValue="">
              <option value="" disabled>{t("leave.leaveType")}</option>
              <option value="annual">{t("leave.annual")}</option>
              <option value="sick">{t("leave.sick")}</option>
              <option value="hospitalization">{t("leave.hospitalization")}</option>
              <option value="no_pay">{t("leave.noPay")}</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="startDate">
                {t("leave.startDate")}
              </label>
              <input id="startDate" name="startDate" type="date" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="endDate">
                {t("leave.endDate")}
              </label>
              <input id="endDate" name="endDate" type="date" required className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="reason">
              {t("leave.reason")}
            </label>
            <textarea id="reason" name="reason" rows={2} className={inputClass} />
          </div>

          {state.error && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-brand py-3 text-base font-semibold text-white transition disabled:opacity-60"
          >
            {pending ? t("common.loading") : t("leave.recordLeaveSubmit")}
          </button>
        </form>
      </main>
    </>
  );
}
