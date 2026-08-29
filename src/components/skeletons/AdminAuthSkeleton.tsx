import { SkeletonBar } from "@/components/skeletons/SkeletonBar";
import { TableBodySkeleton } from "@/components/skeletons/TableBodySkeleton";
import { LOADING } from "@/lib/ui-copy";

/** Ticket 07: skeleton หน้า Admin ตอนเช็คสิทธิ์ */
export function AdminAuthSkeleton() {
  return (
    <div
      className="min-h-screen bg-zinc-100 text-zinc-900"
      aria-busy="true"
      aria-label={LOADING.checkingAdminAccess}
    >
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <SkeletonBar className="h-9 w-9 rounded-lg" />
          <SkeletonBar className="h-5 w-28" />
        </div>
        <SkeletonBar className="hidden h-9 w-56 sm:block" />
      </div>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <div>
          <SkeletonBar className="h-8 w-24" />
          <SkeletonBar className="mt-2 h-4 w-64" />
        </div>
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
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
                  "h-4 w-full max-w-[12rem]",
                  "h-4 w-full max-w-[8rem]",
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
