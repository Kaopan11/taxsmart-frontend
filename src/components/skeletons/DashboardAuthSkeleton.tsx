import { SummaryCardsSkeleton } from "@/components/skeletons/SummaryCardsSkeleton";
import { InvoiceMobileCardSkeleton } from "@/components/skeletons/InvoiceMobileCardSkeleton";
import { SkeletonBar } from "@/components/skeletons/SkeletonBar";import { LOADING } from "@/lib/ui-copy";

/** Ticket 07: skeleton หน้า Dashboard ตอนเช็ค session */
export function DashboardAuthSkeleton() {
  return (
    <div
      className="min-h-screen bg-zinc-100 text-zinc-900"
      aria-busy="true"
      aria-label={LOADING.checkingSession}
    >
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <SkeletonBar className="h-9 w-9 rounded-lg" />
          <SkeletonBar className="h-5 w-28" />
        </div>
        <SkeletonBar className="h-11 w-16 rounded-lg md:hidden" />
        <SkeletonBar className="hidden h-9 w-48 md:block" />
      </div>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <SummaryCardsSkeleton />
        <SkeletonBar className="h-40 w-full rounded-xl border border-zinc-200 bg-white" />
        <InvoiceMobileCardSkeleton rows={3} />
        <SkeletonBar className="hidden h-64 w-full rounded-xl border border-zinc-200 bg-white md:block" />
      </main>
    </div>
  );
}
