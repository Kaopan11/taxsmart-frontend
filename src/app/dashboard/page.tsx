"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
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
  isAdminRole,
  type StoredAuthUser,
} from "@/lib/auth-storage";
import {
  getInvoiceById,
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
  /** URL รูป preview จากไฟล์ที่เลือก (blob:) — มีเฉพาะตอนอัปโหลดจาก browser */
  previewUrl?: string;
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

/** แปลงคำตอบ API → แถวในตาราง */
function mapApiToDashboard(
  api: InvoiceApiResponse,
  previewUrl?: string,
): DashboardInvoice {
  return {
    id: api.id,
    date: formatDate(api.issueDate),
    storeName: api.merchantName ?? "—",
    taxId: api.merchantTaxId ?? "—",
    invoiceNumber: api.invoiceNumber ?? "—",
    amount: formatAmount(api.totalAmount),
    amountNumber: parseAmount(api.totalAmount),
    status: api.ocrStatus,
    // ใช้คอลัมน์ category ก่อน ถ้าไม่มีค่อยอ่านจาก rawOcrData
    category: formatCategory(api.category ?? api.rawOcrData?.category),
    previewUrl,
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
      {status}
    </span>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // P1: รอเช็ก token ก่อนโชว์ dashboard
  const [authReady, setAuthReady] = useState(false);
  const [authUser, setAuthUser] = useState<StoredAuthUser | null>(null);

  // Step 5: เริ่มว่าง แล้วโหลดจาก GET /invoices
  const [invoices, setInvoices] = useState<DashboardInvoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] =
    useState<DashboardInvoice | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [formStoreName, setFormStoreName] = useState("");
  const [formTaxId, setFormTaxId] = useState("");
  const [formInvoiceNumber, setFormInvoiceNumber] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formCategory, setFormCategory] = useState("Other");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  // โหลดสรุปการ์ดครั้งเดียว (และหลังอัปโหลดจะ upsert แยก)
  useEffect(() => {
    if (!authReady) return;

    let cancelled = false;

    async function loadSummary() {
      try {
        const rows = await listInvoices();
        if (cancelled) return;
        setAllInvoices(rows.map((row) => mapApiToDashboard(row)));
      } catch (error) {
        if (error instanceof Error && error.message === "UNAUTHORIZED") {
          handleUnauthorized();
        }
      }
    }

    void loadSummary();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- P1: โหลดครั้งเดียวหลัง auth พร้อม
  }, [authReady]);

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

  // Step F9: การ์ดสรุปจากรายการเต็ม — ไม่ผูกกับ filter ของตาราง
  const summary = useMemo(() => {
    const completed = allInvoices.filter((row) => row.status === "COMPLETED");
    const totalExpenses = completed.reduce(
      (sum, row) => sum + (row.amountNumber ?? 0),
      0,
    );
    const taxSavings = totalExpenses * 0.15;

    return {
      totalExpenses,
      taxSavings,
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
      const mapped = mapApiToDashboard(done, previewUrl);
      upsertInvoice(mapped);

      // Step F2: แยกผลหลัง OCR จบ — DUPLICATE ไม่ใช่ error
      if (done.ocrStatus === "COMPLETED") {
        setSelectedInvoice(mapped);
        setUploadMessage("OCR completed");
      } else if (done.ocrStatus === "DUPLICATE") {
        setSelectedInvoice(mapped);
        setUploadMessage(
          "Duplicate receipt — same tax ID and invoice number already exist",
        );
      } else {
        setUploadError(
          done.rawOcrData?.error ?? "OCR failed — check backend logs",
        );
        setUploadMessage(null);
      }
    } catch (error) {
      if (error instanceof Error && error.message === "UNAUTHORIZED") {
        handleUnauthorized();
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

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    if (isUploading) return;
    const file = event.dataTransfer.files?.[0];
    if (file) {
      void handleFileSelected(file);
    }
  }

  async function openInvoice(invoice: DashboardInvoice) {
    try {
      const fresh = await getInvoiceById(invoice.id);
      setSelectedInvoice(mapApiToDashboard(fresh, invoice.previewUrl));
    } catch {
      setSelectedInvoice(invoice);
    }
  }

  useEffect(() => {
    if (!selectedInvoice) return;
    setFormStoreName(displayToFormValue(selectedInvoice.storeName));
    setFormTaxId(displayToFormValue(selectedInvoice.taxId));
    setFormInvoiceNumber(displayToFormValue(selectedInvoice.invoiceNumber));
    setFormDate(displayToFormValue(selectedInvoice.date));
    setFormAmount(displayToFormValue(selectedInvoice.amount));
    setFormCategory(selectedInvoice.category || "Other");
    setSaveError(null);
    setSaveMessage(null);
    // ผูกแค่ id — ไม่รีเซ็ตฟอร์มตอน Save อัปเดต object เดิม
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInvoice?.id]);

  function closeReviewModal() {
    setSelectedInvoice(null);
    setSaveError(null);
    setSaveMessage(null);
  }

  async function handleSave() {
    if (!selectedInvoice || !isSaveableStatus(selectedInvoice.status)) {
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
      const row = mapApiToDashboard(updated, selectedInvoice.previewUrl);
      upsertInvoice(row);
      setSelectedInvoice(row);
      setFormStoreName(displayToFormValue(row.storeName));
      setFormTaxId(displayToFormValue(row.taxId));
      setFormInvoiceNumber(displayToFormValue(row.invoiceNumber));
      setFormDate(displayToFormValue(row.date));
      setFormAmount(displayToFormValue(row.amount));
      setFormCategory(row.category || "Other");
      setSaveMessage("Saved");
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
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 text-sm text-zinc-500">
        Checking session…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
            TS
          </div>
          <span className="text-lg font-semibold">TaxSmart AI</span>
        </Link>
        <div className="flex items-center gap-3 text-sm">
          {/* P3: ลิงก์ Admin โชว์เฉพาะ ADMIN */}
          {isAdminRole(authUser?.role) && (
            <Link
              href="/admin"
              className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-800 hover:bg-emerald-100"
            >
              Admin
            </Link>
          )}
          <span className="text-zinc-600">
            {authUser?.fullName || authUser?.email || "User"}
          </span>
          {authUser?.role && (
            <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
              {authUser.role}
            </span>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md border border-zinc-300 px-3 py-1.5 hover:bg-zinc-50"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        {/* ---------- Step 5: การ์ดจาก DB ---------- */}
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
              {formatBaht(summary.taxSavings)}
            </p>
            <p className="mt-1 text-xs text-zinc-400">Estimate 15%</p>
          </article>
          <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">Total Invoices</p>
            <p className="mt-2 text-2xl font-semibold">
              {summary.totalCount} Items
            </p>
          </article>
        </section>

        <section
          className="rounded-xl border-2 border-dashed border-zinc-300 bg-white px-6 py-14 text-center"
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDrop}
        >
          <p className="text-base font-medium">
            Drag & Drop Receipt / Tax Invoice Image Here
          </p>
          <p className="mt-1 text-sm text-zinc-500">PNG, JPG, PDF (max 5MB)</p>

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
            className="mt-6 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUploading ? "Processing..." : "Choose File"}
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
              className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
            <select
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-600"
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
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-600"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "all" | InvoiceStatus)
              }
            >
              {STATUS_FILTER_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value === "all" ? "Status: All" : value}
                </option>
              ))}
            </select>
          </div>

          {listError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {listError}
            </p>
          )}

          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Store Name</th>
                    <th className="px-4 py-3 font-medium">Tax ID</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-center">Act</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {isLoadingList && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-zinc-500"
                      >
                        Loading invoices from database...
                      </td>
                    </tr>
                  )}

                  {!isLoadingList && allInvoices.length === 0 && !listError && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-zinc-500"
                      >
                        No invoices yet — upload a receipt to get started
                      </td>
                    </tr>
                  )}

                  {/* Step F8: มีข้อมูลทั้งระบบ แต่ filter บน server ไม่คืนแถว */}
                  {!isLoadingList &&
                    allInvoices.length > 0 &&
                    invoices.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-8 text-center text-zinc-500"
                        >
                          No invoices match your search / filters
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
                          <button
                            type="button"
                            onClick={() => void openInvoice(invoice)}
                            className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100"
                            aria-label={`View invoice ${invoice.storeName}`}
                          >
                            [ &gt; ]
                          </button>
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
              <button
                type="button"
                onClick={closeReviewModal}
                className="rounded-md px-2 py-1 text-zinc-500 hover:bg-zinc-100"
                aria-label="Close"
              >
                [ x ]
              </button>
            </div>

            <div className="grid flex-1 gap-0 overflow-y-auto md:grid-cols-2">
              <div className="border-b border-zinc-200 bg-zinc-50 p-5 md:border-b-0 md:border-r">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Image Preview
                </p>
                <div className="flex min-h-64 items-center justify-center overflow-hidden rounded-lg border border-dashed border-zinc-300 bg-white">
                  {selectedInvoice.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedInvoice.previewUrl}
                      alt="Receipt preview"
                      className="max-h-80 w-full object-contain"
                    />
                  ) : (
                    <p className="px-4 text-center text-sm text-zinc-400">
                      Original Receipt Image
                      <br />
                      (ไม่มี preview ใน browser — ยังไม่เสิร์ฟไฟล์จาก server)
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
                    disabled={isSaving || !isSaveableStatus(selectedInvoice.status)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
                  />
                </label>

                <label className="block text-sm">
                  <span className="text-zinc-600">Tax ID (13 digits)</span>
                  <input
                    type="text"
                    value={formTaxId}
                    onChange={(event) => setFormTaxId(event.target.value)}
                    disabled={isSaving || !isSaveableStatus(selectedInvoice.status)}
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
                    disabled={isSaving || !isSaveableStatus(selectedInvoice.status)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono"
                  />
                </label>

                <label className="block text-sm">
                  <span className="text-zinc-600">Invoice Date</span>
                  <input
                    type="text"
                    value={formDate}
                    onChange={(event) => setFormDate(event.target.value)}
                    placeholder="YYYY-MM-DD"
                    disabled={isSaving || !isSaveableStatus(selectedInvoice.status)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
                  />
                </label>

                <label className="block text-sm">
                  <span className="text-zinc-600">Total Amount (THB)</span>
                  <input
                    type="text"
                    value={formAmount}
                    onChange={(event) => setFormAmount(event.target.value)}
                    disabled={isSaving || !isSaveableStatus(selectedInvoice.status)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
                  />
                </label>

                <label className="block text-sm">
                  <span className="text-zinc-600">Tax Category</span>
                  <select
                    value={formCategory}
                    onChange={(event) => setFormCategory(event.target.value)}
                    disabled={isSaving || !isSaveableStatus(selectedInvoice.status)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
                  >
                    {CATEGORY_FILTER_OPTIONS.map((label) => (
                      <option key={label} value={label}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Step F3: ข้อความสถานะ — ใบซ้ำต้องชัดว่าไม่ใช่ error ทั่วไป */}
                <p
                  className={
                    selectedInvoice.status === "DUPLICATE"
                      ? "text-sm text-red-700"
                      : "text-sm text-amber-700"
                  }
                >
                  {selectedInvoice.status === "DUPLICATE"
                    ? "[!] Status: DUPLICATE — ใบนี้ซ้ำกับที่มีในระบบ (เลขผู้เสียภาษี + เลขที่บิล)"
                    : `[!] Status: ${selectedInvoice.status}`}
                </p>

                {saveError && (
                  <p className="text-sm text-red-600">{saveError}</p>
                )}
                {saveMessage && (
                  <p className="text-sm text-emerald-700">{saveMessage}</p>
                )}

                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={closeReviewModal}
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={
                      isSaving || !isSaveableStatus(selectedInvoice.status)
                    }
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save Invoice"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
