"use client";

import Link from "next/link";
import { Header } from "@/components/header";
import { useLanguage } from "@/lib/i18n/language-provider";

interface Tile {
  href: string;
  icon: string;
  labelKey: string;
  /** Subtitle shown under the label. Replaced by `countKey` when a count exists. */
  descKey: string;
  /** Subtitle used instead of descKey when `count` is above zero, e.g. "2 pending". */
  countKey?: string;
  /** Which badge count from the server applies to this tile. */
  countName?: "onSite" | "pendingAdvances";
  /** Rarely-used destinations sit quieter than daily ones. */
  quiet?: boolean;
}

interface Group {
  labelKey: string;
  tiles: Tile[];
}

const GROUPS: Group[] = [
  {
    labelKey: "more.groupSiteOps",
    tiles: [
      { href: "/manager/contracts", icon: "📑", labelKey: "more.contractsShort", descKey: "more.contractsDesc" },
      {
        href: "/manager/attendance",
        icon: "📍",
        labelKey: "more.attendance",
        descKey: "more.attendanceDesc",
        countKey: "more.attendanceOnSite",
        countName: "onSite",
      },
      { href: "/manager/checklists", icon: "✅", labelKey: "more.checklists", descKey: "more.checklistsDesc" },
      { href: "/manager/reports", icon: "📄", labelKey: "more.reports", descKey: "more.reportsDesc" },
    ],
  },
  {
    labelKey: "more.groupPeoplePay",
    tiles: [
      {
        href: "/manager/salary-advances",
        icon: "💵",
        labelKey: "more.salaryAdvances",
        descKey: "more.salaryAdvancesDesc",
        countKey: "more.salaryAdvancesPending",
        countName: "pendingAdvances",
      },
      { href: "/manager/overtime", icon: "⏰", labelKey: "more.overtime", descKey: "more.overtimeDesc" },
      { href: "/manager/announcements", icon: "🔔", labelKey: "more.announcements", descKey: "more.announcementsDesc" },
      { href: "/manager/supervisors", icon: "🦺", labelKey: "more.supervisors", descKey: "more.supervisorsDesc" },
    ],
  },
  {
    labelKey: "more.groupSettings",
    tiles: [
      { href: "/manager/rates", icon: "⚙️", labelKey: "more.ratesShort", descKey: "more.ratesDesc", quiet: true },
      { href: "/manager/more/access", icon: "🔑", labelKey: "more.manageAccess", descKey: "more.manageAccessDesc", quiet: true },
    ],
  },
];

export interface MoreCounts {
  onSite: number;
  pendingAdvances: number;
}

export function ManagerMoreClient({ counts }: { counts: MoreCounts }) {
  const { t } = useLanguage();

  return (
    <>
      <Header titleKey="more.managerTitle" />
      <main className="flex-1 px-4 py-5">
        <div className="flex flex-col gap-5">
          {GROUPS.map((group) => (
            <section key={group.labelKey}>
              <h2 className="g-label mb-2">{t(group.labelKey)}</h2>
              <div className="grid grid-cols-2 gap-2.5">
                {group.tiles.map((tile) => {
                  const count = tile.countName ? counts[tile.countName] : 0;
                  const subtitle =
                    count > 0 && tile.countKey ? t(tile.countKey, { n: count }) : t(tile.descKey);

                  return (
                    <Link
                      key={tile.href}
                      href={tile.href}
                      className={`g-tile ${tile.quiet ? "bg-[#fbfcfd]" : ""}`}
                    >
                      {count > 0 && (
                        <span className="g-num absolute right-2.5 top-2.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-attention px-1.5 text-[11px] font-semibold text-white">
                          {count}
                        </span>
                      )}
                      <span className="text-[21px] leading-none" aria-hidden="true">
                        {tile.icon}
                      </span>
                      <span className="block">
                        <span className="block text-[13.5px] font-semibold leading-tight tracking-[-0.01em]">
                          {t(tile.labelKey)}
                        </span>
                        <span className="mt-0.5 block text-[11.5px] leading-snug text-muted">
                          {subtitle}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
