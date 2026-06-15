"use client";

import Link from "next/link";
import { Header } from "@/components/header";
import { useLanguage } from "@/lib/i18n/language-provider";

export default function EmployeeProfilePage() {
  const { t } = useLanguage();

  return (
    <>
      <Header titleKey="nav.profile" />
      <main className="flex-1 px-4 py-6">
        <ul className="overflow-hidden rounded-xl bg-white shadow-sm">
          <li>
            <Link
              href="/employee/documents"
              className="flex items-center gap-3 px-4 py-4"
            >
              <span className="text-xl" aria-hidden="true">
                📋
              </span>
              <span className="text-base">{t("nav.documents")}</span>
            </Link>
          </li>
        </ul>
      </main>
    </>
  );
}
