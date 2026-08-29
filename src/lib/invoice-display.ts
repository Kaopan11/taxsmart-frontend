/**
 * Phase B: helper แสดงผล invoice — ใช้ร่วม homepage hub + ลด duplicate จาก dashboard
 */

import type { InvoiceApiResponse } from "@/lib/invoices-api";
import { EMPTY_CELL } from "@/lib/ui-copy";

export function parseAmount(value: string | null): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export function formatAmount(value: string | null): string {
  const n = parseAmount(value);
  if (n == null) return EMPTY_CELL;
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatBaht(n: number): string {
  return `฿ ${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatInvoiceDate(iso: string | null): string {
  if (!iso) return EMPTY_CELL;
  return iso.slice(0, 10);
}

export type HomeInvoiceRow = {
  id: string;
  storeName: string;
  date: string;
  amount: string;
  status: InvoiceApiResponse["ocrStatus"];
  createdAt: string;
};

export function mapApiToHomeRow(api: InvoiceApiResponse): HomeInvoiceRow {
  return {
    id: api.id,
    storeName: api.merchantName ?? EMPTY_CELL,
    date: formatInvoiceDate(api.issueDate),
    amount: formatAmount(api.totalAmount),
    status: api.ocrStatus,
    createdAt: api.createdAt,
  };
}

export type InvoiceSummary = {
  totalExpenses: number;
  taxSavings: number;
  totalCount: number;
};

/** การ์ดสรุป — logic เดียวกับ dashboard (COMPLETED only + ประมาณ 15%) */
export function computeInvoiceSummary(
  invoices: InvoiceApiResponse[],
): InvoiceSummary {
  const completed = invoices.filter((row) => row.ocrStatus === "COMPLETED");
  const totalExpenses = completed.reduce(
    (sum, row) => sum + (parseAmount(row.totalAmount) ?? 0),
    0,
  );

  return {
    totalExpenses,
    taxSavings: totalExpenses * 0.15,
    totalCount: invoices.length,
  };
}

export type InvoiceStatusCounts = {
  processing: number;
  duplicate: number;
  failed: number;
};

/** นับสถานะสำหรับ chip ใน LoggedInHero */
export function countInvoiceStatuses(
  invoices: InvoiceApiResponse[],
): InvoiceStatusCounts {
  let processing = 0;
  let duplicate = 0;
  let failed = 0;

  for (const invoice of invoices) {
    if (
      invoice.ocrStatus === "PENDING" ||
      invoice.ocrStatus === "PROCESSING"
    ) {
      processing += 1;
    } else if (invoice.ocrStatus === "DUPLICATE") {
      duplicate += 1;
    } else if (invoice.ocrStatus === "FAILED") {
      failed += 1;
    }
  }

  return { processing, duplicate, failed };
}

/** 3 รายการล่าสุด — sort จาก createdAt */
export function pickRecentInvoices(
  invoices: InvoiceApiResponse[],
  limit = 3,
): HomeInvoiceRow[] {
  return [...invoices]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, limit)
    .map(mapApiToHomeRow);
}
