"use client";

import Link from "next/link";
import { useState } from "react";
import { isAdminRole, type StoredAuthUser } from "@/lib/auth-storage";
import { NAV_COPY } from "@/lib/ui-copy";

/** สไตล์ปุ่ม/ลิงก์ใน nav — ใช้ร่วม desktop + mobile dropdown */
const navLinkClass =
  "block rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100";
const navPrimaryClass =
  "block rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-emerald-700";
const navAdminClass =
  "block rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100";

type NavLinksProps = {
  loggedIn: boolean;
  isAdmin: boolean;
  onNavigate?: () => void;
  onLogout?: () => void;
  layout: "row" | "stack";
};

function NavLinks({
  loggedIn,
  isAdmin,
  onNavigate,
  onLogout,
  layout,
}: NavLinksProps) {
  const containerClass =
    layout === "row"
      ? "flex items-center gap-2 sm:gap-3"
      : "flex flex-col gap-1 p-2";

  if (!loggedIn) {
    return (
      <div className={containerClass}>
        <Link href="/login" className={navLinkClass} onClick={onNavigate}>
          {NAV_COPY.signIn}
        </Link>
        <Link href="/register" className={navPrimaryClass} onClick={onNavigate}>
          {NAV_COPY.getStarted}
        </Link>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <Link href="/dashboard" className={navPrimaryClass} onClick={onNavigate}>
        {NAV_COPY.dashboard}
      </Link>
      {isAdmin && (
        <Link href="/admin" className={navAdminClass} onClick={onNavigate}>
          {NAV_COPY.admin}
        </Link>
      )}
      {onLogout && (
        <button
          type="button"
          onClick={() => {
            onLogout();
            onNavigate?.();
          }}
          className={`${navLinkClass} w-full text-left`}
        >
          {NAV_COPY.logout}
        </button>
      )}
    </div>
  );
}

type SiteNavbarProps = {
  user: StoredAuthUser | null;
  isAdmin?: boolean;
  onLogout: () => void | Promise<void>;
};

/**
 * Ticket 03 + Phase B: Navbar หน้าแรก — session มาจาก HomePageClient (useHomeSession)
 */
export function SiteNavbar({
  user,
  isAdmin: isAdminProp,
  onLogout,
}: SiteNavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const loggedIn = Boolean(user);
  const isAdmin = isAdminProp ?? isAdminRole(user?.role);

  async function handleLogout() {
    await onLogout();
    setMenuOpen(false);
  }

  return (
    <header className="relative z-20 flex items-center justify-between border-b border-zinc-200/80 bg-white/80 px-4 py-4 backdrop-blur-sm sm:px-6">
      <Link href="/" className="flex min-w-0 shrink items-center gap-2 sm:gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
          TS
        </div>
        <span className="truncate text-base font-semibold text-zinc-900 sm:text-lg">
          {NAV_COPY.brand}
        </span>
      </Link>

      <nav className="hidden sm:block" aria-label="Main">
        <NavLinks
          loggedIn={loggedIn}
          isAdmin={isAdmin}
          onLogout={() => void handleLogout()}
          layout="row"
        />
      </nav>

      <div className="relative sm:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-label={NAV_COPY.menuAria}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
        >
          {NAV_COPY.menu}
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full z-30 mt-1 min-w-44 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
            <NavLinks
              loggedIn={loggedIn}
              isAdmin={isAdmin}
              onNavigate={() => setMenuOpen(false)}
              onLogout={() => void handleLogout()}
              layout="stack"
            />
          </div>
        )}
      </div>
    </header>
  );
}
