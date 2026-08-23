import { RegisterForm } from "@/components/auth/RegisterForm";

/** Step F2 — หน้า /register */
export default function RegisterPage() {
  return (
    <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Start managing receipts for your SME
      </p>
      <div className="mt-6">
        <RegisterForm />
      </div>
    </div>
  );
}
