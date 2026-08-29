import Link from "next/link";
import type { InvoiceStatusCounts } from "@/lib/invoice-display";
import { HOMEPAGE_COPY } from "@/lib/ui-copy";

type LoggedInHeroProps = {
  displayName: string;
  statusCounts: InvoiceStatusCounts;
};

/**
 * Phase B: Hero หลัง login — ทักทาย + chip สถานะ + CTA ไป dashboard/upload
 */
export function LoggedInHero({
  displayName,
  statusCounts,
}: LoggedInHeroProps) {
  const { processing, duplicate, failed } = statusCounts;
  const hasStatusChips = processing > 0 || duplicate > 0 || failed > 0;

  return (
    <section className="relative isolate overflow-hidden border-b border-emerald-900/10">
      <div
        aria-hidden
        className="home-hero-glow pointer-events-none absolute inset-0"
      />
      <div
        aria-hidden
        className="home-hero-lines pointer-events-none absolute inset-0 opacity-[0.35]"
      />

      <div className="relative mx-auto flex min-h-[min(70vh,40rem)] max-w-6xl flex-col justify-center px-6 py-16 sm:py-20">
        <p className="home-fade-up text-sm font-medium uppercase tracking-wider text-emerald-700">
          TaxSmart AI
        </p>

        <h1 className="home-fade-up home-delay-1 mt-3 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
          {HOMEPAGE_COPY.welcome(displayName)}
        </h1>

        <p className="home-fade-up home-delay-2 mt-4 max-w-xl text-base leading-relaxed text-zinc-600 sm:text-lg">
          {HOMEPAGE_COPY.loggedInSub}
        </p>

        {hasStatusChips && (
          <ul className="home-fade-up home-delay-2 mt-5 flex flex-wrap gap-2">
            {processing > 0 && (
              <li className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
                {HOMEPAGE_COPY.processingChip(processing)}
              </li>
            )}
            {duplicate > 0 && (
              <li className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800">
                {HOMEPAGE_COPY.duplicateChip(duplicate)}
              </li>
            )}
            {failed > 0 && (
              <li className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700 ring-1 ring-red-200">
                {HOMEPAGE_COPY.failedChip(failed)}
              </li>
            )}
          </ul>
        )}

        <div className="home-fade-up home-delay-3 mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
          >
            {HOMEPAGE_COPY.goToDashboard}
          </Link>
          <Link
            href="/dashboard#upload-zone"
            className="rounded-lg border border-zinc-300 bg-white/70 px-5 py-2.5 text-sm font-medium text-zinc-800 backdrop-blur-sm hover:bg-white"
          >
            {HOMEPAGE_COPY.uploadReceipt}
          </Link>
        </div>
      </div>
    </section>
  );
}
