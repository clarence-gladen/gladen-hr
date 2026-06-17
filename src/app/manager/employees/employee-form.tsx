"use client";

import { useActionState } from "react";
import { Header } from "@/components/header";
import { useLanguage } from "@/lib/i18n/language-provider";
import type { ResidencyStatus, SkillLevel } from "@/lib/types/database";

export interface EmployeeFormState {
  error?: string;
}

export interface EmployeeFormDefaults {
  fullName: string;
  nric: string;
  dateOfBirth: string;
  mobileNumber: string;
  residencyStatus: ResidencyStatus;
  designation: string;
  employmentStartDate: string;
  baseSalary: string;
  skillLevel: SkillLevel;
  bankName: string;
  bankAccountNumber: string;
  workDaysPerWeek: 5 | 6;
}

const EMPTY_DEFAULTS: EmployeeFormDefaults = {
  fullName: "",
  nric: "",
  dateOfBirth: "",
  mobileNumber: "",
  residencyStatus: "citizen",
  designation: "",
  employmentStartDate: "",
  baseSalary: "",
  skillLevel: "basic_skilled",
  bankName: "",
  bankAccountNumber: "",
  workDaysPerWeek: 5,
};

const inputClass =
  "w-full rounded-lg border border-black/10 bg-white px-4 py-3 text-base focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";
const labelClass = "mb-1 block text-sm font-medium text-foreground";

export function EmployeeForm({
  titleKey,
  action,
  defaultValues = EMPTY_DEFAULTS,
  isEdit = false,
}: {
  titleKey: string;
  action: (
    state: EmployeeFormState,
    formData: FormData
  ) => Promise<EmployeeFormState>;
  defaultValues?: EmployeeFormDefaults;
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
            <label className={labelClass} htmlFor="fullName">
              {t("employees.fullName")}
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              defaultValue={defaultValues.fullName}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="nric">
              {t("employees.nric")}
            </label>
            <input
              id="nric"
              name="nric"
              type="text"
              required={!isEdit}
              placeholder={isEdit ? "••••••••" : undefined}
              className={inputClass}
            />
            {isEdit && (
              <p className="mt-1 text-xs text-foreground/60">
                {t("employees.nricHint")}
              </p>
            )}
          </div>

          <div>
            <label className={labelClass} htmlFor="dateOfBirth">
              {t("employees.dateOfBirth")}
            </label>
            <input
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              required
              defaultValue={defaultValues.dateOfBirth}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="mobileNumber">
              {t("employees.mobileNumber")}
            </label>
            <div className="flex items-center rounded-lg border border-black/10 bg-white focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
              <span className="pl-4 pr-2 text-base text-foreground/60">+65</span>
              <input
                id="mobileNumber"
                name="mobileNumber"
                type="tel"
                inputMode="numeric"
                required
                placeholder="9123 4567"
                defaultValue={defaultValues.mobileNumber}
                className="w-full bg-transparent py-3 pr-4 text-base focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="residencyStatus">
              {t("employees.residencyStatus")}
            </label>
            <select
              id="residencyStatus"
              name="residencyStatus"
              defaultValue={defaultValues.residencyStatus}
              className={inputClass}
            >
              <option value="citizen">{t("employees.citizen")}</option>
              <option value="pr">{t("employees.pr")}</option>
              <option value="work_permit">{t("employees.workPermit")}</option>
              <option value="s_pass">{t("employees.sPass")}</option>
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="skillLevel">
              {t("employees.skillLevel")}
            </label>
            <select
              id="skillLevel"
              name="skillLevel"
              defaultValue={defaultValues.skillLevel}
              className={inputClass}
            >
              <option value="basic_skilled">{t("employees.basicSkilled")}</option>
              <option value="higher_skilled">{t("employees.higherSkilled")}</option>
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="workDaysPerWeek">
              {t("employees.workSchedule")}
            </label>
            <select
              id="workDaysPerWeek"
              name="workDaysPerWeek"
              defaultValue={defaultValues.workDaysPerWeek}
              className={inputClass}
            >
              <option value={5}>{t("employees.fiveDays")}</option>
              <option value={6}>{t("employees.sixDays")}</option>
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="designation">
              {t("employees.designation")}
            </label>
            <input
              id="designation"
              name="designation"
              type="text"
              defaultValue={defaultValues.designation}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="employmentStartDate">
              {t("employees.employmentStartDate")}
            </label>
            <input
              id="employmentStartDate"
              name="employmentStartDate"
              type="date"
              required
              defaultValue={defaultValues.employmentStartDate}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="baseSalary">
              {t("employees.baseSalary")}
            </label>
            <input
              id="baseSalary"
              name="baseSalary"
              type="number"
              step="0.01"
              min="0"
              defaultValue={defaultValues.baseSalary}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="bankName">
              {t("employees.bankName")}
            </label>
            <input
              id="bankName"
              name="bankName"
              type="text"
              defaultValue={defaultValues.bankName}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="bankAccountNumber">
              {t("employees.bankAccountNumber")}
            </label>
            <input
              id="bankAccountNumber"
              name="bankAccountNumber"
              type="text"
              defaultValue={defaultValues.bankAccountNumber}
              className={inputClass}
            />
          </div>

          {state.error && <p className="text-sm text-red-600">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-brand py-3 text-base font-semibold text-white transition disabled:opacity-60"
          >
            {pending ? t("common.loading") : t("employees.saveEmployee")}
          </button>
        </form>
      </main>
    </>
  );
}
