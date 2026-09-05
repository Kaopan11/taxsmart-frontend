"use client";

import { AppHeader } from "@/components/layout/AppHeader";
import { InvoiceMobileCardList } from "@/components/invoices/InvoiceMobileCardList";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DashboardAuthSkeleton } from "@/components/skeletons/DashboardAuthSkeleton";
import { InvoiceMobileCardSkeleton } from "@/components/skeletons/InvoiceMobileCardSkeleton";
import { SummaryCardsSkeleton } from "@/components/skeletons/SummaryCardsSkeleton";
import { TableBodySkeleton } from "@/components/skeletons/TableBodySkeleton";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { ensureSession, fetchMe, logoutRequest } from "@/lib/auth-api";
import {
  getStoredUser,
  type StoredAuthUser,
} from "@/lib/auth-storage";
import {
  ACTION_COPY,
  DASHBOARD_COPY,
  DELETE_CONFIRM_COPY,
  DELETE_COPY,
  EMPTY_CELL,
  formatInvoiceStatus,
  formatStatusFilterLabel,
  getInvoiceStatusHint,
  getSaveDisabledHint,
  LOADING,
  deleteInvoiceAriaLabel,
  viewInvoiceAriaLabel,
} from "@/lib/ui-copy";
import { formatTaxSavingsHint } from "@/lib/invoice-display";
import {
  DEFAULT_TAX_YEAR,
  getTaxSavings,
} from "@/lib/tax-api";
import {
  deleteInvoice,
  fetchInvoiceFileBlob,
  getInvoiceById,
  isInvoiceNotFoundError,
  listInvoices,
  pollInvoiceUntilDone,
  updateInvoice,
  uploadInvoice,
  type InvoiceApiResponse,
  type UpdateInvoiceBody,
} from "@/lib/invoices-api";

type InvoiceStatus =
  | "COMPLETED"
  | "PROCESSING"
  | "DUPLICATE"
  | "PENDING"
  | "FAILED";

type DashboardInvoice = {
  id: string;
  date: string;
  storeName: string;
  taxId: string;
  /** เลขที่บิล — ใช้คู่กับ taxId ตอนเช็กซ้ำฝั่ง backend */
  invoiceNumber: string;
  amount: string;
  /** ตัวเลขดิบสำหรับคำนวณการ์ดสรุป */
  amountNumber: number | null;
  status: InvoiceStatus;
  category: string;
  /** path จาก API — บอกว่ามีไฟล์บน server */
  fileUrl?: string | null;
  /** blob: จาก upload session นี้ — ใช้ก่อน fetch /file */
  previewUrl?: string;
  /** ใช้เลือก <img> vs <iframe> ตอน preview จาก upload */
  previewIsPdf?: boolean;
};

// แปลงหมวดจาก Gemini (OFFICE_SUPPLIES) เป็นข้อความในฟอร์ม
const CATEGORY_LABELS: Record<string, string> = {
  OFFICE_SUPPLIES: "Office Supplies",
  TRAVEL: "Travel",
  MEALS: "Meals",
  UTILITIES: "Utilities",
  INTERNET_PHONE: "Internet / Phone",
  PROFESSIONAL_SERVICES: "Professional Services",
  RENT: "Rent",
  TRAINING: "Training",
  OTHER: "Other",
};

// Step F7: รายการหมวดใน dropdown (ค่าที่โชว์ในตารางหลัง map)
const CATEGORY_FILTER_OPTIONS = Object.values(CATEGORY_LABELS);

const STATUS_FILTER_OPTIONS: Array<InvoiceStatus | "all"> = [
  "all",
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "DUPLICATE",
];

/** Ticket 05: จำนวนคอลัมน์ตาราง — ใช้ colSpan แถว empty/loading */
const INVOICE_TABLE_COL_COUNT = 7;

