"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/language-provider";
import { LanguageToggle } from "@/components/language-toggle";

function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  return `+65${digits}`;
}

export default function LoginPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendCode(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const formatted = normalizePhone(phone);
    if (!/^\+\d{8,15}$/.test(formatted)) {
      setError(t("auth.invalidPhone"));
      return;
    }

    setLoading(true);

    const { data: isRegistered, error: checkError } = await supabase.rpc(
      "check_employee_phone",
      { p_phone: formatted }
    );

    if (checkError || !isRegistered) {
      setLoading(false);
      setError(t("auth.phoneNotRegistered"));
      return;
    }

    const { error: otpError } = await supabase.auth.signInWithOtp({
      phone: formatted,
    });
    setLoading(false);

    if (otpError) {
      // Twilio trial-account errors fire on first registration of a new number
      // but the OTP is still queued. Advance to OTP step with a soft message
      // so the employee doesn't need to click "Send OTP" twice.
      const isTwilioFirstAttempt =
        otpError.message.toLowerCase().includes("trial") ||
        otpError.message.toLowerCase().includes("unverified");

      if (isTwilioFirstAttempt) {
        setPhone(formatted);
        setStep("otp");
        setError(t("auth.otpRetryHint"));
        return;
      }

      setError(t("auth.sendFailed"));
      return;
    }

    setPhone(formatted);
    setStep("otp");
  }

  async function handleVerifyCode(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!/^\d{4,8}$/.test(otp)) {
      setError(t("auth.invalidOtp"));
      return;
    }

    setLoading(true);
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: "sms",
    });

    if (verifyError || !data.user) {
      setLoading(false);
      setError(verifyError?.message ?? t("auth.invalidOtp"));
      return;
    }

    // Look up employee record by phone number to get the link
    const userPhone = data.user.phone ?? "";
    const { data: emp } = await supabase
      .from("employees")
      .select("id, full_name")
      .eq("mobile_number", userPhone)
      .maybeSingle();

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, employee_id")
      .eq("id", data.user.id)
      .maybeSingle();

    if (!profile) {
      // First-ever login — create profile with employee link
      await supabase.from("profiles").insert({
        id: data.user.id,
        role: "employee",
        employee_id: emp?.id ?? null,
        full_name: emp?.full_name ?? null,
      });
    } else if (!profile.employee_id && emp?.id) {
      // Profile exists but was created without a link — patch it now
      await supabase
        .from("profiles")
        .update({ employee_id: emp.id, full_name: emp.full_name ?? null })
        .eq("id", data.user.id);
    }

    setLoading(false);
    const role = profile?.role ?? "employee";
    router.push(role === "manager" ? "/manager" : "/employee");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-10">
      <div className="flex justify-end">
        <LanguageToggle />
      </div>

      <div className="mt-12 flex flex-1 flex-col items-center">
        <div className="relative h-24 w-full max-w-xs">
          <Image
            src="/images/logo-blue.png"
            alt="Gladen Maintenance Services"
            fill
            className="object-contain"
            priority
          />
        </div>

        <h1 className="mt-8 text-center text-xl font-semibold text-foreground">
          {t("auth.welcome")}
        </h1>

        {step === "phone" && (
          <form
            onSubmit={handleSendCode}
            className="mt-8 w-full max-w-sm space-y-4"
          >
            <div>
              <label
                htmlFor="phone"
                className="mb-1 block text-sm font-medium text-foreground"
              >
                {t("auth.phoneLabel")}
              </label>
              <div className="flex items-center rounded-lg border border-black/10 bg-white focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
                <span className="pl-4 pr-2 text-base text-foreground/60">
                  +65
                </span>
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="9123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-transparent py-3 pr-4 text-base focus:outline-none"
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-brand py-3 text-base font-semibold text-white transition disabled:opacity-60"
            >
              {loading ? t("common.loading") : t("auth.sendCode")}
            </button>
          </form>
        )}

        {step === "otp" && (
          <form
            onSubmit={handleVerifyCode}
            className="mt-8 w-full max-w-sm space-y-4"
          >
            <div>
              <label
                htmlFor="otp"
                className="mb-1 block text-sm font-medium text-foreground"
              >
                {t("auth.otpLabel")}
              </label>
              <p className="mb-2 text-sm text-foreground/60">
                {t("auth.otpHint")}
              </p>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder={t("auth.otpPlaceholder")}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full rounded-lg border border-black/10 bg-white px-4 py-3 text-center text-lg tracking-widest focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-brand py-3 text-base font-semibold text-white transition disabled:opacity-60"
            >
              {loading ? t("common.loading") : t("auth.verify")}
            </button>

            <button
              type="button"
              onClick={() => setStep("phone")}
              className="w-full text-center text-sm text-brand"
            >
              {t("common.back")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
