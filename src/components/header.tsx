"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/language-provider";
import { LanguageToggle } from "@/components/language-toggle";

export function Header({ titleKey }: { titleKey: string }) {
  const router = useRouter();
  const { t } = useLanguage();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-black/5 bg-brand px-4 py-3 text-white">
      <h1 className="text-lg font-semibold">{t(titleKey)}</h1>
      <div className="flex items-center gap-3">
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
