"use client";

import { useActionState, useState } from "react";
import { Header } from "@/components/header";
import { useLanguage } from "@/lib/i18n/language-provider";
import { createAnnouncementAction } from "./actions";
import type { AnnouncementAudience } from "@/lib/types/database";
import { fmtTimestamp } from "@/lib/utils/date";

interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  created_at: string;
}

interface EmployeeOption {
  id: string;
  full_name: string;
}

const inputClass =
  "w-full rounded-lg border border-black/10 bg-white px-4 py-3 text-base focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";
const labelClass = "mb-1 block text-sm font-medium text-foreground";

export function AnnouncementsClient({
  announcements,
  employees,
}: {
  announcements: AnnouncementRow[];
  employees: EmployeeOption[];
}) {
  const { t } = useLanguage();
  const [state, formAction, pending] = useActionState(createAnnouncementAction, {});
  const [audience, setAudience] = useState<AnnouncementAudience>("all");

  return (
    <>
      <Header titleKey="announcements.title" />
      <main className="flex-1 px-4 py-6">
        <h2 className="mb-2 text-sm font-semibold text-foreground/60">
          {t("announcements.newAnnouncement")}
        </h2>
        <form action={formAction} className="mb-6 space-y-4 rounded-xl bg-white p-4 shadow-sm">
          <div>
            <label className={labelClass} htmlFor="title">
              {t("announcements.announcementTitle")}
            </label>
            <input id="title" name="title" type="text" required className={inputClass} />
          </div>

          <div>
            <label className={labelClass} htmlFor="body">
              {t("announcements.body")}
            </label>
            <textarea id="body" name="body" required rows={4} className={inputClass} />
          </div>

          <div>
            <label className={labelClass} htmlFor="audience">
              {t("announcements.audience")}
            </label>
            <select
              id="audience"
              name="audience"
              value={audience}
              onChange={(event) => setAudience(event.target.value as AnnouncementAudience)}
              className={inputClass}
            >
              <option value="all">{t("announcements.all")}</option>
              <option value="selected">{t("announcements.selected")}</option>
            </select>
          </div>

          {audience === "selected" && (
            <div>
              <span className={labelClass}>{t("announcements.selectEmployees")}</span>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-black/10 p-3">
                {employees.map((employee) => (
                  <label key={employee.id} className="flex items-center gap-2 text-sm text-foreground">
                    <input type="checkbox" name="employeeIds" value={employee.id} />
                    {employee.full_name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {state.error && <p className="text-sm text-red-600">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-brand py-3 text-base font-semibold text-white transition disabled:opacity-60"
          >
            {pending ? t("common.loading") : t("announcements.post")}
          </button>
        </form>

        {announcements.length === 0 ? (
          <p className="text-center text-sm text-foreground/60">{t("announcements.noAnnouncements")}</p>
        ) : (
          <ul className="space-y-3">
            {announcements.map((announcement) => (
              <li key={announcement.id} className="rounded-xl bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-foreground">{announcement.title}</p>
                  <span className="shrink-0 rounded-full bg-black/5 px-3 py-1 text-xs font-medium text-foreground/60">
                    {announcement.audience === "all"
                      ? t("announcements.all")
                      : t("announcements.selected")}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/60">{announcement.body}</p>
                <p className="mt-2 text-xs text-foreground/40">
                  {fmtTimestamp(announcement.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
