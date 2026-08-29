import { SummaryCardsSkeleton } from "@/components/skeletons/SummaryCardsSkeleton";
import { formatBaht, type InvoiceSummary } from "@/lib/invoice-display";
import { HOMEPAGE_COPY } from "@/lib/ui-copy";

type HomeSummaryCardsProps = {
  summary: InvoiceSummary | null;
  loading: boolean;
};

/**
 * Phase B + Ticket 07: การ์ดสรุป homepage hub — skeleton ร่วมกับ Dashboard
 */
export function HomeSummaryCards({ summary, loading }: HomeSummaryCardsProps) {
  if (loading) {
    return (
      <SummaryCardsSkeleton className="mx-auto grid max-w-6xl gap-4 px-6 py-10 sm:grid-cols-3" />
    );
  }

  if (!summary) return null;

  return (
    <section className="mx-auto grid max-w-6xl gap-4 px-6 py-10 sm:grid-cols-3">
      <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-zinc-500">
          {HOMEPAGE_COPY.summaryTotalExpenses}
        </p>
        <p className="mt-2 text-2xl font-semibold">
          {formatBaht(summary.totalExpenses)}
        </p>
        <p className="mt-1 text-xs text-zinc-400">
          {HOMEPAGE_COPY.summaryTotalExpensesHint}
        </p>
      </article>

      <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-zinc-500">
          {HOMEPAGE_COPY.summaryTaxSavings}
        </p>
        <p className="mt-2 text-2xl font-semibold">
          {formatBaht(summary.taxSavings)}
        </p>
        <p className="mt-1 text-xs text-zinc-400">
          {HOMEPAGE_COPY.summaryTaxSavingsHint}
        </p>
      </article>

      <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-zinc-500">
          {HOMEPAGE_COPY.summaryTotalInvoices}
        </p>
        <p className="mt-2 text-2xl font-semibold">
          {summary.totalCount} Items
        </p>
      </article>
    </section>
  );
}
