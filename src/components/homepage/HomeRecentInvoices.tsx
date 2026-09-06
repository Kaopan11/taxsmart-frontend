import Link from "next/link";
import { SkeletonBar } from "@/components/skeletons/SkeletonBar";
import { TableBodySkeleton } from "@/components/skeletons/TableBodySkeleton";
import type { HomeInvoiceRow } from "@/lib/invoice-display";
import {
  ACTION_COPY,
  formatInvoiceStatus,
  HOMEPAGE_COPY,
  LOADING,
  viewInvoiceAriaLabel,
} from "@/lib/ui-copy";

const STATUS_STYLES: Record<
  HomeInvoiceRow["status"],
  string
> = {
  COMPLETED: "bg-emerald-100 text-emerald-800",
  PROCESSING: "bg-amber-100 text-amber-800",
  DUPLICATE: "bg-red-100 text-red-800",
  PENDING: "bg-zinc-100 text-zinc-700",
  FAILED: "bg-red-100 text-red-800",
};

type HomeRecentInvoicesProps = {
  rows: HomeInvoiceRow[];
  loading: boolean;
};

/**
 * Phase B: ตาราง 3 รายการล่าสุด — View ไป dashboard (เปิด review ที่นั่น)
 */
export function HomeRecentInvoices({ rows, loading }: HomeRecentInvoicesProps) {
  if (loading) {
    return (
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6" aria-busy="true">
        <SkeletonBar className="h-6 w-40" />
        <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50" aria-hidden>
              <tr>
                {[0, 1, 2, 3, 4].map((key) => (
                  <th key={key} className="px-4 py-3">
                    <SkeletonBar className="h-3 w-14" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody aria-label={LOADING.loadingInvoices}>
              <TableBodySkeleton
                rows={3}
                columnCount={5}
                columnWidths={[
                  "h-4 w-full max-w-40",
                  "h-4 w-20",
                  "h-4 w-16 ml-auto",
                  "h-5 w-16 rounded-full",
                  "h-7 w-12 rounded-md mx-auto",
                ]}
              />
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-xl font-semibold text-zinc-900">
          {HOMEPAGE_COPY.recentTitle}
        </h2>
        <Link
          href="/dashboard"
          className="min-h-11 inline-flex items-center text-sm font-medium text-emerald-700 hover:text-emerald-800"
        >
          {HOMEPAGE_COPY.seeAllDashboard} →
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-10 text-center text-sm text-zinc-600 sm:px-6">
          {HOMEPAGE_COPY.recentEmpty}
        </p>
      ) : (
        <>
          <ul className="mt-6 space-y-3 md:hidden">
            {rows.map((row) => (
              <li
                key={row.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-zinc-900">
                      {row.storeName}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">{row.date}</p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[row.status]}`}
                  >
                    {formatInvoiceStatus(row.status)}
                  </span>
                </div>
                <p className="mt-2 text-sm tabular-nums text-zinc-900">
                  {row.amount}
                </p>
                <Link
                  href={`/dashboard?invoice=${row.id}`}
                  className="mt-4 flex min-h-11 items-center justify-center rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100"
                  aria-label={viewInvoiceAriaLabel(row.storeName)}
                >
                  {ACTION_COPY.viewInvoice}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-6 hidden overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-4 py-3 font-medium">Store</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-center">
                  {ACTION_COPY.tableActions}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {row.storeName}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{row.date}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-900">
                    {row.amount}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[row.status]}`}
                    >
                      {formatInvoiceStatus(row.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link
                      href={`/dashboard?invoice=${row.id}`}
                      className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium hover:bg-zinc-100"
                      aria-label={viewInvoiceAriaLabel(row.storeName)}
                    >
                      {ACTION_COPY.viewInvoice}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </section>
  );
}
