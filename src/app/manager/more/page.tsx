"use client";

import Link from "next/link";
import { Header } from "@/components/header";
import { useLanguage } from "@/lib/i18n/language-provider";

const links = [
  { href: "/manager/contracts", labelKey: "more.contracts", icon: "📑" },
  { href: "/manager/announcements", labelKey: "more.announcements", icon: "🔔" },
  { href: "/manager/salary-advances", labelKey: "more.salaryAdvances", icon: "💵" },
  { href: "/manager/overtime", labelKey: "more.overtime", icon: "⏰" },
  { href: "/manager/rates", labelKey: "more.rates", icon: "⚙️" },
  { href: "/manager/more/access", labelKey: "more.manageAccess", icon: "🔑" },
];

export default function ManagerMorePage() {
  const { t } = useLanguage();

  return (
    <>
      <Header titleKey="more.managerTitle" />
      <main className="flex-1 px-4 py-6">
        <ul className="overflow-hidden rounded-xl bg-white shadow-sm">
          {links.map((link, i) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`flex items-center gap-3 px-4 py-4 ${
                  i !== links.length - 1 ? "border-b border-black/5" : ""
                }`}
              >
                <span className="text-xl" aria-hidden="true">
                  {link.icon}
                </span>
                <span className="text-base">{t(link.labelKey)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
