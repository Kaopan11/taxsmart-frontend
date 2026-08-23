import Link from "next/link";

/**
 * Step F4 — layout ร่วมของหน้า auth
 * โฟลเดอร์ (auth) เป็น route group → URL ยังเป็น /login, /register
 * ไม่มี (auth) ใน path
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-100 text-zinc-900">
      {/* โลโก้ซ้ายเหมือน /dashboard — กดกลับหน้าแรก */}
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
            TS
          </div>
          <span className="text-lg font-semibold">TaxSmart AI</span>
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        {children}
      </main>
    </div>
  );
}
