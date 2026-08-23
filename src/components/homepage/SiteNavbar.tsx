import Link from "next/link";

/** Navbar หน้าแรก — โลโก้ซ้ายแบบ dashboard/login · CTA ขวา */
export function SiteNavbar() {
  return (
    <header className="relative z-20 flex items-center justify-between border-b border-zinc-200/80 bg-white/80 px-6 py-4 backdrop-blur-sm">
      <Link href="/" className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
          TS
        </div>
        <span className="text-lg font-semibold text-zinc-900">TaxSmart AI</span>
      </Link>

      <nav className="flex items-center gap-2 sm:gap-3">
        <Link
          href="/login"
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
        >
          Sign in
        </Link>
        <Link
          href="/register"
          className="rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Get started
        </Link>
      </nav>
    </header>
  );
}
