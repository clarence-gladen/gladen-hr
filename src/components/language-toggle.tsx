"use client";

import { useLanguage } from "@/lib/i18n/language-provider";

export function LanguageToggle({
  variant = "dark",
}: {
  variant?: "dark" | "light";
}) {
  const { locale, setLocale } = useLanguage();

  const styles =
    variant === "light"
      ? "border-white/30 text-white"
      : "border-brand/20 text-brand";

  return (
    <button
      type="button"
      onClick={() => setLocale(locale === "en" ? "zh" : "en")}
      className={`rounded-full border px-3 py-1 text-sm font-medium ${styles}`}
      aria-label="Toggle language"
    >
      {locale === "en" ? "中文" : "EN"}
    </button>
  );
}
