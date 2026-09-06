import { apiFetch } from "@/lib/api-client";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

/** แถวจาก GET /admin/users */
export type AdminUserRow = {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  createdAt: string;
};

/**
 * P3: รายชื่อ users ทั้งระบบ — ต้องเป็น ADMIN
 * ถ้าไม่ใช่ ADMIN Nest จะตอบ 403
 */
export async function listAdminUsers(): Promise<AdminUserRow[]> {
  const response = await apiFetch(`${API_URL}/admin/users`);

  if (response.status === 401) {
    throw new Error("UNAUTHORIZED");
  }
  if (response.status === 403) {
    throw new Error("FORBIDDEN");
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`List users failed (${response.status}): ${text}`);
  }

  return response.json() as Promise<AdminUserRow[]>;
}
