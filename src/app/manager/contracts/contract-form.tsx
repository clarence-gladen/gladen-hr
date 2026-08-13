"use client";

import { useActionState, useState } from "react";
import { Header } from "@/components/header";
import { useLanguage } from "@/lib/i18n/language-provider";
import type { ContractStatus } from "@/lib/types/database";

export interface ContractFormState {
  error?: string;
}

export interface ContractFormDefaults {
  clientName: string;
  siteName: string;
  startDate: string;
  endDate: string;
  monthlyValue: string;
  status: ContractStatus;
  address: string;
  latitude: string;
  longitude: string;
  geofenceRadiusM: string;
}

const EMPTY_DEFAULTS: ContractFormDefaults = {
  clientName: "",
  siteName: "",
  startDate: "",
  endDate: "",
  monthlyValue: "",
  status: "active",
  address: "",
  latitude: "",
  longitude: "",
  geofenceRadiusM: "75",
};

const inputClass =
  "w-full rounded-lg border border-black/10 bg-white px-4 py-3 text-base focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";
const labelClass = "mb-1 block text-sm font-medium text-foreground";

export function ContractForm({
  titleKey,
  action,
  defaultValues = EMPTY_DEFAULTS,
  isEdit = false,
}: {
  titleKey: string;
  action: (state: ContractFormState, formData: FormData) => Promise<ContractFormState>;
  defaultValues?: ContractFormDefaults;
  isEdit?: boolean;
}) {
  const { t } = useLanguage();
  const [state, formAction, pending] = useActionState(action, {});
  const [lat, setLat] = useState(defaultValues.latitude);
  const [lng, setLng] = useState(defaultValues.longitude);
  const [geoStatus, setGeoStatus] = useState<string | null>(null);

  const captureLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus("Location is not available on this device.");
      return;
    }
    setGeoStatus("Getting location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setGeoStatus(`Pin set (±${Math.round(pos.coords.accuracy)}m accuracy).`);
      },
      (err) => setGeoStatus(`Couldn't get location: ${err.message}`),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <>
      <Header titleKey={titleKey} />
      <main className="flex-1 px-4 py-6">
        <form action={formAction} className="space-y-4">
          <div>
            <label className={labelClass} htmlFor="clientName">
              {t("contracts.clientName")}
            </label>
            <input
              id="clientName"
              name="clientName"
              type="text"
              required
              defaultValue={defaultValues.clientName}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="siteName">
              {t("contracts.siteName")}
            </label>
            <input
              id="siteName"
              name="siteName"
              type="text"
              required
              defaultValue={defaultValues.siteName}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="startDate">
              {t("contracts.startDate")}
            </label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              required
              defaultValue={defaultValues.startDate}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="endDate">
              {t("contracts.endDate")}
            </label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              defaultValue={defaultValues.endDate}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="monthlyValue">
              {t("contracts.monthlyValue")}
            </label>
            <input
              id="monthlyValue"
              name="monthlyValue"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={defaultValues.monthlyValue}
              className={inputClass}
            />
          </div>

          <div className="rounded-xl border border-black/10 bg-black/[.02] p-4">
            <p className="mb-1 text-sm font-semibold text-foreground">
              Site location <span className="font-normal text-foreground/50">(for check-in — optional)</span>
            </p>
            <p className="mb-3 text-sm text-foreground/60">
              Set the GPS pin for this site. The most accurate way is to open this
              on a phone <b>at the site</b> and tap “Use my current location”.
            </p>

            <label className={labelClass} htmlFor="address">
              Address
            </label>
            <input
              id="address"
              name="address"
              type="text"
              defaultValue={defaultValues.address}
              placeholder="e.g. 110 International Road, Singapore 629174"
              className={inputClass}
            />

            <button
              type="button"
              onClick={captureLocation}
              className="mt-3 w-full rounded-lg border border-brand py-2.5 text-sm font-semibold text-brand transition active:scale-[.99]"
            >
              📍 Use my current location
            </button>
            {geoStatus && <p className="mt-1 text-sm text-foreground/60">{geoStatus}</p>}

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass} htmlFor="latitude">
                  Latitude
                </label>
                <input
                  id="latitude"
                  name="latitude"
                  type="number"
                  step="any"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="1.332600"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="longitude">
                  Longitude
                </label>
                <input
                  id="longitude"
                  name="longitude"
                  type="number"
                  step="any"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="103.693100"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="mt-3">
              <label className={labelClass} htmlFor="geofenceRadiusM">
                Check-in radius (metres)
              </label>
              <input
                id="geofenceRadiusM"
                name="geofenceRadiusM"
                type="number"
                min="20"
                max="1000"
                step="5"
                defaultValue={defaultValues.geofenceRadiusM}
                className={inputClass}
              />
            </div>
          </div>

          {isEdit && (
            <div>
              <label className={labelClass} htmlFor="status">
                {t("contracts.status")}
              </label>
              <select
                id="status"
                name="status"
                defaultValue={defaultValues.status}
                className={inputClass}
              >
                <option value="active">{t("contracts.active")}</option>
                <option value="completed">{t("contracts.completed")}</option>
                <option value="terminated">{t("contracts.terminated")}</option>
              </select>
            </div>
          )}

          {state.error && <p className="text-sm text-red-600">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-brand py-3 text-base font-semibold text-white transition disabled:opacity-60"
          >
            {pending ? t("common.loading") : t("contracts.saveContract")}
          </button>
        </form>
      </main>
    </>
  );
}
