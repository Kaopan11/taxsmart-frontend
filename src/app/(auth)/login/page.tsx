import { LoginForm } from "@/components/auth/LoginForm";

/** Step F1 — หน้า /login */
export default function LoginPage() {
  return (
    <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Access your invoice &amp; tax dashboard
      </p>
      <div className="mt-6">
        <LoginForm />
      </div>
    </div>
  );
}
