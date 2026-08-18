"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { checkInAction, checkOutAction, type CheckinResult } from "./actions";

export interface AssignedSite {
  contractId: string;
  clientName: string;
  siteName: string;
  hasPin: boolean;
}

export interface TodayEvent {
  contractId: string;
  eventType: string; // 'check_in' | 'check_out'
  occurredAt: string;
}

/** Stable-ish per-device id for device-binding checks (not security-critical). */
function getDeviceHash(): string {
  const KEY = "gladen_device_id";
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return "no-storage";
  }
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location is not available on this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function elapsed(fromIso: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(fromIso).getTime()) / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const REJECTION_MESSAGES: Record<string, string> = {
  rejected_out_of_fence:
    "You appear to be too far from the site. Move closer to the site and try again.",
  rejected_low_accuracy:
    "Your GPS signal is too weak to confirm your location. Move to an open area and try again.",
  rejected_no_site_pin:
    "This site has no location set yet. Please ask your manager to set the site location.",
};

export function CheckinClient({
  sites,
  todayEvents,
}: {
  sites: AssignedSite[];
  todayEvents: TodayEvent[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [tick, setTick] = useState(0);

  // Re-render each minute so the "on site for" timer advances.
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60000);
    return () => clearInterval(t);
  }, []);
  void tick;

  // Derive current open state per site from today's accepted events.
  const openByContract = new Map<string, string>(); // contractId -> check_in occurredAt
  for (const e of todayEvents) {
    if (e.eventType === "check_in") openByContract.set(e.contractId, e.occurredAt);
    else openByContract.delete(e.contractId);
  }

  async function handle(kind: "in" | "out", contractId: string) {
    setMessage(null);
    setBusy(true);
    try {
      const pos = await getPosition();
      const input = {
        contractId,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        deviceHash: getDeviceHash(),
      };
      startTransition(async () => {
        const res: CheckinResult =
          kind === "in" ? await checkInAction(input) : await checkOutAction(input);
        if (res.error) {
          setMessage({ kind: "err", text: res.error });
        } else if (res.status === "accepted") {
          setMessage({
            kind: "ok",
            text: kind === "in" ? "Checked in. Have a good shift!" : "Checked out. Thank you!",
          });
          router.refresh();
        } else {
          setMessage({
            kind: "err",
            text: REJECTION_MESSAGES[res.status ?? ""] ?? "Could not record — please try again.",
          });
        }
        setBusy(false);
      });
    } catch (e) {
      setMessage({
        kind: "err",
        text:
          e instanceof GeolocationPositionError || (e as Error)?.message?.includes("denied")
            ? "Location permission is needed to check in. Please allow location access."
            : (e as Error)?.message ?? "Could not get your location.",
      });
      setBusy(false);
    }
  }

  const working = busy || pending;

  return (
    <>
      <Header title="Check in / out" />
      <main className="flex-1 px-4 py-6 space-y-4">
        {sites.length === 0 && (
          <p className="rounded-xl border border-black/10 bg-black/[.02] p-4 text-foreground/70">
            You are not assigned to a site today. Please check with your supervisor.
          </p>
        )}

        {sites.map((site) => {
          const openAt = openByContract.get(site.contractId);
          const isOpen = Boolean(openAt);
          return (
            <div
              key={site.contractId}
              className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-foreground/50">Your site today</p>
              <p className="text-lg font-semibold">{site.siteName}</p>
              <p className="text-sm text-foreground/60">{site.clientName}</p>

              {!site.hasPin && (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Site location not set yet — check-in will not count until your manager sets it.
                </p>
              )}

              {isOpen ? (
                <div className="mt-4">
                  <p className="text-sm text-green-700">
                    ✅ Checked in at {fmtTime(openAt!)} · on site for {elapsed(openAt!)}
                  </p>
                  <button
                    type="button"
                    disabled={working}
                    onClick={() => handle("out", site.contractId)}
                    className="mt-3 w-full rounded-xl bg-brand py-4 text-lg font-semibold text-white transition active:scale-[.99] disabled:opacity-60"
                  >
                    {working ? "Getting location…" : "Check out"}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={working}
                  onClick={() => handle("in", site.contractId)}
                  className="mt-4 w-full rounded-xl bg-brand py-4 text-lg font-semibold text-white transition active:scale-[.99] disabled:opacity-60"
                >
                  {working ? "Getting location…" : "Check in"}
                </button>
              )}
            </div>
          );
        })}

        {message && (
          <p
            className={`rounded-xl px-4 py-3 text-sm ${
              message.kind === "ok"
                ? "bg-green-50 text-green-800"
                : "bg-red-50 text-red-700"
            }`}
          >
            {message.text}
          </p>
        )}

        {todayEvents.length > 0 && (
          <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
            <p className="mb-2 text-sm font-semibold">Today</p>
            <ul className="space-y-1 text-sm text-foreground/70">
              {todayEvents.map((e, i) => (
                <li key={i} className="flex justify-between">
                  <span>{e.eventType === "check_in" ? "Checked in" : "Checked out"}</span>
                  <span>{fmtTime(e.occurredAt)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </>
  );
}
