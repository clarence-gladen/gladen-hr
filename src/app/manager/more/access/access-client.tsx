"use client";

import { useActionState, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { useLanguage } from "@/lib/i18n/language-provider";
import { setUserRoleAction, removeManagerAccessAction } from "./actions";

const labelClass = "mb-1 block text-sm font-medium text-foreground";

export function AccessClient({
  managers,
}: {
  managers: { phone: string; user_id: string | null; status: string }[];
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const [addState, addAction, addPending] = useActionState(setUserRoleAction, {});
  const [removeError, setRemoveError] = useState<string | undefined>();
  const [removePending, startRemoveTransition] = useTransition();

  // Refresh page after add form succeeds so the managers list updates
  useEffect(() => {
    if (addState.success) router.refresh();
  }, [addState.success]);

  function handleRemove(userId: string | null, phone: string) {
    setRemoveError(undefined);
    startRemoveTransition(async () => {
      const result = await removeManagerAccessAction(userId, phone);
      if (result.error) setRemoveError(result.error);
      else router.refresh();
    });
  }

  return (
    <>
      <Header titleKey="more.manageAccess" />
      <main className="flex-1 px-4 py-6 space-y-6">

        {/* Current managers */}
        <div>
          <h2 className="mb-2 text-sm font-semibold text-foreground/60">
            {t("more.currentManagers")}
          </h2>
          {managers.length === 0 ? (
            <p className="text-sm text-foreground/60">{t("more.noManagers")}</p>
          ) : (
            <ul className="space-y-2">
              {managers.map((m) => (
                <li key={m.phone} className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">+{m.phone}</span>
                    {m.status === "pending" && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        {t("more.pendingAccess")}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={removePending}
                    onClick={() => handleRemove(m.user_id, m.phone)}
                    className="text-xs font-medium text-red-500 disabled:opacity-60"
                  >
                    {t("more.removeAccess")}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {removeError && (
            <p className="mt-2 text-sm text-red-600">{removeError}</p>
          )}
        </div>

        {/* Add manager */}
        <div>
          <h2 className="mb-2 text-sm font-semibold text-foreground/60">
            {t("more.addManager")}
          </h2>
          <form action={addAction} className="space-y-4 rounded-xl bg-white p-4 shadow-sm">
            <div>
              <label className={labelClass} htmlFor="phone">
                {t("more.managerPhone")}
              </label>
              <div className="flex items-center rounded-lg border border-black/10 bg-white focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
                <span className="pl-4 pr-2 text-base text-foreground/60">+65</span>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  required
                  placeholder="9123 4567"
                  className="w-full bg-transparent py-3 pr-4 text-base focus:outline-none"
                />
              </div>
              <p className="mt-1 text-xs text-foreground/60">{t("more.managerPhoneHint")}</p>
            </div>
            <input type="hidden" name="role" value="manager" />

            {addState.error && (
              <p className="text-sm text-red-600">{addState.error}</p>
            )}
            {addState.success && (
              <p className="text-sm text-brand">{addState.success}</p>
            )}

            <button
              type="submit"
              disabled={addPending}
              className="w-full rounded-lg bg-brand py-3 text-base font-semibold text-white transition disabled:opacity-60"
            >
              {addPending ? t("common.loading") : t("more.grantAccess")}
            </button>
          </form>
        </div>

      </main>
    </>
  );
}