function formatCategory(raw?: string | null): string {
  if (!raw) return "Other";
  return CATEGORY_LABELS[raw] ?? raw;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

function parseAmount(value: string | null): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function formatAmount(value: string | null): string {
  const n = parseAmount(value);
  if (n == null) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatBaht(n: number): string {
  return `฿ ${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function isSaveableStatus(status: InvoiceStatus): boolean {
  return status === "COMPLETED" || status === "FAILED";
}

function displayToFormValue(value: string): string {
  return value === "—" ? "" : value;
}

function optionalTrimmed(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "—") return undefined;
  return trimmed;
}

function parseFormAmount(raw: string): number | undefined {
  const cleaned = raw.replace(/[฿,\s]/g, "").trim();
  if (!cleaned || cleaned === "—") return undefined;
  const n = Number(cleaned);
  return Number.isNaN(n) ? undefined : n;
}

function parseFormDate(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "—") return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  return undefined;
}

/** Ticket 04: ค่าที่ `<input type="date">` รับได้ — YYYY-MM-DD หรือว่าง */
function toDateInputValue(value: string): string {
  const raw = displayToFormValue(value);
  if (!raw) return "";
  return parseFormDate(raw) ?? "";
}

/** จาก fileUrl หรือ mime ว่าเป็น PDF หรือไม่ */
function isPdfPreview(fileUrl?: string | null, mime?: string): boolean {
  if (mime === "application/pdf") return true;
  return Boolean(fileUrl?.toLowerCase().endsWith(".pdf"));
}

/** แปลงคำตอบ API → แถวในตาราง */
function mapApiToDashboard(
  api: InvoiceApiResponse,
  options?: {
    previewUrl?: string;
    previewIsPdf?: boolean;
  },
): DashboardInvoice {
  return {
    id: api.id,
    date: formatDate(api.issueDate),
    storeName: api.merchantName ?? EMPTY_CELL,
    taxId: api.merchantTaxId ?? EMPTY_CELL,
    invoiceNumber: api.invoiceNumber ?? EMPTY_CELL,
    amount: formatAmount(api.totalAmount),
    amountNumber: parseAmount(api.totalAmount),
    status: api.ocrStatus,
    category: formatCategory(api.category ?? api.rawOcrData?.category),
    fileUrl: api.fileUrl ?? null,
    previewUrl: options?.previewUrl,
    previewIsPdf: options?.previewIsPdf,
  };
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const styles: Record<InvoiceStatus, string> = {
    COMPLETED: "bg-emerald-100 text-emerald-800",
    PROCESSING: "bg-amber-100 text-amber-800",
    DUPLICATE: "bg-red-100 text-red-800",
    PENDING: "bg-zinc-100 text-zinc-700",
    FAILED: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {formatInvoiceStatus(status)}
    </span>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  /** blob URL ที่ FE สร้างจาก GET /file — ต้อง revoke ตอนปิด modal */
  const serverPreviewUrlRef = useRef<string | null>(null);
  /** Ticket 04: โฟกัสปุ่ม Close ตอนเปิด dialog */
  const modalCloseRef = useRef<HTMLButtonElement>(null);

  // P1: รอเช็ก token ก่อนโชว์ dashboard
  const [authReady, setAuthReady] = useState(false);
  const [authUser, setAuthUser] = useState<StoredAuthUser | null>(null);

  // Step 5: เริ่มว่าง แล้วโหลดจาก GET /invoices
  const [invoices, setInvoices] = useState<DashboardInvoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] =
    useState<DashboardInvoice | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  /** Ticket 01 delete: id ของแถวที่กำลังลบ — disable ปุ่มเฉพาะแถวนั้น */
  const [deletingId, setDeletingId] = useState<string | null>(null);
  /** เปิด ConfirmDialog ก่อนเรียก API ลบ */
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  /** Ticket 02: ผูก deleteError กับ invoice — โชว์ใน modal เฉพาะใบที่ลบไม่สำเร็จ */
  const [deleteErrorInvoiceId, setDeleteErrorInvoiceId] = useState<string | null>(
    null,
  );

  const [formStoreName, setFormStoreName] = useState("");
  const [formTaxId, setFormTaxId] = useState("");
  const [formInvoiceNumber, setFormInvoiceNumber] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formCategory, setFormCategory] = useState("Other");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Ticket B: preview ใน modal (แยกจาก previewUrl บนแถวตาราง)
  const [modalPreviewUrl, setModalPreviewUrl] = useState<string | null>(null);
  const [modalPreviewIsPdf, setModalPreviewIsPdf] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  /** Ticket 05: ไฟล์ลากอยู่เหนือ upload zone — เปลี่ยนขอบ/พื้นหลัง */
  const [isDragOver, setIsDragOver] = useState(false);

  // ---------- Step F2: ค่า filter จากแถบค้นหา ----------
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | InvoiceStatus>(
    "all",
  );
  // debounce คำค้น — ไม่ยิง API ทุกครั้งที่พิมพ์
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // รายการเต็มสำหรับสรุปการ์ด (ไม่ใส่ filter)
  const [allInvoices, setAllInvoices] = useState<DashboardInvoice[]>([]);
  /** Ticket 07: โหลดการ์ดสรุปครั้งแรก — แสดง skeleton แทน 0 */
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  /** Ticket 02: Tax Savings จาก GET /tax/savings — ไม่ใช้ × 0.15 */
  const [taxSavingsAmount, setTaxSavingsAmount] = useState(0);
  const [taxSavingsHint, setTaxSavingsHint] = useState<string>(
    DASHBOARD_COPY.taxSavingsUnavailable,
  );

  // P2/P3: session + ดึง role ล่าสุดจาก GET /auth/me
  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      const ok = await ensureSession();
      if (cancelled) return;
      if (!ok) {
        router.replace("/login");
        return;
      }

      try {
        const me = await fetchMe();
        if (cancelled) return;
        setAuthUser(me);
      } catch {
        if (cancelled) return;
        // ถ้า /auth/me พัง ยังใช้ค่าใน localStorage ได้ชั่วคราว
        setAuthUser(getStoredUser());
      }
      setAuthReady(true);
    }

    void checkAuth();
    return () => {
      cancelled = true;
    };
  }, [router]);

  function handleUnauthorized() {
    void logoutRequest().then(() => {
      router.replace("/login");
    });
  }

  function handleLogout() {
    void logoutRequest().then(() => {
      router.push("/login");
    });
  }

  /**
   * Ticket 02: ดึง Tax Savings จาก backend — เรียกหลัง upload/save/delete
   * ไม่ block UI หลักถ้า fail (fallback 0 + hint unavailable)
   */
  const refetchTaxSavings = useCallback(async () => {
    try {
      const data = await getTaxSavings(DEFAULT_TAX_YEAR);
      setTaxSavingsAmount(data.taxSavings);
      setTaxSavingsHint(formatTaxSavingsHint(data.effectiveRate));
    } catch (error) {
      if (error instanceof Error && error.message === "UNAUTHORIZED") {
        handleUnauthorized();
        return;
      }
      setTaxSavingsAmount(0);
      setTaxSavingsHint(DASHBOARD_COPY.taxSavingsUnavailable);
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  // โหลดสรุปการ์ดครั้งเดียว (invoices + tax savings คู่กัน)
  useEffect(() => {
    if (!authReady) return;

    let cancelled = false;

    async function loadSummary() {
      setIsLoadingSummary(true);
      try {
        const [invoicesResult, savingsResult] = await Promise.allSettled([
          listInvoices(),
          getTaxSavings(DEFAULT_TAX_YEAR),
        ]);

        if (cancelled) return;

        if (invoicesResult.status === "fulfilled") {
          setAllInvoices(
            invoicesResult.value.map((row) => mapApiToDashboard(row)),
          );
        } else {
          const error = invoicesResult.reason;
          if (error instanceof Error && error.message === "UNAUTHORIZED") {
            handleUnauthorized();
            return;
          }
        }

        if (savingsResult.status === "fulfilled") {
          setTaxSavingsAmount(savingsResult.value.taxSavings);
          setTaxSavingsHint(
            formatTaxSavingsHint(savingsResult.value.effectiveRate),
          );
        } else {
          const error = savingsResult.reason;
          if (error instanceof Error && error.message === "UNAUTHORIZED") {
            handleUnauthorized();
            return;
          }
          setTaxSavingsAmount(0);
          setTaxSavingsHint(DASHBOARD_COPY.taxSavingsUnavailable);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSummary(false);
        }
      }
    }

    void loadSummary();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- P1: โหลดครั้งเดียวหลัง auth พร้อม
  }, [authReady]);

  // Phase B: เปิด modal จาก homepage (?invoice=id)
  useEffect(() => {
    if (!authReady) return;

    const invoiceId = searchParams.get("invoice");
    if (!invoiceId) return;

    let cancelled = false;

    void getInvoiceById(invoiceId)
      .then((api) => {
        if (cancelled) return;
        setSelectedInvoice(mapApiToDashboard(api));
      })
      .catch(() => {
        // ลิงก์เสีย — อยู่ dashboard ปกติ
      });

    return () => {
      cancelled = true;
    };
  }, [authReady, searchParams]);

  // Step B (server filter): โหลดตารางตาม q / status / category จาก Nest
  useEffect(() => {
    if (!authReady) return;

    let cancelled = false;

    async function loadInvoices() {
      setIsLoadingList(true);
      setListError(null);
      try {
        const rows = await listInvoices({
          q: debouncedSearch || undefined,
          status: statusFilter,
          category: categoryFilter || undefined,
        });
        if (cancelled) return;
        setInvoices(rows.map((row) => mapApiToDashboard(row)));
      } catch (error) {
        if (cancelled) return;
        if (error instanceof Error && error.message === "UNAUTHORIZED") {
          handleUnauthorized();
          return;
        }
        setListError(
          error instanceof Error ? error.message : "Failed to load invoices",
        );
      } finally {
        if (!cancelled) setIsLoadingList(false);
      }
    }

    void loadInvoices();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, debouncedSearch, categoryFilter, statusFilter]);

  // Step F9: Total Expenses + Total Invoices จาก allInvoices — Tax Savings มาจาก API
  const summary = useMemo(() => {
    const completed = allInvoices.filter((row) => row.status === "COMPLETED");
    const totalExpenses = completed.reduce(
      (sum, row) => sum + (row.amountNumber ?? 0),
      0,
    );

    return {
      totalExpenses,
      totalCount: allInvoices.length,
    };
  }, [allInvoices]);

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function upsertInvoice(row: DashboardInvoice) {
    setInvoices((prev) => {
      const without = prev.filter((item) => item.id !== row.id);
      return [row, ...without];
    });
    // อัปเดตการ์ดสรุปด้วย
    setAllInvoices((prev) => {
      const without = prev.filter((item) => item.id !== row.id);
      return [row, ...without];
    });
  }

  async function handleFileSelected(file: File) {
    setUploadError(null);
    setIsUploading(true);
    setUploadMessage("Uploading...");

    const previewUrl = URL.createObjectURL(file);

    try {
      const { invoiceId } = await uploadInvoice(file);

      upsertInvoice({
        id: invoiceId,
        date: "—",
        storeName: file.name,
        taxId: "—",
        invoiceNumber: "—",
        amount: "—",
        amountNumber: null,
        status: "PENDING",
        category: "Other",
        previewUrl,
      });

      setUploadMessage("OCR processing... polling status");

      const done = await pollInvoiceUntilDone(invoiceId);
      const mapped = mapApiToDashboard(done, {
        previewUrl,
        previewIsPdf: file.type === "application/pdf",
      });
      upsertInvoice(mapped);

      // Ticket 02: OCR จบ — ยอดหักได้/backend อาจเปลี่ยน
      void refetchTaxSavings();

      // Step F2: แยกผลหลัง OCR จบ — DUPLICATE ไม่ใช่ error
      if (done.ocrStatus === "COMPLETED") {
        setSelectedInvoice(mapped);
        setUploadMessage("OCR completed");
      } else if (done.ocrStatus === "DUPLICATE") {
        setSelectedInvoice(mapped);
        setUploadMessage(
          DASHBOARD_COPY.uploadDuplicate,
        );
      } else {
        setUploadError(
          done.rawOcrData?.error ?? DASHBOARD_COPY.uploadOcrFailed,
        );
        setUploadMessage(null);
      }
    } catch (error) {
      if (error instanceof Error && error.message === "UNAUTHORIZED") {
        handleUnauthorized();
        return;
      }
      if (isInvoiceNotFoundError(error)) {
        setUploadMessage(null);
        return;
      }
      const message =
        error instanceof Error ? error.message : "Upload failed";
      setUploadError(message);
      setUploadMessage(null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function onFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      void handleFileSelected(file);
    }
  }

  function onDragEnter(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    if (!isUploading) {
      setIsDragOver(true);
    }
  }

  function onDragOverZone(event: DragEvent<HTMLElement>) {
    event.preventDefault();
  }

  function onDragLeaveZone(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    const related = event.relatedTarget as Node | null;
    if (!event.currentTarget.contains(related)) {
      setIsDragOver(false);
    }
  }

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDragOver(false);
    if (isUploading) return;
    const file = event.dataTransfer.files?.[0];
    if (file) {
      void handleFileSelected(file);
    }
  }

  async function openInvoice(invoice: DashboardInvoice) {
    try {
      const fresh = await getInvoiceById(invoice.id);
      setSelectedInvoice(
        mapApiToDashboard(fresh, {
          previewUrl: invoice.previewUrl,
          previewIsPdf: invoice.previewIsPdf,
        }),
      );
    } catch {
      setSelectedInvoice(invoice);
    }
  }

  /** ล้าง blob URL ที่สร้างจาก GET /file */
  function revokeServerPreviewUrl() {
    if (serverPreviewUrlRef.current) {
      URL.revokeObjectURL(serverPreviewUrlRef.current);
      serverPreviewUrlRef.current = null;
    }
  }

  function resetModalPreview() {
    revokeServerPreviewUrl();
    setModalPreviewUrl(null);
    setModalPreviewIsPdf(false);
    setIsLoadingPreview(false);
    setPreviewError(null);
  }

  // Ticket B: โหลด preview เมื่อเปิด modal
  useEffect(() => {
    if (!selectedInvoice) {
      resetModalPreview();
      return;
    }

    // upload session — มี blob: อยู่แล้ว ไม่ต้อง fetch /file
    if (selectedInvoice.previewUrl?.startsWith("blob:")) {
      revokeServerPreviewUrl();
      setModalPreviewUrl(selectedInvoice.previewUrl);
      setModalPreviewIsPdf(
        selectedInvoice.previewIsPdf ??
          isPdfPreview(selectedInvoice.fileUrl),
      );
      setIsLoadingPreview(false);
      setPreviewError(null);
      return;
    }

    if (!selectedInvoice.fileUrl) {
      resetModalPreview();
      return;
    }

    let cancelled = false;
    revokeServerPreviewUrl();
    setModalPreviewUrl(null);
    setIsLoadingPreview(true);
    setPreviewError(null);

    void fetchInvoiceFileBlob(selectedInvoice.id)
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        serverPreviewUrlRef.current = url;
        setModalPreviewUrl(url);
        setModalPreviewIsPdf(
          isPdfPreview(selectedInvoice.fileUrl, blob.type),
        );
      })
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof Error && error.message === "UNAUTHORIZED") {
          handleUnauthorized();
          return;
        }
        setPreviewError(
          error instanceof Error ? error.message : "Failed to load preview",
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPreview(false);
      });

    return () => {
      cancelled = true;
      revokeServerPreviewUrl();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- โหลดใหม่เมื่อเปลี่ยน invoice
  }, [
    selectedInvoice?.id,
    selectedInvoice?.previewUrl,
    selectedInvoice?.fileUrl,
  ]);

  useEffect(() => {
    if (!selectedInvoice) return;
    setFormStoreName(displayToFormValue(selectedInvoice.storeName));
    setFormTaxId(displayToFormValue(selectedInvoice.taxId));
    setFormInvoiceNumber(displayToFormValue(selectedInvoice.invoiceNumber));
    setFormDate(toDateInputValue(selectedInvoice.date));
    setFormAmount(displayToFormValue(selectedInvoice.amount));
    setFormCategory(selectedInvoice.category || "Other");
    setSaveError(null);
    setSaveMessage(null);
    // ผูกแค่ id — ไม่รีเซ็ตฟอร์มตอน Save อัปเดต object เดิม
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInvoice?.id]);

  function closeReviewModal() {
    resetModalPreview();
    setSelectedInvoice(null);
    setSaveError(null);
    setSaveMessage(null);
  }

  /** Ticket 01 delete: ตัดออกจากตาราง + allInvoices → การ์ดสรุปอัปเดตจาก useMemo */
  function removeInvoice(id: string) {
    setInvoices((prev) => prev.filter((item) => item.id !== id));
    setAllInvoices((prev) => prev.filter((item) => item.id !== id));
    // ถ้า modal เปิดใบที่ลบอยู่ — ปิดและล้าง preview blob
    if (selectedInvoice?.id === id) {
      closeReviewModal();
    }
  }

  function requestDelete(id: string) {
    if (deletingId || pendingDeleteId) return;
    setDeleteError(null);
    setDeleteErrorInvoiceId(null);
    setPendingDeleteId(id);
  }

  function cancelDelete() {
    if (deletingId) return;
    setPendingDeleteId(null);
  }

  async function confirmDelete() {
    const id = pendingDeleteId;
    if (!id || deletingId) return;

    setDeletingId(id);
    setDeleteError(null);
    setDeleteErrorInvoiceId(null);

    try {
      await deleteInvoice(id);
      removeInvoice(id);
      setPendingDeleteId(null);
      // Ticket 02: ลบใบแล้ว — refetch savings
      void refetchTaxSavings();
      // Ticket 02 optional: ล้าง deep link ?invoice= หลังลบสำเร็จ
      if (searchParams.get("invoice") === id) {
        router.replace("/dashboard", { scroll: false });
      }
    } catch (error) {
      if (error instanceof Error && error.message === "UNAUTHORIZED") {
        handleUnauthorized();
        return;
      }
      setDeleteErrorInvoiceId(id);
      setDeleteError(
        error instanceof Error ? error.message : DELETE_COPY.failed,
      );
    } finally {
      setDeletingId(null);
    }
  }

  /** Ticket 02: ล็อกฟอร์ม/ปุ่ม modal ระหว่าง save หรือ delete */
  const isDeleteBusy = deletingId !== null || pendingDeleteId !== null;
  const isModalBusy = isSaving || isDeleteBusy;

  // Ticket 04 + 02: Esc ปิด modal — ไม่ปิดระหว่าง save/delete หรือเมื่อ ConfirmDialog เปิด
  useEffect(() => {
    if (!selectedInvoice || pendingDeleteId || isSaving || deletingId) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeReviewModal();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ผูกกับเปิด/ปิด modal
  }, [selectedInvoice, pendingDeleteId, isSaving, deletingId]);

  // Ticket 04: โฟกัสเข้า dialog เมื่อเปิด (a11y พื้นฐาน)
  useEffect(() => {
    if (selectedInvoice) {
      modalCloseRef.current?.focus();
    }
  }, [selectedInvoice?.id]);

  async function handleSave() {
    if (
      !selectedInvoice ||
      !isSaveableStatus(selectedInvoice.status) ||
      isModalBusy
    ) {
      return;
    }

    if (formAmount.trim() && formAmount.trim() !== "—" && parseFormAmount(formAmount) == null) {
      setSaveError("Total amount must be a number.");
      setSaveMessage(null);
      return;
    }

    if (formDate.trim() && formDate.trim() !== "—" && !parseFormDate(formDate)) {
      setSaveError("Invoice date must be YYYY-MM-DD.");
      setSaveMessage(null);
      return;
    }

    const body: UpdateInvoiceBody = {};
    const merchantName = optionalTrimmed(formStoreName);
    const merchantTaxId = optionalTrimmed(formTaxId);
    const invoiceNumber = optionalTrimmed(formInvoiceNumber);
    const issueDate = parseFormDate(formDate);
    const totalAmount = parseFormAmount(formAmount);
    const category = optionalTrimmed(formCategory);

    if (merchantName) body.merchantName = merchantName;
    if (merchantTaxId) body.merchantTaxId = merchantTaxId;
    if (invoiceNumber) body.invoiceNumber = invoiceNumber;
    if (issueDate) body.issueDate = issueDate;
    if (totalAmount !== undefined) body.totalAmount = totalAmount;
    if (category) body.category = category;

    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    try {
      const updated = await updateInvoice(selectedInvoice.id, body);
      const row = mapApiToDashboard(updated, {
        previewUrl: selectedInvoice.previewUrl,
        previewIsPdf: selectedInvoice.previewIsPdf,
      });
      upsertInvoice(row);
      setSelectedInvoice(row);
      setFormStoreName(displayToFormValue(row.storeName));
      setFormTaxId(displayToFormValue(row.taxId));
      setFormInvoiceNumber(displayToFormValue(row.invoiceNumber));
      setFormDate(toDateInputValue(row.date));
      setFormAmount(displayToFormValue(row.amount));
      setFormCategory(row.category || "Other");
      setSaveMessage(DASHBOARD_COPY.saved);
      // Ticket 02: แก้ใบแล้ว — readiness/amount อาจเปลี่ยน
      void refetchTaxSavings();
    } catch (error) {
      if (error instanceof Error && error.message === "UNAUTHORIZED") {
        handleUnauthorized();
        return;
      }
      setSaveError(
        error instanceof Error ? error.message : "Save invoice failed",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!authReady) {
    return <DashboardAuthSkeleton />;
  }

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <AppHeader
        variant="dashboard"
        user={authUser}
        onLogout={handleLogout}
      />

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        {/* ---------- Step 5: การ์ดจาก DB ---------- */}
        {isLoadingSummary ? (
          <SummaryCardsSkeleton />
        ) : (
          <section className="grid gap-4 sm:grid-cols-3">
            <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-zinc-500">Total Expenses</p>
              <p className="mt-2 text-2xl font-semibold">
                {formatBaht(summary.totalExpenses)}
              </p>
              <p className="mt-1 text-xs text-zinc-400">COMPLETED only</p>
            </article>
            <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-zinc-500">Tax Savings</p>
              <p className="mt-2 text-2xl font-semibold">
                {formatBaht(taxSavingsAmount)}
              </p>
              <p className="mt-1 text-xs text-zinc-400">{taxSavingsHint}</p>
            </article>
            <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-zinc-500">Total Invoices</p>
              <p className="mt-2 text-2xl font-semibold">
                {summary.totalCount} Items
              </p>
            </article>
          </section>
        )}

        <section
          id="upload-zone"
          className={
            isDragOver
              ? "rounded-xl border-2 border-dashed border-emerald-500 bg-emerald-50 px-4 py-10 text-center ring-2 ring-emerald-200 transition-colors sm:px-6 sm:py-14"
              : "rounded-xl border-2 border-dashed border-zinc-300 bg-white px-4 py-10 text-center transition-colors sm:px-6 sm:py-14"
          }
          onDragEnter={onDragEnter}
          onDragOver={onDragOverZone}
          onDragLeave={onDragLeaveZone}
          onDrop={onDrop}
        >
          <p className="text-base font-medium">
            {isDragOver
              ? DASHBOARD_COPY.uploadDropActive
              : DASHBOARD_COPY.uploadZoneTitle}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {DASHBOARD_COPY.uploadZoneSub}
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={onFileInputChange}
            disabled={isUploading}
          />

          <button
            type="button"
            onClick={openFilePicker}
            disabled={isUploading}
            className="mt-6 min-h-11 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUploading ? LOADING.processing : DASHBOARD_COPY.chooseFile}
          </button>

          {uploadMessage && (
            <p className="mt-3 text-sm text-emerald-700">{uploadMessage}</p>
          )}
          {uploadError && (
            <p className="mt-3 text-sm text-red-600">{uploadError}</p>
          )}
        </section>

        <section className="space-y-4">
          {/* ---------- Step F1: เปิดใช้ filter bar (เอา disabled ออก) ---------- */}
          <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:flex-row sm:items-center">
            <input
              type="search"
              placeholder="Search Store / Tax ID / Invoice No..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="min-h-11 flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
            <select
              className="min-h-11 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-600"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="">Filter Category</option>
              {CATEGORY_FILTER_OPTIONS.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
            <select
              className="min-h-11 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-600"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "all" | InvoiceStatus)
              }
            >
              {STATUS_FILTER_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {formatStatusFilterLabel(value)}
                </option>
              ))}
            </select>
          </div>

          {listError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {listError}
            </p>
          )}

          {deleteError &&
            !(
              selectedInvoice &&
              deleteErrorInvoiceId === selectedInvoice.id
            ) && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {deleteError}
            </p>
          )}

          {/* M3: card list บน mobile — ตารางเต็มอยู่ด้านล่าง (md+) */}
          {isLoadingList && <InvoiceMobileCardSkeleton rows={4} />}

          {!isLoadingList && allInvoices.length === 0 && !listError && (
            <div className="rounded-xl border border-zinc-200 bg-white px-4 py-12 text-center shadow-sm md:hidden">
              <p className="text-zinc-600">{DASHBOARD_COPY.emptyInvoices}</p>
              <button
                type="button"
                onClick={openFilePicker}
                disabled={isUploading}
                className="mt-4 min-h-11 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {DASHBOARD_COPY.emptyUploadCta}
              </button>
            </div>
          )}

          {!isLoadingList &&
            allInvoices.length > 0 &&
            invoices.length === 0 && (
              <p className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500 shadow-sm md:hidden">
                {DASHBOARD_COPY.noFilterMatch}
              </p>
            )}

          {!isLoadingList && invoices.length > 0 && (
            <InvoiceMobileCardList
              invoices={invoices}
              deletingId={deletingId}
              pendingDeleteId={pendingDeleteId}
              onView={(row) => {
                const invoice = invoices.find((item) => item.id === row.id);
                if (invoice) void openInvoice(invoice);
              }}
              onDelete={requestDelete}
            />
          )}

          <div className="hidden overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Store Name</th>
                    <th className="px-4 py-3 font-medium">
                      {DASHBOARD_COPY.tableCategory}
                    </th>
                    <th className="px-4 py-3 font-medium">Tax ID</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-center">
                      {ACTION_COPY.tableActions}
                    </th>
                  </tr>
                </thead>
                <tbody
                  className="divide-y divide-zinc-100"
                  aria-busy={isLoadingList || undefined}
                >
                  {isLoadingList && (
                    <TableBodySkeleton
                      rows={5}
                      columnCount={INVOICE_TABLE_COL_COUNT}
                      columnWidths={[
                        "h-4 w-20",
                        "h-4 w-full max-w-40",
                        "h-4 w-24",
                        "h-4 w-28 font-mono",
                        "h-4 w-16",
                        "h-5 w-16 rounded-full",
                        "h-7 w-24 rounded-md mx-auto max-w-24",
                      ]}
                    />
                  )}

                  {!isLoadingList && allInvoices.length === 0 && !listError && (
                    <tr>
                      <td
                        colSpan={INVOICE_TABLE_COL_COUNT}
                        className="px-4 py-12 text-center"
                      >
                        <p className="text-zinc-600">
                          {DASHBOARD_COPY.emptyInvoices}
                        </p>
                        {/* Ticket 05: CTA ชัด — เปิด file picker ทันที */}
                        <button
                          type="button"
                          onClick={openFilePicker}
                          disabled={isUploading}
                          className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {DASHBOARD_COPY.emptyUploadCta}
                        </button>
                      </td>
                    </tr>
                  )}

                  {/* Step F8: มีข้อมูลทั้งระบบ แต่ filter บน server ไม่คืนแถว */}
                  {!isLoadingList &&
                    allInvoices.length > 0 &&
                    invoices.length === 0 && (
                      <tr>
                        <td
                          colSpan={INVOICE_TABLE_COL_COUNT}
                          className="px-4 py-8 text-center text-zinc-500"
                        >
                          {DASHBOARD_COPY.noFilterMatch}
                        </td>
                      </tr>
                    )}

                  {!isLoadingList &&
                    invoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-zinc-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          {invoice.date}
                        </td>
                        <td className="px-4 py-3">{invoice.storeName}</td>
                        <td className="px-4 py-3 text-zinc-600">
                          {invoice.category}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {invoice.taxId}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          ฿ {invoice.amount}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={invoice.status} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => void openInvoice(invoice)}
                              disabled={deletingId === invoice.id}
                              className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label={viewInvoiceAriaLabel(invoice.storeName)}
                            >
                              {ACTION_COPY.viewInvoice}
                            </button>
                            <button
                              type="button"
                              onClick={() => requestDelete(invoice.id)}
                              disabled={
                                deletingId === invoice.id ||
                                pendingDeleteId !== null
                              }
                              className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label={deleteInvoiceAriaLabel(
                                invoice.storeName,
                              )}
                            >
                              {deletingId === invoice.id
                                ? ACTION_COPY.deleting
                                : ACTION_COPY.deleteInvoice}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            key={selectedInvoice.id}
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-title"
            className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
              <h2 id="review-title" className="text-lg font-semibold">
                Review & Verify Invoice Data
              </h2>
              {/* Ticket 02: ปุ่ม Close ชัด — ไม่ใช้ [ x ] placeholder */}
              <button
                type="button"
                ref={modalCloseRef}
                onClick={closeReviewModal}
                disabled={isModalBusy}
                className="rounded-md px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={ACTION_COPY.closeModalAria}
              >
                {ACTION_COPY.close}
              </button>
            </div>

            <div className="grid flex-1 gap-0 overflow-y-auto md:grid-cols-2">
              <div className="border-b border-zinc-200 bg-zinc-50 p-5 md:border-b-0 md:border-r">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Image Preview
                </p>
                <div className="flex min-h-64 items-center justify-center overflow-hidden rounded-lg border border-dashed border-zinc-300 bg-white">
                  {isLoadingPreview && (
                    <p className="px-4 text-center text-sm text-zinc-500">
                      {LOADING.loadingPreview}
                    </p>
                  )}
                  {!isLoadingPreview && previewError && (
                    <p className="px-4 text-center text-sm text-red-600">
                      {previewError}
                    </p>
                  )}
                  {!isLoadingPreview &&
                    !previewError &&
                    modalPreviewUrl &&
                    modalPreviewIsPdf && (
                      <iframe
                        src={modalPreviewUrl}
                        title="Receipt preview"
                        className="h-80 w-full"
                      />
                    )}
                  {!isLoadingPreview &&
                    !previewError &&
                    modalPreviewUrl &&
                    !modalPreviewIsPdf && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={modalPreviewUrl}
                        alt="Receipt preview"
                        className="max-h-80 w-full object-contain"
                      />
                    )}
                  {!isLoadingPreview &&
                    !previewError &&
                    !modalPreviewUrl && (
                      <p className="px-4 text-center text-sm text-zinc-400">
                        {DASHBOARD_COPY.noPreview}
                      </p>
                    )}
                </div>
              </div>

              <div className="space-y-4 p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Extracted Data Form
                </p>

                <label className="block text-sm">
                  <span className="text-zinc-600">Store Name / Vendor</span>
                  <input
                    type="text"
                    value={formStoreName}
                    onChange={(event) => setFormStoreName(event.target.value)}
                    disabled={
                      isModalBusy || !isSaveableStatus(selectedInvoice.status)
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
                  />
                </label>

                <label className="block text-sm">
                  <span className="text-zinc-600">Tax ID (13 digits)</span>
                  <input
                    type="text"
                    value={formTaxId}
                    onChange={(event) => setFormTaxId(event.target.value)}
                    disabled={
                      isModalBusy || !isSaveableStatus(selectedInvoice.status)
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono"
                  />
                </label>

                {/* Step F3: โชว์เลขที่บิล — คู่กับ Tax ID ที่ backend ใช้เช็กซ้ำ */}
                <label className="block text-sm">
                  <span className="text-zinc-600">Invoice Number</span>
                  <input
                    type="text"
                    value={formInvoiceNumber}
                    onChange={(event) =>
                      setFormInvoiceNumber(event.target.value)
                    }
                    disabled={
                      isModalBusy || !isSaveableStatus(selectedInvoice.status)
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono"
                  />
                </label>

                <label className="block text-sm">
                  <span className="text-zinc-600">Invoice Date</span>
                  {/* Ticket 04: date picker แทนพิมพ์ YYYY-MM-DD เอง */}
                  <input
                    type="date"
                    value={formDate}
                    onChange={(event) => setFormDate(event.target.value)}
                    disabled={
                      isModalBusy || !isSaveableStatus(selectedInvoice.status)
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
                  />
                </label>

                <label className="block text-sm">
                  <span className="text-zinc-600">Total Amount (THB)</span>
                  <input
                    type="text"
                    value={formAmount}
                    onChange={(event) => setFormAmount(event.target.value)}
                    disabled={
                      isModalBusy || !isSaveableStatus(selectedInvoice.status)
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
                  />
                </label>

                <label className="block text-sm">
                  <span className="text-zinc-600">Tax Category</span>
                  <select
                    value={formCategory}
                    onChange={(event) => setFormCategory(event.target.value)}
                    disabled={
                      isModalBusy || !isSaveableStatus(selectedInvoice.status)
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
                  >
                    {CATEGORY_FILTER_OPTIONS.map((label) => (
                      <option key={label} value={label}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Ticket 01: คำอธิบาย status แบบ user-facing (ไม่โชว์ enum ดิบ) */}
                <p
                  className={
                    selectedInvoice.status === "DUPLICATE"
                      ? "text-sm text-red-700"
                      : "text-sm text-amber-700"
                  }
                >
                  {getInvoiceStatusHint(selectedInvoice.status)}
                </p>

                {saveError && (
                  <p className="text-sm text-red-600">{saveError}</p>
                )}
                {saveMessage && (
                  <p className="text-sm text-emerald-700">{saveMessage}</p>
                )}
                {/* Ticket 02: error ลบใน modal — เฉพาะใบที่เปิด review อยู่ */}
                {deleteError &&
                  deleteErrorInvoiceId === selectedInvoice.id && (
                    <p className="text-sm text-red-600">{deleteError}</p>
                  )}

                {/* Ticket 02: Delete + Cancel ซ้าย · Save ขวา */}
                <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => requestDelete(selectedInvoice.id)}
                      disabled={isModalBusy}
                      className="min-h-11 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={deleteInvoiceAriaLabel(
                        selectedInvoice.storeName,
                      )}
                    >
                      {deletingId === selectedInvoice.id
                        ? ACTION_COPY.deleting
                        : ACTION_COPY.deleteInvoice}
                    </button>
                    <button
                      type="button"
                      onClick={closeReviewModal}
                      disabled={isModalBusy}
                      className="min-h-11 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {ACTION_COPY.cancel}
                    </button>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {!isSaveableStatus(selectedInvoice.status) &&
                      getSaveDisabledHint(selectedInvoice.status) && (
                        <p
                          className={
                            selectedInvoice.status === "DUPLICATE"
                              ? "max-w-xs text-right text-xs text-red-600"
                              : "max-w-xs text-right text-xs text-zinc-500"
                          }
                        >
                          {getSaveDisabledHint(selectedInvoice.status)}
                        </p>
                      )}
                    <button
                      type="button"
                      onClick={() => void handleSave()}
                      disabled={
                        isModalBusy ||
                        !isSaveableStatus(selectedInvoice.status)
                      }
                      className="min-h-11 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                      {isSaving
                        ? ACTION_COPY.saving
                        : ACTION_COPY.saveInvoice}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title={DELETE_CONFIRM_COPY.title}
        message={DELETE_CONFIRM_COPY.message}
        variant="destructive"
        confirmLabel={ACTION_COPY.deleteInvoice}
        isLoading={deletingId !== null}
        stackOnTop={selectedInvoice !== null}
        onConfirm={() => void confirmDelete()}
        onCancel={cancelDelete}
      />
    </div>
  );
}
