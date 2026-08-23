import {
  clearSession,
  getAccessToken,
  setSession,
  type StoredAuthUser,
} from "@/lib/auth-storage";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export type AuthResponse = {
  accessToken: string;
  user: StoredAuthUser;
};

/** กันยิง /auth/refresh ซ้อนกันหลายครั้งพร้อมกัน */
let refreshInFlight: Promise<boolean> | null = null;

async function parseAuthError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as {
      message?: string | string[];
    };
    if (Array.isArray(data.message)) {
      return data.message.join(", ");
    }
    if (typeof data.message === "string") {
      return data.message;
    }
  } catch {
    // ignore
  }
  return `Request failed (${response.status})`;
}

/** POST /auth/login → เก็บ access + รับ refresh cookie จาก Nest */
export async function loginRequest(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(await parseAuthError(response));
  }

  const data = (await response.json()) as AuthResponse;
  setSession(data.accessToken, data.user);
  return data;
}

/** POST /auth/register */
export async function registerRequest(input: {
  email: string;
  password: string;
  fullName?: string;
}): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      ...(input.fullName?.trim()
        ? { fullName: input.fullName.trim() }
        : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(await parseAuthError(response));
  }

  const data = (await response.json()) as AuthResponse;
  setSession(data.accessToken, data.user);
  return data;
}

/**
 * P2: POST /auth/refresh — ส่ง httpOnly cookie อัตโนมัติ
 * สำเร็จ → อัปเดต accessToken (+ user) ใน localStorage
 */
export async function refreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        clearSession();
        return false;
      }

      const data = (await response.json()) as AuthResponse;
      setSession(data.accessToken, data.user);
      return true;
    } catch {
      clearSession();
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/**
 * มี access อยู่แล้ว → true
 * ไม่มี → ลอง refresh จาก cookie (กรณีเปิดแท็บใหม่หลัง access หมดอายุ)
 */
export async function ensureSession(): Promise<boolean> {
  if (getAccessToken()) {
    return true;
  }
  return refreshAccessToken();
}

/**
 * P3: GET /auth/me — ดึงโปรไฟล์ + role จาก server แล้วอัปเดต localStorage
 */
export async function fetchMe(): Promise<StoredAuthUser> {
  async function request(token: string | null) {
    return fetch(`${API_URL}/auth/me`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "include",
    });
  }

  let response = await request(getAccessToken());

  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      throw new Error("UNAUTHORIZED");
    }
    response = await request(getAccessToken());
  }

  if (!response.ok) {
    throw new Error(await parseAuthError(response));
  }

  const user = (await response.json()) as StoredAuthUser;
  const token = getAccessToken();
  if (token) {
    setSession(token, user);
  }
  return user;
}

/**
 * P2: เรียก Nest ลบ refresh + ล้าง cookie แล้วค่อยล้าง localStorage
 */
export async function logoutRequest(): Promise<void> {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // แม้ network พัง ก็ล้างฝั่ง client
  } finally {
    clearSession();
  }
}

/** @deprecated ใช้ logoutRequest — คงไว้กัน import เก่า */
export function logoutLocal() {
  clearSession();
}
