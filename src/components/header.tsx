"use client";

import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/language-provider";
import { LanguageToggle } from "@/components/language-toggle";
import { NotificationBell } from "@/components/notification-bell";

export function Header({
  titleKey,
  title,
}: {
  titleKey?: string;
  title?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const isManager = pathname.startsWith("/manager");
  const notifHref = isManager ? "/manager/notifications" : "/employee/notifications";

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-black/5 bg-brand px-4 py-3 text-white">
      <h1 className="text-lg font-semibold">{title ?? (titleKey ? t(titleKey) : "")}</h1>
      <div className="flex items-center gap-3">
        <NotificationBell href={notifHref} />
        <LanguageToggle variant="light" />
        <button
          type="button"
          onClick={handleSignOut}
          className="text-sm font-medium text-white/80"
        >
          {t("common.signOut")}
        </button>
      </div>
    </header>
  );
}
