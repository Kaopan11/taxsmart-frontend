/**
 * Ticket 01 (feat/ui-polish): ข้อความ UI รวมที่เดียว — ภาษาอังกฤษทั้งแอป
 * ใช้แทนข้อความ hard-code / enum ดิบ / EN+TH ปนกัน
 */

/** ค่าว่างในตารางและฟอร์ม */
export const EMPTY_CELL = "—";

/** FE-1: ข้อความ validation ฝั่ง client — ให้ตรง backend auth UX */
export const AUTH_COPY = {
  loginMissingFields: "Please enter email and password.",
  registerMissingFields: "Please enter all required fields.",
  fullNameRequired: "Name is required",
  fullNameLength: "Name must be between 6 and 20 characters",
  passwordMinLength: "Password must be more than 8 characters",
  signInFailed: "Sign in failed",
  registerFailed: "Registration failed",
} as const;

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
  emptyUploadCta: "Upload your first receipt",
  noFilterMatch: "No invoices match your search or filters",
  noPreview: "No receipt file available",
  uploadZoneTitle: "Drag & Drop Receipt / Tax Invoice Image Here",
  uploadZoneSub: "PNG, JPG, PDF (max 5MB)",
  /** Ticket 05: ข้อความตอนลากไฟล์เข้า upload zone */
  uploadDropActive: "Drop to upload",
  chooseFile: "Choose File",
  tableCategory: "Category",
  uploadDuplicate:
    "Duplicate receipt — same tax ID and invoice number already exist",
  uploadOcrFailed: "OCR failed — try uploading again or check the file",
  saved: "Saved",
  /** Ticket 02: GET /tax/savings ล้มเหลว */
  taxSavingsUnavailable: "Estimate unavailable",
  /** Ticket 03: Tax Profile settings */
  taxProfileBanner: "ตั้งรายได้เพื่อ estimate ที่แม่นขึ้น",
  taxProfileTitle: "Tax estimate settings",
  taxProfileTypeLabel: "Taxpayer type",
  taxProfileIndividual: "Freelance (Individual)",
  taxProfileCorporate: "SME (Corporate)",
  taxProfileIncomeLabel: "Estimated annual income (฿)",
  taxProfileYearLabel: "Tax year",
  taxProfileSave: "Save profile",
  taxProfileSaving: "Saving…",
  taxProfileSaved: "Profile saved",
  taxProfileIncomeInvalid: "Income must be 0 or greater",
  taxProfileLoadFailed: "Could not load tax profile",
} as const;

/** Ticket 02: ปุ่ม action ในตาราง / modal */
export const ACTION_COPY = {
  tableActions: "Actions",
  viewInvoice: "View",
  deleteInvoice: "Delete",
  deleting: "Deleting…",
  close: "Close",
  closeModalAria: "Close review dialog",
  cancel: "Cancel",
  saveInvoice: "Save invoice",
  saving: "Saving…",
  /** แสดงใต้ปุ่ม Save เมื่อ disabled */
  saveDisabledDuplicate: "Can't save duplicate receipts.",
  saveDisabledOcr:
    "OCR is still running — you can save after processing finishes.",
} as const;

/** ข้อความ error ลบไม่สำเร็จ — แสดงใต้ตาราง */
export const DELETE_COPY = {
  failed: "Could not delete invoice. Please try again.",
} as const;

/** ConfirmDialog ก่อนลบ — ข้อความ minimal (ไม่โชว์ชื่อร้าน/ยอด) */
export const DELETE_CONFIRM_COPY = {
  title: "Delete invoice?",
  message:
    "This will permanently remove the invoice. This cannot be undone.",
} as const;

/** ข้อความสั้น ๆ ใต้ปุ่ม Save เมื่อกดไม่ได้ */
export function getSaveDisabledHint(status: string): string | null {
  if (status === "DUPLICATE") {
    return ACTION_COPY.saveDisabledDuplicate;
  }
  if (status === "PENDING" || status === "PROCESSING") {
    return ACTION_COPY.saveDisabledOcr;
  }
  return null;
}

/** aria-label สำหรับปุ่ม View ในแต่ละแถว */
export function viewInvoiceAriaLabel(storeName: string): string {
  return `View invoice for ${storeName}`;
}

/** aria-label สำหรับปุ่ม Delete ในแต่ละแถว */
export function deleteInvoiceAriaLabel(storeName: string): string {
  return `Delete invoice for ${storeName}`;
}

/** Ticket 06 + 03: ข้อความ navbar ร่วม (Dashboard / Admin / Log out / guest CTA) */
export const NAV_COPY = {
  brand: "TaxSmart AI",
  dashboard: "Dashboard",
  admin: "Admin",
  logout: "Log out",
  defaultUser: "User",
  /** หน้าแรก — guest ยังไม่ login */
  signIn: "Sign in",
  getStarted: "Get started",
  /** จอเล็ก — เปิด/ปิดเมนู nav */
  menu: "Menu",
  menuAria: "Open navigation menu",
} as const;

/** Phase B: หน้าแรกหลัง login — Welcome Hub */
export const HOMEPAGE_COPY = {
  welcome: (name: string) => `Welcome back, ${name}`,
  loggedInSub:
    "Review receipts, upload new ones, or jump to your full dashboard.",
  goToDashboard: "Go to Dashboard",
  uploadReceipt: "Upload receipt",
  /** chip สถานะใต้ headline */
  processingChip: (count: number) =>
    `${count} receipt${count === 1 ? "" : "s"} processing`,
  duplicateChip: (count: number) =>
    `${count} duplicate${count === 1 ? "" : "s"} need attention`,
  failedChip: (count: number) =>
    `${count} failed OCR — review in dashboard`,
  summaryTotalExpenses: "Total Expenses",
  summaryTotalExpensesHint: "COMPLETED only",
  summaryTaxSavings: "Tax Savings",
  /** Ticket 02: ใช้เมื่อ GET /tax/savings ล้มเหลว — หน้าไม่พัง */
  summaryTaxSavingsUnavailable: "Estimate unavailable",
  summaryTotalInvoices: "Total Invoices",
  recentTitle: "Recent receipts",
  recentEmpty: "No receipts yet — upload your first one from the dashboard.",
  seeAllDashboard: "See all in Dashboard",
  closingLoggedInTitle: "Your receipts are ready in the dashboard",
  closingLoggedInSub:
    "Upload, review OCR results, and track expenses in one place.",
  closingLoggedInCta: "Open Dashboard",
} as const;
