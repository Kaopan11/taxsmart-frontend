"use client";

import { SkeletonBar } from "@/components/skeletons/SkeletonBar";
import { LOADING } from "@/lib/ui-copy";

/** M3: skeleton รายการ card บน mobile แทนตาราง */
export function InvoiceMobileCardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 md:hidden" aria-busy="true" aria-label={LOADING.loadingInvoices}>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <SkeletonBar className="h-5 w-32" />
            <SkeletonBar className="h-5 w-16 rounded-full" />
          </div>
          <SkeletonBar className="mt-3 h-4 w-24" />
          <SkeletonBar className="mt-2 h-4 w-40" />
          <div className="mt-4 flex gap-2">
            <SkeletonBar className="h-11 min-h-11 flex-1 rounded-md" />
            <SkeletonBar className="h-11 min-h-11 flex-1 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
