// ---------- เรียก Nest invoices (+ JWT P1 + refresh P2) ----------

import { apiFetch } from "@/lib/api-client";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export type ApiOcrStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "DUPLICATE";

export type UploadResponse = {
  invoiceId: string;
  ocrStatus: ApiOcrStatus;
};

export type InvoiceApiResponse = {
  id: string;
  ocrStatus: ApiOcrStatus;
  merchantName: string | null;
  merchantTaxId: string | null;
  invoiceNumber: string | null;
  issueDate: string | null;
  totalAmount: string | null;
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

export type InvoiceListParams = {
  q?: string;
  status?: string;
  category?: string;
};

async function assertOk(response: Response, label: string) {
  if (response.ok) return;
  if (response.status === 401) {
    throw new Error("UNAUTHORIZED");
  }
  const text = await response.text();
  let detail = text;
  try {
    const data = JSON.parse(text) as { message?: string | string[] };
    if (Array.isArray(data.message)) {
      detail = data.message.join(", ");
    } else if (typeof data.message === "string") {
      detail = data.message;
    }
  } catch {
    // ใช้ข้อความดิบถ้าไม่ใช่ JSON
  }
  throw new Error(`${label} failed (${response.status}): ${detail}`);
}

export type UpdateInvoiceBody = {
  merchantName?: string;
  merchantTaxId?: string;
  invoiceNumber?: string;
  issueDate?: string;
  totalAmount?: number;
  category?: string;
};

/** อัปโหลดไฟล์ → ได้ invoiceId ทันที */
export async function uploadInvoice(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  // apiFetch: ใส่ Bearer + ถ้า 401 จะ refresh แล้วลองใหม่
  const response = await apiFetch(`${API_URL}/invoices/upload`, {
    method: "POST",
    body: formData,
  });

  await assertOk(response, "Upload");
  return response.json() as Promise<UploadResponse>;
}

export async function getInvoiceById(
  id: string,
): Promise<InvoiceApiResponse> {
  const response = await apiFetch(`${API_URL}/invoices/${id}`);
  await assertOk(response, "Get invoice");
  return response.json() as Promise<InvoiceApiResponse>;
}

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

  const response = await apiFetch(url);
  await assertOk(response, "List invoices");
  return response.json() as Promise<InvoiceApiResponse[]>;
}

export async function pollInvoiceUntilDone(
  id: string,
  intervalMs = 2000,
  maxAttempts = 60,
): Promise<InvoiceApiResponse> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const invoice = await getInvoiceById(id);

    if (
      invoice.ocrStatus === "COMPLETED" ||
      invoice.ocrStatus === "FAILED" ||
      invoice.ocrStatus === "DUPLICATE"
    ) {
      return invoice;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("OCR timed out — try again later");
}

export async function updateInvoice(
  id: string,
  body: UpdateInvoiceBody,
): Promise<InvoiceApiResponse> {
  const response = await apiFetch(`${API_URL}/invoices/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await assertOk(response, "Update invoice");
  return response.json() as Promise<InvoiceApiResponse>;
}
