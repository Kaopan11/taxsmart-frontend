/**
 * Ticket 01 (feat/ui-polish): ข้อความ UI รวมที่เดียว — ภาษาอังกฤษทั้งแอป
 * ใช้แทนข้อความ hard-code / enum ดิบ / EN+TH ปนกัน
 */

/** ค่าว่างในตารางและฟอร์ม */
export const EMPTY_CELL = "—";

/** Loading — ใช้ชุดเดียวทุกหน้า */
export const LOADING = {
  checkingSession: "Checking session…",
  checkingAdminAccess: "Checking admin access…",
  loadingInvoices: "Loading invoices…",
  loadingPreview: "Loading preview…",
  loadingUsers: "Loading users…",
  processing: "Processing…",
} as const;

/** OCR / invoice status จาก API → label ที่ user อ่านได้ */
export const INVOICE_STATUS_LABELS = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  FAILED: "Failed",
  DUPLICATE: "Duplicate",
} as const;

export type InvoiceStatusKey = keyof typeof INVOICE_STATUS_LABELS;

export function formatInvoiceStatus(status: string): string {
  return (
    INVOICE_STATUS_LABELS[status as InvoiceStatusKey] ?? status
  );
}

/** Label ใน dropdown filter — value ยังเป็น enum ส่ง API */
export function formatStatusFilterLabel(
  value: InvoiceStatusKey | "all",
): string {
  if (value === "all") return "All statuses";
  return formatInvoiceStatus(value);
}

/** คำอธิบายสั้น ๆ ใน modal review (ไม่ใช่ข้อความ dev) */
export function getInvoiceStatusHint(status: string): string {
  switch (status) {
    case "DUPLICATE":
      return "This receipt matches an existing tax ID and invoice number in your account.";
    case "COMPLETED":
      return "OCR finished. Review the fields below and save if anything needs correction.";
    case "FAILED":
      return "OCR could not read this receipt. You can still edit fields manually and save.";
    case "PROCESSING":
      return "OCR is still running. Save is disabled until processing finishes.";
    case "PENDING":
      return "Waiting to start OCR. Save is disabled until processing finishes.";
    default:
      return `Status: ${formatInvoiceStatus(status)}`;
  }
}

export const ADMIN_COPY = {
  pageSubtitle: "Registered users in your TaxSmart workspace",
} as const;

export const DASHBOARD_COPY = {
  emptyInvoices: "No invoices yet — upload a receipt to get started",
  noFilterMatch: "No invoices match your search or filters",
  noPreview: "No receipt file available",
  uploadDuplicate:
    "Duplicate receipt — same tax ID and invoice number already exist",
  uploadOcrFailed: "OCR failed — try uploading again or check the file",
  saved: "Saved",
} as const;

/** Ticket 06: ข้อความ navbar ร่วม (Dashboard / Admin / Log out) */
export const NAV_COPY = {
  brand: "TaxSmart AI",
  dashboard: "Dashboard",
  admin: "Admin",
  logout: "Log out",
  defaultUser: "User",
} as const;
