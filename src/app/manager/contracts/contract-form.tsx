"use client";

import { useActionState } from "react";
import { Header } from "@/components/header";
import { useLanguage } from "@/lib/i18n/language-provider";
import type { ContractStatus } from "@/lib/types/database";

export interface ContractFormState {
  error?: string;
}

export interface ContractFormDefaults {
  clientName: string;
  siteName: string;
  startDate: string;
  endDate: string;
  monthlyValue: string;
  status: ContractStatus;
}

const EMPTY_DEFAULTS: ContractFormDefaults = {
  clientName: "",
  siteName: "",
  startDate: "",
  endDate: "",
  monthlyValue: "",
  status: "active",
};

const inputClass =
  "w-full rounded-lg border border-black/10 bg-white px-4 py-3 text-base focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";
const labelClass = "mb-1 block text-sm font-medium text-foreground";

export function ContractForm({
  titleKey,
  action,
  defaultValues = EMPTY_DEFAULTS,
  isEdit = false,
}: {
  titleKey: string;
  action: (state: ContractFormState, formData: FormData) => Promise<ContractFormState>;
  defaultValues?: ContractFormDefaults;
  isEdit?: boolean;
}) {
  const { t } = useLanguage();
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <>
      <Header titleKey={titleKey} />
      <main className="flex-1 px-4 py-6">
        <form action={formAction} className="space-y-4">
          <div>
            <label className={labelClass} htmlFor="clientName">
              {t("contracts.clientName")}
            </label>
            <input
              id="clientName"
              name="clientName"
              type="text"
              required
              defaultValue={defaultValues.clientName}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="siteName">
              {t("contracts.siteName")}
            </label>
            <input
              id="siteName"
              name="siteName"
              type="text"
              required
              defaultValue={defaultValues.siteName}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="startDate">
              {t("contracts.startDate")}
            </label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              required
              defaultValue={defaultValues.startDate}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="endDate">
              {t("contracts.endDate")}
            </label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              defaultValue={defaultValues.endDate}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="monthlyValue">
              {t("contracts.monthlyValue")}
            </label>
            <input
              id="monthlyValue"
              name="monthlyValue"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={defaultValues.monthlyValue}
              className={inputClass}
            />
          </div>

          {isEdit && (
            <div>
              <label className={labelClass} htmlFor="status">
                {t("contracts.status")}
              </label>
              <select
                id="status"
                name="status"
                defaultValue={defaultValues.status}
                className={inputClass}
              >
                <option value="active">{t("contracts.active")}</option>
                <option value="completed">{t("contracts.completed")}</option>
                <option value="terminated">{t("contracts.terminated")}</option>
              </select>
            </div>
          )}

          {state.error && <p className="text-sm text-red-600">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-brand py-3 text-base font-semibold text-white transition disabled:opacity-60"
          >
            {pending ? t("common.loading") : t("contracts.saveContract")}
          </button>
        </form>
      </main>
    </>
  );
}
