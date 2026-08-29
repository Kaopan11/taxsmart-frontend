"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { isAdminRole, type StoredAuthUser } from "@/lib/auth-storage";
import { NAV_COPY } from "@/lib/ui-copy";

/** หน้าไหนใช้ header แบบไหน — auth มีแค่ logo, ที่เหลือมี nav + user */
export type AppHeaderVariant = "auth" | "dashboard" | "admin";

type AppHeaderUser = Pick<StoredAuthUser, "fullName" | "email" | "role">;

type AppHeaderProps = {
  variant: AppHeaderVariant;
  user?: AppHeaderUser | null;
  onLogout?: () => void;
};

/** ลิงก์ nav — active = หน้าปัจจุบัน (font หนา + aria-current) */
function NavLink({
  href,
  active,
  children,
  className = "",
}: {
  href: string;
  active: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? `font-medium text-zinc-900 ${className}`
          : `text-zinc-600 hover:text-zinc-900 ${className}`
      }
    >
      {children}
    </Link>
  );
}

/** Logo ซ้าย — ใช้ทุก variant */
function BrandLogo() {
  return (
    <Link href="/" className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
        TS
      </div>
      <span className="text-lg font-semibold text-zinc-900">{NAV_COPY.brand}</span>
    </Link>
  );
}

/**
 * Ticket 06: Header ร่วมของ Dashboard / Admin / Auth
 * แทน markup ซ้ำ 3 ที่ — แต่ละหน้าส่ง variant + user + onLogout
 */
export function AppHeader({ variant, user, onLogout }: AppHeaderProps) {
  const displayName =
    user?.fullName || user?.email || NAV_COPY.defaultUser;

  return (
    <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
      <BrandLogo />

      {variant === "auth" ? null : (
        <div className="flex items-center gap-3 text-sm">
          {variant === "dashboard" && (
            <>
              {/* หน้า dashboard: เน้นว่าอยู่ Dashboard + ลิงก์ไป Admin ถ้าเป็น ADMIN */}
              <span className="font-medium text-zinc-900" aria-current="page">
                {NAV_COPY.dashboard}
              </span>
              {isAdminRole(user?.role) && (
                <Link
                  href="/admin"
                  className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-800 hover:bg-emerald-100"
                >
                  {NAV_COPY.admin}
                </Link>
              )}
            </>
          )}

          {variant === "admin" && (
            <>
              <NavLink href="/dashboard" active={false}>
                {NAV_COPY.dashboard}
              </NavLink>
              <span className="font-medium text-zinc-900" aria-current="page">
                {NAV_COPY.admin}
              </span>
            </>
          )}

          <span className="text-zinc-600">{displayName}</span>

          {variant === "admin" ? (
            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
              ADMIN
            </span>
          ) : (
            user?.role && (
              <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                {user.role}
              </span>
            )
          )}

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="rounded-md border border-zinc-300 px-3 py-1.5 hover:bg-zinc-50"
            >
              {NAV_COPY.logout}
            </button>
          )}
        </div>
      )}
    </header>
  );
}
