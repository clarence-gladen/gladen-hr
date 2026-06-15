"use client";

import { Header } from "@/components/header";
import { useLanguage } from "@/lib/i18n/language-provider";

export function PagePlaceholder({
  titleKey,
  descriptionKey,
}: {
  titleKey: string;
  descriptionKey: string;
}) {
  const { t } = useLanguage();

  return (
    <>
      <Header titleKey={titleKey} />
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="text-foreground/60">{t(descriptionKey)}</p>
      </main>
    </>
  );
}
