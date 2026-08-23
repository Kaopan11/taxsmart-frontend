"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

/**
 * Step F2 + F7 — ฟอร์ม Register (mock)
 * - บังคับ: email + password
 * - optional: fullName (ตรงกับ User.fullName ใน Prisma)
 * - ยังไม่เรียก Nest → พอผ่าน validation ไป /dashboard
 */
export function RegisterForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Please enter email and password.");
      return;
    }

    // Mock register — เฟสถัดไปค่อย POST /auth/register + hash password
    // (fullName จะส่งไป Nest พร้อม email/password ในเฟสนั้น)
    router.push("/dashboard");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="register-fullname"
          className="block text-sm font-medium text-zinc-700"
        >
          Full name <span className="font-normal text-zinc-400">(optional)</span>
        </label>
        <input
          id="register-fullname"
          type="text"
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          placeholder="Alex SME"
        />
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
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label
          htmlFor="register-password"
          className="block text-sm font-medium text-zinc-700"
        >
          Password
        </label>
        <input
          id="register-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          placeholder="••••••••"
        />
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
      >
        Create account
      </button>

      {/* Step F6 — ลิงก์ข้ามไป Login */}
      <p className="text-center text-sm text-zinc-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-emerald-700 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
