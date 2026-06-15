"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/i18n/language-provider";

export type NavItem = {
  href: string;
  labelKey: string;
  icon: string;
};

export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-black/5 bg-white pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/manager" &&
              item.href !== "/employee" &&
              pathname.startsWith(item.href));

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-1 py-2 text-xs ${
                  active ? "text-brand font-semibold" : "text-foreground/50"
                }`}
              >
                <span className="text-xl" aria-hidden="true">
                  {item.icon}
                </span>
                {t(item.labelKey)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
