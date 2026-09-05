"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ensureSession, loginRequest, mapLoginError } from "@/lib/auth-api";
import { getPostAuthPath, getStoredUser } from "@/lib/auth-storage";
import { AUTH_COPY, LOADING } from "@/lib/ui-copy";

/**
 * P1: ฟอร์ม Login — เรียก POST /auth/login จริง แล้วเก็บ JWT
 * FE-1: error แยกช่อง + redirect ตาม role
 */
export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  function clearErrors() {
    setEmailError(null);
    setPasswordError(null);
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearErrors();

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setFormError(AUTH_COPY.loginMissingFields);
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await loginRequest(trimmedEmail, password);
      router.push(getPostAuthPath(data.user.role));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : AUTH_COPY.signInFailed;
      const mapped = mapLoginError(message);
      setEmailError(mapped.emailError ?? null);
      setPasswordError(mapped.passwordError ?? null);
      setFormError(mapped.formError ?? null);
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
        <label htmlFor="login-email" className="block text-sm font-medium text-zinc-700">
          Email
        </label>
        <input
          id="login-email"
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
          htmlFor="login-password"
          className="block text-sm font-medium text-zinc-700"
        >
          Password
        </label>
        <div className="relative mt-1">
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
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
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-center text-sm text-zinc-600">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-emerald-700 hover:underline">
          Create account
        </Link>
      </p>
    </form>
  );
}
