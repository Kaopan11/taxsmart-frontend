"use client";

import {
  ACTION_COPY,
  DASHBOARD_COPY,
  deleteInvoiceAriaLabel,
  formatInvoiceStatus,
  viewInvoiceAriaLabel,
} from "@/lib/ui-copy";

export type InvoiceCardRow = {
  id: string;
  date: string;
  storeName: string;
  category: string;
  taxId: string;
  amount: string;
  status: string;
};

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: "bg-emerald-100 text-emerald-800",
  PROCESSING: "bg-amber-100 text-amber-800",
  DUPLICATE: "bg-red-100 text-red-800",
  PENDING: "bg-zinc-100 text-zinc-700",
  FAILED: "bg-red-100 text-red-800",
};

type InvoiceMobileCardListProps = {
  invoices: InvoiceCardRow[];
  deletingId: string | null;
  pendingDeleteId: string | null;
  onView: (invoice: InvoiceCardRow) => void;
  onDelete: (id: string) => void;
};

/**
 * M3: รายการ invoice แบบ card — แสดงเฉพาะ mobile/tablet เล็ก (< md)
 * ตารางเต็มยังอยู่ที่ dashboard สำหรับ md+
 */
export function InvoiceMobileCardList({
  invoices,
  deletingId,
  pendingDeleteId,
  onView,
  onDelete,
}: InvoiceMobileCardListProps) {
  return (
    <ul className="space-y-3 md:hidden">
      {invoices.map((invoice) => (
        <li
          key={invoice.id}
          className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-zinc-900">
                {invoice.storeName}
              </p>
              <p className="mt-1 text-sm text-zinc-500">{invoice.date}</p>
            </div>
            <span
              className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                STATUS_STYLES[invoice.status] ?? "bg-zinc-100 text-zinc-700"
              }`}
            >
              {formatInvoiceStatus(invoice.status)}
            </span>
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <div>
              <dt className="text-xs text-zinc-500">{DASHBOARD_COPY.tableCategory}</dt>
              <dd className="text-zinc-700">{invoice.category}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Amount</dt>
              <dd className="tabular-nums text-zinc-900">฿ {invoice.amount}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-zinc-500">Tax ID</dt>
              <dd className="font-mono text-xs text-zinc-700">{invoice.taxId}</dd>
            </div>
          </dl>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => onView(invoice)}
              disabled={deletingId === invoice.id}
              className="min-h-11 flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={viewInvoiceAriaLabel(invoice.storeName)}
            >
              {ACTION_COPY.viewInvoice}
            </button>
            <button
              type="button"
              onClick={() => onDelete(invoice.id)}
              disabled={
                deletingId === invoice.id || pendingDeleteId !== null
              }
              className="min-h-11 flex-1 rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={deleteInvoiceAriaLabel(invoice.storeName)}
            >
              {deletingId === invoice.id
                ? ACTION_COPY.deleting
                : ACTION_COPY.deleteInvoice}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
