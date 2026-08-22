// ---------- Step 4: เรียก Nest API จาก Frontend ----------

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export type ApiOcrStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

/** ตอบจาก POST /invoices/upload (202) */
export type UploadResponse = {
  invoiceId: string;
  ocrStatus: ApiOcrStatus;
};

/** ตอบจาก GET /invoices/:id */
export type InvoiceApiResponse = {
  id: string;
  ocrStatus: ApiOcrStatus;
  merchantName: string | null;
  merchantTaxId: string | null;
  invoiceNumber: string | null;
  issueDate: string | null;
  totalAmount: string | null;
  rawOcrData: {
    storeName?: string | null;
    taxId?: string | null;
    invoiceDate?: string | null;
    totalAmount?: number | null;
    category?: string | null;
    error?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
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

/** Step 5: ดึงรายการใบทั้งหมดจาก MySQL */
export async function listInvoices(): Promise<InvoiceApiResponse[]> {
  const response = await fetch(`${API_URL}/invoices`);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`List invoices failed (${response.status}): ${text}`);
  }

  return response.json() as Promise<InvoiceApiResponse[]>;
}

/**
 * poll ซ้ำจนกว่า COMPLETED หรือ FAILED
 * intervalMs = หน่วงระหว่างรอบ (ค่าเริ่ม 2 วินาที)
 */
export async function pollInvoiceUntilDone(
  id: string,
  intervalMs = 2000,
  maxAttempts = 60,
): Promise<InvoiceApiResponse> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const invoice = await getInvoiceById(id);

    if (
      invoice.ocrStatus === "COMPLETED" ||
      invoice.ocrStatus === "FAILED"
    ) {
      return invoice;
    }

    // ยัง PENDING / PROCESSING → รอแล้วถามใหม่
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("OCR timed out — try again later");
}
