import { refreshAccessToken } from "@/lib/auth-api";
import { getAccessToken } from "@/lib/auth-storage";

/**
 * P2: fetch กลาง — ใส่ Bearer + credentials
 * ถ้าได้ 401 จะลอง /auth/refresh หนึ่งครั้ง แล้ว retry
 */
export async function apiFetch(
  input: string,
  init: RequestInit = {},
  options?: { skipRefresh?: boolean },
): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(input, {
    ...init,
    headers,
    credentials: init.credentials ?? "include",
  });

  // ไม่ใช่ 401 หรือสั่งข้าม refresh → คืนตามเดิม
  if (response.status !== 401 || options?.skipRefresh) {
    return response;
  }

  const refreshed = await refreshAccessToken();
  if (!refreshed) {
    return response;
  }

  // retry ด้วย access token ใหม่
  const retryHeaders = new Headers(init.headers);
  const nextToken = getAccessToken();
  if (nextToken) {
    retryHeaders.set("Authorization", `Bearer ${nextToken}`);
  }

  return fetch(input, {
    ...init,
    headers: retryHeaders,
    credentials: init.credentials ?? "include",
  });
}
