// ---------- Ticket 01: เรียก Nest /tax (+ JWT P1 + refresh P2) ----------
// pattern เดียวกับ invoices-api.ts — แยก module เพื่อ Ticket 02 wire UI

import { apiFetch } from "@/lib/api-client";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

/** MVP: backend รองรับ rules ปี 2026 เท่านั้น */
export const DEFAULT_TAX_YEAR = 2026;

/** ตรงกับ TaxpayerType ใน Prisma / backend */
export type TaxpayerType = "INDIVIDUAL" | "CORPORATE";

export type TaxProfileResponse = {
  taxpayerType: TaxpayerType;
  estimatedIncome: number;
  taxYear: number;
  /** true = ยังไม่เคยบันทึก profile — backend คืน default */
  isDefault: boolean;
};

export type UpdateTaxProfileBody = {
  taxpayerType: TaxpayerType;
  estimatedIncome: number;
  taxYear: number;
};

export type TaxSavingsAssumptions = {
  taxYear: number;
  taxpayerType: TaxpayerType;
  estimatedIncome: number;
  profileIsDefault: boolean;
  rulesTaxYear: number;
};

export type TaxSavingsReadiness = {
  /** นับเข้าหักได้ */
  readyCount: number;
  /** COMPLETED แต่ข้อมูลไม่ครบ */
  reviewCount: number;
  /** DUPLICATE / FAILED / PENDING / PROCESSING / นอกปี */
  excludedCount: number;
};

/** Response ของ GET /tax/savings?year= */
export type TaxSavingsResponse = {
  taxSavings: number;
  deductibleExpenses: number;
  effectiveRate: number;
  assumptions: TaxSavingsAssumptions;
  readiness: TaxSavingsReadiness;
};

/**
 * ตรวจ response — 401 → UNAUTHORIZED (dashboard จับ redirect login)
 * error อื่น parse message จาก Nest ถ้าเป็น JSON
 */
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

/** GET /tax/profile — อ่าน profile ปัจจุบัน (หรือ default) */
export async function getTaxProfile(): Promise<TaxProfileResponse> {
  const response = await apiFetch(`${API_URL}/tax/profile`);
  await assertOk(response, "Get tax profile");
  return response.json() as Promise<TaxProfileResponse>;
}

/** PUT /tax/profile — บันทึกประเภทผู้เสียภาษี + รายได้ประมาณ */
export async function updateTaxProfile(
  body: UpdateTaxProfileBody,
): Promise<TaxProfileResponse> {
  const response = await apiFetch(`${API_URL}/tax/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await assertOk(response, "Update tax profile");
  return response.json() as Promise<TaxProfileResponse>;
}

/**
 * GET /tax/savings?year=
 * year บังคับ — backend 400 ถ้าไม่ส่งหรือปีไม่รองรับ
 */
export async function getTaxSavings(
  year: number = DEFAULT_TAX_YEAR,
): Promise<TaxSavingsResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set("year", String(year));

  const response = await apiFetch(
    `${API_URL}/tax/savings?${searchParams.toString()}`,
  );
  await assertOk(response, "Get tax savings");
  return response.json() as Promise<TaxSavingsResponse>;
}
