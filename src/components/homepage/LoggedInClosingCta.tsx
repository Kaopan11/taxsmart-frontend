import Link from "next/link";
import { HOMEPAGE_COPY } from "@/lib/ui-copy";

/** Phase B: CTA ท้ายหน้า — หลัง login ชวนกลับ dashboard แทน register */
export function LoggedInClosingCta() {
  return (
    <section className="relative overflow-hidden border-y border-emerald-900/10 bg-emerald-950 px-6 py-16 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.35),transparent_65%)]"
      />
      <div className="relative mx-auto max-w-2xl">
        <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          {HOMEPAGE_COPY.closingLoggedInTitle}
        </h2>
        <p className="mt-3 text-sm text-emerald-100/90 sm:text-base">
          {HOMEPAGE_COPY.closingLoggedInSub}
        </p>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-emerald-900 hover:bg-emerald-50"
        >
          {HOMEPAGE_COPY.closingLoggedInCta}
        </Link>
      </div>
    </section>
  );
}
