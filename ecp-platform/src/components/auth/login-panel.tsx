"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type LoginMode = "login" | "register" | "phone";

interface AuthPayload {
  message?: string;
  returnTo?: string;
  delivery?: "webhook" | "dev";
  devCode?: string;
  phoneNumber?: string;
}

function readSearchParam(key: string, fallback = "") {
  if (typeof window === "undefined") {
    return fallback;
  }

  return new URLSearchParams(window.location.search).get(key) ?? fallback;
}

async function parsePayload(response: Response) {
  try {
    return (await response.json()) as AuthPayload;
  } catch {
    return {} as AuthPayload;
  }
}

export function LoginPanel({ googleEnabled }: { googleEnabled: boolean }) {
  const [mode, setMode] = useState<LoginMode>("login");
  const [returnTo, setReturnTo] = useState("/");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [phoneName, setPhoneName] = useState("");
  const [phoneStarted, setPhoneStarted] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    setReturnTo(readSearchParam("returnTo", "/"));
    if (readSearchParam("error") === "google_not_configured") {
      setRequestError("Google sign-in is not configured for this environment yet.");
    }
  }, []);

  const title = useMemo(() => {
    if (mode === "register") return "Create your ECP account";
    if (mode === "phone") return "Verify with mobile";
    return "Sign in to continue";
  }, [mode]);

  async function handleAuthSubmit(endpoint: string, body: Record<string, string | undefined>) {
    setIsSubmitting(true);
    setRequestError(null);
    setStatusMessage(null);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await parsePayload(response);

      if (!response.ok) {
        throw new Error(payload.message ?? "Authentication request failed.");
      }

      window.location.assign(payload.returnTo ?? returnTo);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Authentication request failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await handleAuthSubmit("/api/auth/login", {
      email: loginEmail,
      password: loginPassword,
      returnTo,
    });
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await handleAuthSubmit("/api/auth/register", {
      name: registerName,
      email: registerEmail,
      password: registerPassword,
      returnTo,
    });
  }

  async function handlePhoneStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setRequestError(null);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/auth/phone/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, returnTo }),
      });
      const payload = await parsePayload(response);

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to send verification code.");
      }

      setPhoneNumber(payload.phoneNumber ?? phoneNumber);
      setDevCode(payload.devCode ?? null);
      setPhoneStarted(true);
      setStatusMessage(
        payload.delivery === "dev"
          ? "Verification code generated in development mode. Enter the code below to continue."
          : "Verification code sent successfully. Enter it below to continue.",
      );
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Unable to send verification code.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePhoneVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await handleAuthSubmit("/api/auth/phone/verify", {
      phoneNumber,
      code: verificationCode,
      name: phoneName || undefined,
      returnTo,
    });
  }

  return (
    <main className="px-4 py-10 md:px-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_1.1fr]">
        <section className="rounded-4xl border border-slate-200/80 bg-white/85 p-8 shadow-[0_20px_55px_rgba(148,163,184,0.18)]">
          <p className="text-xs uppercase tracking-[0.3em] text-sky-600">Authentication workspace</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">{title}</h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Continue with email/password, mobile verification, or Google OAuth. After authentication you&apos;ll return to
            <span className="font-medium text-slate-900"> {returnTo}</span>.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {([
              ["login", "Email sign-in"],
              ["register", "Register"],
              ["phone", "Mobile login"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMode(value);
                  setRequestError(null);
                  setStatusMessage(null);
                }}
                className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                  mode === value
                    ? "border-sky-300 bg-sky-50 text-sky-700"
                    : "border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {requestError ? <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{requestError}</div> : null}
          {statusMessage ? <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{statusMessage}</div> : null}

          {mode === "login" ? (
            <form className="mt-6 space-y-4" onSubmit={handleLogin}>
              <label className="block space-y-2 text-sm text-slate-700">
                Email
                <input value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} type="email" autoComplete="email" required className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-sky-300" />
              </label>
              <label className="block space-y-2 text-sm text-slate-700">
                Password
                <input value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} type="password" autoComplete="current-password" required minLength={8} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-sky-300" />
              </label>
              <button type="submit" disabled={isSubmitting} className="w-full rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                {isSubmitting ? "Signing in..." : "Sign in"}
              </button>
            </form>
          ) : null}

          {mode === "register" ? (
            <form className="mt-6 space-y-4" onSubmit={handleRegister}>
              <label className="block space-y-2 text-sm text-slate-700">
                Full name
                <input value={registerName} onChange={(event) => setRegisterName(event.target.value)} autoComplete="name" required className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-sky-300" />
              </label>
              <label className="block space-y-2 text-sm text-slate-700">
                Email
                <input value={registerEmail} onChange={(event) => setRegisterEmail(event.target.value)} type="email" autoComplete="email" required className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-sky-300" />
              </label>
              <label className="block space-y-2 text-sm text-slate-700">
                Password
                <input value={registerPassword} onChange={(event) => setRegisterPassword(event.target.value)} type="password" autoComplete="new-password" required minLength={8} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-sky-300" />
              </label>
              <button type="submit" disabled={isSubmitting} className="w-full rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                {isSubmitting ? "Creating account..." : "Create account"}
              </button>
            </form>
          ) : null}

          {mode === "phone" ? (
            <div className="mt-6 space-y-4">
              {!phoneStarted ? (
                <form className="space-y-4" onSubmit={handlePhoneStart}>
                  <label className="block space-y-2 text-sm text-slate-700">
                    Mobile number
                    <input value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} autoComplete="tel" placeholder="+1 555 123 4567" required className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-sky-300" />
                  </label>
                  <button type="submit" disabled={isSubmitting} className="w-full rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                    {isSubmitting ? "Sending code..." : "Send verification code"}
                  </button>
                </form>
              ) : (
                <form className="space-y-4" onSubmit={handlePhoneVerify}>
                  <label className="block space-y-2 text-sm text-slate-700">
                    Mobile number
                    <input value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} autoComplete="tel" required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition focus:border-sky-300" />
                  </label>
                  <label className="block space-y-2 text-sm text-slate-700">
                    Verification code
                    <input value={verificationCode} onChange={(event) => setVerificationCode(event.target.value)} autoComplete="one-time-code" inputMode="numeric" required maxLength={6} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-sky-300" />
                  </label>
                  <label className="block space-y-2 text-sm text-slate-700">
                    Name for new accounts (optional)
                    <input value={phoneName} onChange={(event) => setPhoneName(event.target.value)} autoComplete="name" placeholder="Required only if this phone number is new" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-sky-300" />
                  </label>
                  {devCode ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">Development verification code: <span className="font-semibold">{devCode}</span></div> : null}
                  <button type="submit" disabled={isSubmitting} className="w-full rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                    {isSubmitting ? "Verifying..." : "Verify and continue"}
                  </button>
                </form>
              )}
            </div>
          ) : null}
        </section>

        <section className="rounded-4xl border border-slate-200/80 bg-white/85 p-8 shadow-[0_20px_55px_rgba(148,163,184,0.12)]">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Provider options</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">Enterprise access patterns</h2>
          <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-600">
            <li>• Email/password supports standard account creation and return-to-workflow redirects.</li>
            <li>• Mobile verification supports phone-first access for sales or field teams.</li>
            <li>• Google OAuth supports federated sign-in when environment variables are configured.</li>
            <li>• Saved configurations remain tied to the authenticated owner account.</li>
          </ul>

          <button
            type="button"
            disabled={!googleEnabled || isSubmitting}
            onClick={() => window.location.assign(`/api/auth/google?returnTo=${encodeURIComponent(returnTo)}`)}
            className="mt-6 w-full rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
          >
            {googleEnabled ? "Continue with Google" : "Google sign-in unavailable in this environment"}
          </button>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50/80 p-5 text-sm text-slate-600">
            <p className="font-medium text-slate-900">Need to return to configuration management?</p>
            <p className="mt-2">Once authenticated, you can continue saving from the configurator, open your saved configurations workspace, or access admin reporting if your role permits it.</p>
            <Link href="/" className="mt-4 inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:border-sky-300 hover:bg-white">
              Back to configurator
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}