/**
 * Session storage (access token + user)
 *
 * P5: ไม่มี demo user ใน frontend
 * Session มาจาก POST /auth/register หรือ /auth/login เท่านั้น
 * (backend ไม่ seed demo@taxsmart.local แล้ว)
 */

const TOKEN_KEY = "taxsmart_access_token";
const USER_KEY = "taxsmart_user";

export type StoredAuthUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
};

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): StoredAuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAuthUser;
  } catch {
    return null;
  }
}

export function setSession(accessToken: string, user: StoredAuthUser) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function setAccessToken(accessToken: string) {
  localStorage.setItem(TOKEN_KEY, accessToken);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isLoggedIn(): boolean {
  return Boolean(getAccessToken());
}

/** P3/P5: ใช้ซ้ำตอนโชว์ลิงก์ Admin */
export function isAdminRole(role?: string | null): boolean {
  return role === "ADMIN";
}

/** FE-1: หลัง login/register หรือ session มีอยู่แล้ว — redirect ตาม role */
export function getPostAuthPath(role?: string | null): string {
  return isAdminRole(role) ? "/admin" : "/dashboard";
}
