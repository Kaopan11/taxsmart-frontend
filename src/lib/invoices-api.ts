// ---------- Step 4: เรียก Nest API จาก Frontend ----------

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export type ApiOcrStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "DUPLICATE"; // Step F1: รองรับสถานะใบซ้ำจาก backend

/** ตอบจาก POST /invoices/upload (202) */
export type UploadResponse = {
  invoiceId: string;
  ocrStatus: ApiOcrStatus;
};

/** ตอบจาก GET /invoices/:id และ GET /invoices */
export type InvoiceApiResponse = {
  id: string;
  ocrStatus: ApiOcrStatus;
  merchantName: string | null;
  merchantTaxId: string | null;
  invoiceNumber: string | null;
  issueDate: string | null;
  totalAmount: string | null;
  /** รหัสหมวดจาก DB เช่น OFFICE_SUPPLIES (อาจเป็น null ในใบเก่า) */
  category?: string | null;
  rawOcrData: {
    storeName?: string | null;
    taxId?: string | null;
    invoiceNumber?: string | null;
    invoiceDate?: string | null;
    totalAmount?: number | null;
    category?: string | null;
    error?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

/** Query ของ GET /invoices?q=&status=&category= */
export type InvoiceListParams = {
  q?: string;
  status?: string;
  category?: string;
};

/** อัปโหลดไฟล์ → ได้ invoiceId ทันที (ไม่รอ Gemini) */
export async function uploadInvoice(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  // ชื่อ field ต้องเป็น "file" ให้ตรงกับ FileInterceptor('file') ฝั่ง Nest
  formData.append("file", file);

  const response = await fetch(`${API_URL}/invoices/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upload failed (${response.status}): ${text}`);
  }

  return response.json() as Promise<UploadResponse>;
}

/** อ่านสถานะใบเสร็จตาม id */
export async function getInvoiceById(
  id: string,
): Promise<InvoiceApiResponse> {
  const response = await fetch(`${API_URL}/invoices/${id}`);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Get invoice failed (${response.status}): ${text}`);
  }

  return response.json() as Promise<InvoiceApiResponse>;
}

/**
 * Step B (server filter): ดึงรายการพร้อม query
 * ตัวอย่าง: /invoices?q=7-Eleven&status=COMPLETED&category=Office%20Supplies
 */
export async function listInvoices(
  params: InvoiceListParams = {},
): Promise<InvoiceApiResponse[]> {
  const searchParams = new URLSearchParams();
  if (params.q?.trim()) {
    searchParams.set("q", params.q.trim());
  }
  if (params.status && params.status !== "all") {
    searchParams.set("status", params.status);
  }
  if (params.category?.trim()) {
    searchParams.set("category", params.category.trim());
  }

  const query = searchParams.toString();
  const url = query
    ? `${API_URL}/invoices?${query}`
    : `${API_URL}/invoices`;

  const response = await fetch(url);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`List invoices failed (${response.status}): ${text}`);
  }

  return response.json() as Promise<InvoiceApiResponse[]>;
}

/**
 * poll ซ้ำจนกว่าจบงาน OCR
 * จบเมื่อ COMPLETED | FAILED | DUPLICATE (ใบซ้ำก็ถือว่า process เสร็จแล้ว)
 */
export async function pollInvoiceUntilDone(
  id: string,
  intervalMs = 2000,
  maxAttempts = 60,
): Promise<InvoiceApiResponse> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const invoice = await getInvoiceById(id);

    // Step F1: ต้องหยุดเมื่อ DUPLICATE ด้วย ไม่งั้นจะ poll จน timeout
    if (
      invoice.ocrStatus === "COMPLETED" ||
      invoice.ocrStatus === "FAILED" ||
      invoice.ocrStatus === "DUPLICATE"
    ) {
      return invoice;
    }

    // ยัง PENDING / PROCESSING → รอแล้วถามใหม่
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("OCR timed out — try again later");
}
