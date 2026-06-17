import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/header";
import { getCpfRates, getSdlConfig } from "@/lib/payroll/rates";

export const dynamic = "force-dynamic";

// Services sector FWL tier reference (MOM, effective current)
const FWL_SERVICES_WP = [
  { tier: "Tier 1", quota: "≤ 10% of workforce", higher: 300, basic: 450 },
  { tier: "Tier 2", quota: "> 10% – 25%",        higher: 400, basic: 600 },
  { tier: "Tier 3", quota: "> 25% – 35%",        higher: 600, basic: 800 },
];

function fmt(n: number) {
  return `$${n.toFixed(2).replace(/\.00$/, "")}`;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <h2 className="text-base font-bold text-foreground">{children}</h2>
      <div className="mt-1 h-0.5 w-12 rounded bg-brand" />
    </div>
  );
}

export default async function ManagerRatesPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [cpfRates, sdlConfig] = await Promise.all([
    getCpfRates(supabase, today),
    getSdlConfig(supabase, today),
  ]);

  const effectiveDate = cpfRates[0]?.effective_date
    ? new Date(cpfRates[0].effective_date).toLocaleDateString("en-SG", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const owCeiling = cpfRates[0]?.ow_ceiling ?? 8000;

  return (
    <div className="flex flex-col pb-8">
      <Header titleKey="more.rates" />

      <div className="flex flex-col gap-5 px-4 pt-4">

        {/* Effective date banner */}
        {effectiveDate && (
          <div className="flex items-center gap-2 rounded-xl bg-brand/10 px-4 py-2.5">
            <span className="text-xs text-brand/70">
              Rates effective from <span className="font-semibold text-brand">{effectiveDate}</span>.
              Verify against official sources before each payroll run.
            </span>
          </div>
        )}

        {/* ── CPF ─────────────────────────────────────────────────────── */}
        <div className="rounded-xl bg-white shadow-sm">
          <div className="border-b border-black/5 px-4 py-3">
            <SectionTitle>CPF Contributions — 公积金供款</SectionTitle>
            <p className="text-xs text-foreground/50">
              Applies to Singapore Citizens &amp; PRs only. Ordinary Wage (OW) ceiling:{" "}
              <span className="font-semibold text-foreground">${owCeiling.toLocaleString()}/month</span>
            </p>
          </div>

          {cpfRates.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/5 bg-brand/5 text-left text-xs text-foreground/50">
                    <th className="px-4 py-2.5 font-semibold">Age (last birthday)</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Employee</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Employer</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {cpfRates
                    .slice()
                    .sort((a, b) => a.age_from - b.age_from)
                    .map((r) => {
                      const ageLabel =
                        r.age_from === 0
                          ? "55 & below"
                          : r.age_to >= 150
                          ? `Above ${r.age_from - 1}`
                          : `Above ${r.age_from - 1} to ${r.age_to}`;
                      const total = r.employee_rate + r.employer_rate;
                      return (
                        <tr
                          key={`${r.age_from}-${r.age_to}`}
                          className="border-b border-black/5 last:border-0"
                        >
                          <td className="px-4 py-2.5 text-xs font-medium text-foreground">
                            {ageLabel}
                          </td>
                          <td className="px-4 py-2.5 text-right text-xs text-foreground">
                            {r.employee_rate}%
                          </td>
                          <td className="px-4 py-2.5 text-right text-xs text-foreground">
                            {r.employer_rate}%
                          </td>
                          <td className="px-4 py-2.5 text-right text-xs font-semibold text-brand">
                            {total}%
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-4 py-4 text-sm text-foreground/40">No CPF rates configured.</p>
          )}

          <div className="space-y-1.5 border-t border-black/5 px-4 py-3">
            <p className="text-xs text-foreground/50">
              <span className="font-medium text-foreground/70">Additional Wage (AW) Ceiling:</span>{" "}
              $102,000 minus total OW already subject to CPF in the same calendar year.
            </p>
            <p className="text-xs text-foreground/50">
              Employees earning $500–$750/month: employee contribution is graduated (phased in).
              No CPF required for wages below $500/month.
            </p>
          </div>
        </div>

        {/* ── FWL — Work Permit (Services sector) ─────────────────────── */}
        <div className="rounded-xl bg-white shadow-sm">
          <div className="border-b border-black/5 px-4 py-3">
            <SectionTitle>Foreign Worker Levy (FWL) — 外籍工人税</SectionTitle>
            <p className="text-xs text-foreground/50">
              Work Permit holders — Services sector. Tier depends on your company&apos;s
              foreign worker quota utilisation (max DRC: 35%).
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/5 bg-brand/5 text-left text-xs text-foreground/50">
                  <th className="px-4 py-2.5 font-semibold">Tier</th>
                  <th className="px-4 py-2.5 font-semibold">Quota range</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Higher-skilled (R1)</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Basic-skilled (R2)</th>
                </tr>
              </thead>
              <tbody>
                {FWL_SERVICES_WP.map((row) => (
                  <tr
                    key={row.tier}
                    className="border-b border-black/5 last:border-0"
                  >
                    <td className="px-4 py-2.5 text-xs font-semibold text-foreground">
                      {row.tier}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-foreground/60">{row.quota}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-foreground">${row.higher}/mo</td>
                    <td className="px-4 py-2.5 text-right text-xs font-semibold text-brand">
                      ${row.basic}/mo
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-1.5 border-t border-black/5 px-4 py-3">
            <p className="text-xs text-foreground/50">
              <span className="font-medium text-foreground/70">Higher-skilled (R1):</span>{" "}
              Worker holds relevant qualifications, certifications, or has met MOM's skill-upgrade criteria.
            </p>
            <p className="text-xs text-foreground/50">
              Your payroll system is configured with{" "}
              <span className="font-semibold text-foreground/70">Tier 1 rates</span> by default.
              Update the rate table in Supabase if your quota utilisation places you in Tier 2 or 3.
            </p>
            <p className="text-xs text-foreground/50">
              From 2028: Tier 1 and Tier 2 will merge ($300 higher-skilled / $600 basic-skilled).
            </p>
          </div>
        </div>

        {/* ── FWL — S Pass ─────────────────────────────────────────────── */}
        <div className="rounded-xl bg-white shadow-sm">
          <div className="border-b border-black/5 px-4 py-3">
            <SectionTitle>S Pass Levy — S准证税</SectionTitle>
            <p className="text-xs text-foreground/50">
              Harmonised to a single rate across all sectors and tiers from 1 September 2025.
            </p>
          </div>

          <div className="flex items-center justify-between px-4 py-4">
            <div>
              <p className="text-xs text-foreground/50">Monthly levy per S Pass holder</p>
              <p className="text-xs text-foreground/50 mt-0.5">Effective: 1 September 2025</p>
            </div>
            <p className="text-2xl font-bold text-brand">$650</p>
          </div>

          <div className="border-t border-black/5 px-4 py-3">
            <p className="text-xs text-foreground/50">
              S Pass quota for services sector: up to{" "}
              <span className="font-medium text-foreground/70">15%</span> of total workforce.
              Daily rate for partial months: <span className="font-medium text-foreground/70">$21.37/day</span>.
            </p>
          </div>
        </div>

        {/* ── SDL ──────────────────────────────────────────────────────── */}
        <div className="rounded-xl bg-white shadow-sm">
          <div className="border-b border-black/5 px-4 py-3">
            <SectionTitle>Skills Development Levy (SDL) — 技能发展税</SectionTitle>
            <p className="text-xs text-foreground/50">
              Payable on <span className="font-medium text-foreground/70">all employees</span>{" "}
              (local and foreign) every month.
            </p>
          </div>

          {sdlConfig ? (
            <>
              <div className="grid grid-cols-3 divide-x divide-black/5">
                <div className="px-4 py-4 text-center">
                  <p className="text-2xl font-bold text-brand">0.25%</p>
                  <p className="mt-0.5 text-xs text-foreground/50">of monthly wages</p>
                </div>
                <div className="px-4 py-4 text-center">
                  <p className="text-2xl font-bold text-brand">{fmt(sdlConfig.min_levy)}</p>
                  <p className="mt-0.5 text-xs text-foreground/50">
                    minimum
                    <br />
                    (wages &lt; ${sdlConfig.lower_wage_threshold.toLocaleString()})
                  </p>
                </div>
                <div className="px-4 py-4 text-center">
                  <p className="text-2xl font-bold text-brand">{fmt(sdlConfig.max_levy)}</p>
                  <p className="mt-0.5 text-xs text-foreground/50">
                    maximum
                    <br />
                    (wages &gt; ${sdlConfig.upper_wage_threshold.toLocaleString()})
                  </p>
                </div>
              </div>
              <div className="border-t border-black/5 px-4 py-3">
                <p className="text-xs text-foreground/50">
                  SDL funds SkillsFuture training grants. Payable via CPF Board alongside CPF
                  contributions. SDL applies even when no CPF is required (e.g. foreign workers).
                </p>
              </div>
            </>
          ) : (
            <p className="px-4 py-4 text-sm text-foreground/40">No SDL config found.</p>
          )}
        </div>

        {/* ── Sources ──────────────────────────────────────────────────── */}
        <div className="rounded-xl bg-white px-4 py-4 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground/40">
            Official Sources
          </p>
          <ul className="space-y-2">
            {[
              {
                label: "CPF contribution rates",
                url: "https://www.cpf.gov.sg/employer/employer-obligations/how-much-cpf-contributions-to-pay",
              },
              {
                label: "FWL — Services sector Work Permit",
                url: "https://www.mom.gov.sg/passes-and-permits/work-permit-for-foreign-worker/sector-specific-rules/services-sector-requirements",
              },
              {
                label: "FWL — S Pass levy rates",
                url: "https://www.mom.gov.sg/passes-and-permits/s-pass/quota-and-levy/levy-and-quota-requirements",
              },
              {
                label: "Skills Development Levy (SDL)",
                url: "https://skillsfuture.gobusiness.gov.sg/skills-development-levy",
              },
            ].map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-brand underline-offset-2 hover:underline"
                >
                  <span className="text-brand/40">↗</span>
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  );
}
