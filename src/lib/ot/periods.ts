// Preset OT periods. `value` is what gets stored in ot_entries.period;
// labels are translated via the labelKey.
export const OT_PERIOD_PRESETS = [
  { value: "7am – 3pm", labelKey: "ot.period7to3", hours: 8 },
  { value: "7am – 7pm", labelKey: "ot.period7to7", hours: 12 },
  { value: "7am – 11am", labelKey: "ot.period7to11", hours: 4 },
] as const;

export const OT_PERIOD_OTHER = "__other__";

export function periodLabel(period: string, t: (key: string) => string): string {
  const preset = OT_PERIOD_PRESETS.find((p) => p.value === period);
  return preset ? t(preset.labelKey) : period;
}
