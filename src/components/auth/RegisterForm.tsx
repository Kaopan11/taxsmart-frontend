"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ensureSession, mapRegisterError, registerRequest } from "@/lib/auth-api";
import { getPostAuthPath, getStoredUser } from "@/lib/auth-storage";
import { AUTH_COPY, LOADING } from "@/lib/ui-copy";

/**
 * P1: ฟอร์ม Register — เรียก POST /auth/register จริง
 * FE-1: fullName บังคับ 6–20, password ≥ 9, field errors, redirect ตาม role
 */
export function RegisterForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullNameError, setFullNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void ensureSession().then((ok) => {
      if (cancelled) return;
      if (ok) {
        router.replace(getPostAuthPath(getStoredUser()?.role));
        return;
      }
      setCheckingSession(false);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  function clearFieldErrors() {
    setFullNameError(null);
    setEmailError(null);
    setPasswordError(null);
    setFormError(null);
  }

  /** Client validation — ข้อความให้ตรง Nest RegisterDto */
  function validateClient(): boolean {
    clearFieldErrors();
    let valid = true;

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setFullNameError(AUTH_COPY.fullNameRequired);
      valid = false;
    } else if (trimmedName.length < 6 || trimmedName.length > 20) {
      setFullNameError(AUTH_COPY.fullNameLength);
      valid = false;
    }

    if (!trimmedEmail || !password) {
      setFormError(AUTH_COPY.registerMissingFields);
      valid = false;
    }

    if (password.length < 9) {
      setPasswordError(AUTH_COPY.passwordMinLength);
      valid = false;
    }

    return valid;
  }

  function applyRegisterErrors(message: string) {
    const mapped = mapRegisterError(message);
    setFullNameError(mapped.fullNameError ?? null);
    setEmailError(mapped.emailError ?? null);
    setPasswordError(mapped.passwordError ?? null);
    setFormError(mapped.formError ?? null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateClient()) return;

    const trimmedEmail = email.trim();
    const trimmedName = fullName.trim();

    setIsSubmitting(true);
    try {
      const data = await registerRequest({
        email: trimmedEmail,
        password,
        fullName: trimmedName,
      });
      router.push(getPostAuthPath(data.user.role));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : AUTH_COPY.registerFailed;
      applyRegisterErrors(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (checkingSession) {
    return (
      <p className="text-center text-sm text-zinc-500">
        {LOADING.checkingSession}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="register-fullname"
          className="block text-sm font-medium text-zinc-700"
        >
          Full name
        </label>
        <input
          id="register-fullname"
          type="text"
          autoComplete="name"
          value={fullName}
          onChange={(e) => {
            setFullName(e.target.value);
            setFullNameError(null);
            setFormError(null);
          }}
          disabled={isSubmitting}
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          placeholder="Alex SME"
        />
        {fullNameError ? (
          <p className="mt-1 text-xs text-red-600" role="alert">
            {fullNameError}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="register-email"
          className="block text-sm font-medium text-zinc-700"
        >
          Email
        </label>
        <input
          id="register-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setEmailError(null);
            setFormError(null);
          }}
          disabled={isSubmitting}
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          placeholder="you@example.com"
        />
        {emailError ? (
          <p className="mt-1 text-xs text-red-600" role="alert">
            {emailError}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="register-password"
          className="block text-sm font-medium text-zinc-700"
        >
          Password
        </label>
        <div className="relative mt-1">
          <input
            id="register-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setPasswordError(null);
              setFormError(null);
            }}
            disabled={isSubmitting}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 pr-11 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-zinc-500 hover:text-zinc-800"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden
              >
                <path d="M3 3l18 18" />
                <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                <path d="M9.9 5.1A10.5 10.5 0 0 1 12 5c7 0 10 7 10 7a17.5 17.5 0 0 1-3.2 4.4" />
                <path d="M6.1 6.1A17.6 17.6 0 0 0 2 12s3 7 10 7a9.7 9.7 0 0 0 4.4-1" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden
              >
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
        {passwordError ? (
          <p className="mt-1 text-xs text-red-600" role="alert">
            {passwordError}
          </p>
        ) : null}
      </div>

      {formError ? (
        <p
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {formError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {isSubmitting ? "Creating account…" : "Create account"}
      </button>

      <p className="text-center text-sm text-zinc-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-emerald-700 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
