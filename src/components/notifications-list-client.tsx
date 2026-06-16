"use client";

import { useEffect, useTransition } from "react";
import { Header } from "@/components/header";
import { useLanguage } from "@/lib/i18n/language-provider";

export interface NotificationRow {
  id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export function NotificationsListClient({
  notifications,
  markAllReadAction,
}: {
  notifications: NotificationRow[];
  markAllReadAction: () => Promise<void>;
}) {
  const { t } = useLanguage();
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (notifications.some((n) => !n.is_read)) {
      startTransition(() => { markAllReadAction(); });
    }
  }, []);

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t("notifications.justNow");
    if (mins < 60) return `${mins}${t("notifications.minsAgo")}`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}${t("notifications.hoursAgo")}`;
    const days = Math.floor(hrs / 24);
    return `${days}${t("notifications.daysAgo")}`;
  }

  return (
    <>
      <Header titleKey="notifications.title" />
      <main className="flex-1 px-4 py-6">
        {notifications.length === 0 ? (
          <p className="text-center text-sm text-foreground/60">
            {t("notifications.none")}
          </p>
        ) : (
          <ul className="space-y-3">
            {notifications.map((n) => (
              <li
                key={n.id}
                className="relative rounded-xl bg-white p-4 shadow-sm"
              >
                {!n.is_read && (
                  <span className="absolute right-4 top-4 h-2 w-2 rounded-full bg-brand" />
                )}
                <p className="pr-4 text-sm font-semibold text-foreground">{n.title}</p>
                <p className="mt-1 text-sm text-foreground/70">{n.body}</p>
                <p className="mt-2 text-xs text-foreground/40">{timeAgo(n.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
