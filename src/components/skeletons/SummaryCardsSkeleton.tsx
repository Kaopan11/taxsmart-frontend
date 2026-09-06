import { LOADING } from "@/lib/ui-copy";
import { SkeletonBar } from "@/components/skeletons/SkeletonBar";

type SummaryCardsSkeletonProps = {
  /** class ของ section wrapper — dashboard vs homepage ต่าง padding */
  className?: string;
};

/**
 * Ticket 07: skeleton การ์ดสรุป 3 ใบ (Dashboard + Homepage hub)
 */
export function SummaryCardsSkeleton({
  className = "grid gap-4 sm:grid-cols-3",
}: SummaryCardsSkeletonProps) {
  return (
    <section
      className={className}
      aria-busy="true"
      aria-label={LOADING.loadingInvoices}
    >
      {[0, 1, 2].map((key) => (
        <div
          key={key}
          className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <SkeletonBar className="h-4 w-24" />
          <SkeletonBar className="mt-3 h-8 w-32" />
          <SkeletonBar className="mt-2 h-3 w-20 bg-zinc-100" />
        </div>
      ))}
    </section>
  );
}
