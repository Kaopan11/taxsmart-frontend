"use client";

import { SkeletonBar } from "@/components/skeletons/SkeletonBar";
import { LOADING } from "@/lib/ui-copy";

/** M4: skeleton card รายชื่อ user บน mobile */
export function AdminUserMobileCardSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 md:hidden" aria-busy="true" aria-label={LOADING.loadingUsers}>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
        >
          <SkeletonBar className="h-5 w-48" />
          <SkeletonBar className="mt-2 h-4 w-32" />
          <div className="mt-3 flex items-center justify-between">
            <SkeletonBar className="h-5 w-14 rounded-md" />
            <SkeletonBar className="h-4 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
