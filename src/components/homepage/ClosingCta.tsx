import Link from "next/link";

/** CTA ซ้ำก่อน footer — พาคนไป register อีกครั้ง */
export function ClosingCta() {
  return (
    <section className="relative overflow-hidden border-y border-emerald-900/10 bg-emerald-950 px-6 py-16 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.35),transparent_65%)]"
      />
      <div className="relative mx-auto max-w-2xl">
        <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Ready to try TaxSmart?
        </h2>
        <p className="mt-3 text-sm text-emerald-100/90 sm:text-base">
          Create an account and upload your first receipt in minutes.
        </p>
        <Link
          href="/register"
          className="mt-8 inline-flex rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-emerald-900 hover:bg-emerald-50"
        >
          Get started
        </Link>
      </div>
    </section>
  );
}
