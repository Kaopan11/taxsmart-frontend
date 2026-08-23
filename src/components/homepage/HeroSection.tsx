import Link from "next/link";

/**
 * Hero — viewport แรก
 * แบรนด์ชัด + headline 1 บรรทัด + ประโยครอง + CTA
 * พื้นหลัง full-bleed (ไม่ใช้การ์ด / ไม่ยัดสถิติ)
 */
export function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden border-b border-emerald-900/10">
      {/* ชั้นบรรยากาศ full-bleed — โทนเขียวใบเสร็จ / เอกสาร ไม่แบน */}
      <div
        aria-hidden
        className="home-hero-glow pointer-events-none absolute inset-0"
      />
      <div
        aria-hidden
        className="home-hero-lines pointer-events-none absolute inset-0 opacity-[0.35]"
      />

      <div className="relative mx-auto flex min-h-[min(88vh,52rem)] max-w-6xl flex-col justify-center px-6 py-16 sm:py-24">
        {/* แบรนด์เป็นสัญญาณหลักของ viewport */}
        <p className="home-fade-up text-4xl font-semibold tracking-tight text-emerald-800 sm:text-5xl md:text-6xl">
          TaxSmart AI
        </p>

        <h1 className="home-fade-up home-delay-1 mt-5 max-w-none text-2xl font-semibold tracking-tight text-zinc-900 sm:whitespace-nowrap sm:text-3xl md:text-4xl">
          Manage receipts and tax deductions with AI
        </h1>

        <p className="home-fade-up home-delay-2 mt-4 max-w-xl text-base leading-relaxed text-zinc-600 sm:text-lg">
          Upload a receipt, extract the fields, and track deductible expenses in
          one dashboard built for SMEs and freelancers.
        </p>

        <div className="home-fade-up home-delay-3 mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/register"
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-zinc-300 bg-white/70 px-5 py-2.5 text-sm font-medium text-zinc-800 backdrop-blur-sm hover:bg-white"
          >
            Sign in
          </Link>
        </div>
      </div>
    </section>
  );
}
