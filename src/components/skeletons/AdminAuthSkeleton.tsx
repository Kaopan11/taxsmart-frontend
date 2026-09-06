import { AdminUserMobileCardSkeleton } from "@/components/skeletons/AdminUserMobileCardSkeleton";
import { SkeletonBar } from "@/components/skeletons/SkeletonBar";
import { TableBodySkeleton } from "@/components/skeletons/TableBodySkeleton";
import { LOADING } from "@/lib/ui-copy";

/** Ticket 07 + M4: skeleton หน้า Admin ตอนเช็คสิทธิ์ */
export function AdminAuthSkeleton() {
  return (
    <div
      className="min-h-screen bg-zinc-100 text-zinc-900"
      aria-busy="true"
      aria-label={LOADING.checkingAdminAccess}
    >
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <SkeletonBar className="h-9 w-9 rounded-lg" />
          <SkeletonBar className="h-5 w-28" />
        </div>
        <SkeletonBar className="h-11 w-16 rounded-lg md:hidden" />
        <SkeletonBar className="hidden h-9 w-56 md:block" />
      </div>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <div>
          <SkeletonBar className="h-8 w-24" />
          <SkeletonBar className="mt-2 h-4 w-64" />
        </div>
        <AdminUserMobileCardSkeleton rows={5} />
        <div className="hidden overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50">
              <tr aria-hidden>
                {[0, 1, 2, 3].map((key) => (
                  <th key={key} className="px-4 py-3">
                    <SkeletonBar className="h-3 w-16" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody aria-busy="true" aria-label={LOADING.loadingUsers}>
              <TableBodySkeleton
                rows={6}
                columnCount={4}
                loadingLabel={LOADING.loadingUsers}
                columnWidths={[
                  "h-4 w-full max-w-48",
                  "h-4 w-full max-w-32",
                  "h-5 w-14 rounded-md",
                  "h-4 w-20",
                ]}
              />
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
