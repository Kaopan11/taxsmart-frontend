import { AppHeader } from "@/components/layout/AppHeader";

/**
 * Step F4 — layout ร่วมของหน้า auth
 * โฟลเดอร์ (auth) เป็น route group → URL ยังเป็น /login, /register
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-100 text-zinc-900">
      {/* Ticket 06: header ร่วม — auth มีแค่ logo */}
      <AppHeader variant="auth" />

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        {children}
      </main>
    </div>
  );
}
