import { OT_PERIOD_PRESETS, OT_PERIOD_OTHER } from "./periods";

export type OtFormValues = {
  employee_id: string;
  contract_id: string;
  work_date: string;
  period: string;
  hours: number | null;
  comment: string | null;
};

function parsePeriod(
  formData: FormData
): { error?: string; period?: string; hours?: number | null } {
  const periodChoice = String(formData.get("period") ?? "");
  if (!periodChoice) return { error: "Please choose an OT period." };

  if (periodChoice === OT_PERIOD_OTHER) {
    const period = String(formData.get("customPeriod") ?? "").trim();
    if (!period) return { error: "Please describe the OT period." };
    const rawHours = String(formData.get("customHours") ?? "").trim();
    const hours = rawHours ? Number(rawHours) : null;
    if (hours !== null && (isNaN(hours) || hours <= 0 || hours > 24)) {
      return { error: "Hours must be between 0 and 24." };
    }
    return { period, hours };
  }

  const preset = OT_PERIOD_PRESETS.find((p) => p.value === periodChoice);
  if (!preset) return { error: "Invalid OT period." };
  return { period: preset.value, hours: preset.hours };
}

// Supervisor form: the employee select encodes "employeeId|contractId" so one
// pick carries both the worker and the site.
export function parseOtForm(formData: FormData): { error?: string; values?: OtFormValues } {
  const employeeValue = String(formData.get("employee") ?? "");
  const [employeeId, contractId] = employeeValue.split("|");
  const workDate = String(formData.get("workDate") ?? "");
  const comment = (formData.get("comment") as string | null)?.trim() || null;

  if (!employeeId || !contractId) return { error: "Please select an employee." };
  if (!workDate) return { error: "Please choose a date." };

  const parsed = parsePeriod(formData);
  if (parsed.error) return { error: parsed.error };

  return {
    values: {
      employee_id: employeeId,
      contract_id: contractId,
      work_date: workDate,
      period: parsed.period!,
      hours: parsed.hours ?? null,
      comment,
    },
  };
}

export type ManagerOtFormValues = Omit<OtFormValues, "contract_id"> & {
  contract_id: string | null;
};

// Manager form: employee and site are separate selects; site is optional.
export function parseManagerOtForm(
  formData: FormData
): { error?: string; values?: ManagerOtFormValues } {
  const employeeId = String(formData.get("employeeId") ?? "");
  const contractId = String(formData.get("contractId") ?? "") || null;
  const workDate = String(formData.get("workDate") ?? "");
  const comment = (formData.get("comment") as string | null)?.trim() || null;

  if (!employeeId) return { error: "Please select an employee." };
  if (!workDate) return { error: "Please choose a date." };

  const parsed = parsePeriod(formData);
  if (parsed.error) return { error: parsed.error };

  return {
    values: {
      employee_id: employeeId,
      contract_id: contractId,
      work_date: workDate,
      period: parsed.period!,
      hours: parsed.hours ?? null,
      comment,
    },
  };
}
