"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useState } from "react";
import { ensureSession, logoutRequest } from "@/lib/auth-api";
import {
  getStoredUser,
  isAdminRole,
  type StoredAuthUser,
} from "@/lib/auth-storage";
import { NAV_COPY } from "@/lib/ui-copy";

/**
 * Ticket 03 + Phase B: session หน้าแรก — optimistic UI
 * 1) อ่าน localStorage ก่อน paint
 * 2) reconcile ด้วย ensureSession() ในพื้นหลัง (ไม่ fetchMe)
 */
export function useHomeSession() {
  const router = useRouter();
  const [user, setUser] = useState<StoredAuthUser | null>(null);
  /** true หลัง ensureSession จบ — ใช้ก่อนยิง listInvoices */
  const [sessionChecked, setSessionChecked] = useState(false);

  useLayoutEffect(() => {
    setUser(getStoredUser());
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function reconcileSession() {
      const ok = await ensureSession();
      if (cancelled) return;

      setUser(ok ? getStoredUser() : null);
      setSessionChecked(true);
    }

    void reconcileSession();
    return () => {
      cancelled = true;
    };
  }, []);

  async function logout() {
    await logoutRequest();
    setUser(null);
    router.refresh();
  }

  const displayName =
    user?.fullName || user?.email || NAV_COPY.defaultUser;

  return {
    user,
    loggedIn: Boolean(user),
    isAdmin: isAdminRole(user?.role),
    sessionChecked,
    displayName,
    logout,
  };
}
