"use client";

import { useState, useTransition } from "react";
import { Header } from "@/components/header";
import { useLanguage } from "@/lib/i18n/language-provider";
import { markAnnouncementReadAction } from "./actions";
import { fmtTimestamp } from "@/lib/utils/date";

export interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  created_at: string;
  isRead: boolean;
}

export function AnnouncementsClient({
  announcements,
}: {
  announcements: AnnouncementRow[];
}) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpen(announcement: AnnouncementRow) {
    setExpanded(expanded === announcement.id ? null : announcement.id);
    if (!announcement.isRead) {
      startTransition(() => { markAnnouncementReadAction(announcement.id); });
    }
  }

  return (
    <>
      <Header titleKey="announcements.title" />
      <main className="flex-1 px-4 py-6">
        {announcements.length === 0 ? (
          <p className="text-center text-sm text-foreground/60">
            {t("announcements.noAnnouncements")}
          </p>
        ) : (
          <ul className="space-y-3">
            {announcements.map((item) => (
              <li key={item.id} className="rounded-xl bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => handleOpen(item)}
                  disabled={isPending}
                  className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left"
                >
                  <div className="flex items-start gap-2">
                    {!item.isRead && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
                    )}
                    <div className={item.isRead ? "pl-4" : ""}>
                      <p className={`font-semibold text-foreground ${!item.isRead ? "text-brand" : ""}`}>
                        {item.title}
                      </p>
                      <p className="text-xs text-foreground/50">
                        {fmtTimestamp(item.created_at)}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-foreground/40">
                    {expanded === item.id ? "▲" : "▼"}
                  </span>
                </button>
                {expanded === item.id && (
                  <div className="border-t border-black/5 px-4 py-4">
                    <p className="whitespace-pre-wrap text-sm text-foreground/80">{item.body}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
