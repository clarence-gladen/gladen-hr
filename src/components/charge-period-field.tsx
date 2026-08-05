"use client";

/**
 * Manager-only radio group (form field name: "annualChargeOffset") to choose which
 * employment period an annual leave is deducted from. Entitlement never changes —
 * only which year's `used` bucket the leave counts against.
 *   0  = current period (default)
 *  -1  = previous period
 *  +1  = upcoming period
 */
export function ChargePeriodField({ defaultOffset = 0 }: { defaultOffset?: number }) {
  const options: { value: number; label: string }[] = [
    { value: 0, label: "Current period (default)" },
    { value: -1, label: "Previous period" },
    { value: 1, label: "Upcoming period" },
  ];
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-foreground">
        Charge annual leave to
      </label>
      <div className="flex flex-col gap-1.5">
        {options.map((o) => (
          <label key={o.value} className="flex items-center gap-2 text-sm text-foreground/80">
            <input
              type="radio"
              name="annualChargeOffset"
              value={o.value}
              defaultChecked={o.value === defaultOffset}
              className="h-4 w-4 accent-brand"
            />
            {o.label}
          </label>
        ))}
      </div>
      <p className="mt-1 text-xs text-foreground/40">
        Entitlement stays the same — this only changes which employment period the leave is deducted from.
      </p>
    </div>
  );
}

/** Short tag text for a leave charged to a non-current period, or null. */
export function chargePeriodTag(offset: number | null | undefined): string | null {
  if (offset === -1) return "Charged to previous period";
  if (offset === 1) return "Charged to upcoming period";
  return null;
}
