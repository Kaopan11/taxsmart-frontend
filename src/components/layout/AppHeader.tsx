"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
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

const navLinkClass =
  "block rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 min-h-11";
const navActiveClass =
  "block rounded-lg bg-zinc-100 px-3 py-2.5 text-sm font-medium text-zinc-900 min-h-11";
const navAdminClass =
  "block rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100 min-h-11";

/** ลิงก์ nav — active = หน้าปัจจุบัน (font หนา + aria-current) */
function NavLink({
  href,
  active,
  children,
  className = "",
  onNavigate,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
  className?: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
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

/** Logo ซ้าย — truncate บน mobile (M1) */
function BrandLogo() {
  return (
    <Link href="/" className="flex min-w-0 shrink items-center gap-2 sm:gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
        TS
      </div>
      <span className="truncate text-base font-semibold text-zinc-900 sm:text-lg">
        {NAV_COPY.brand}
      </span>
    </Link>
  );
}

type AppNavLinksProps = {
  variant: Exclude<AppHeaderVariant, "auth">;
  user?: AppHeaderUser | null;
  displayName: string;
  onLogout?: () => void;
  onNavigate?: () => void;
  layout: "row" | "stack";
};

/** M1: ลิงก์ nav ร่วม — desktop แนวนอน / mobile dropdown แนวตั้ง */
function AppNavLinks({
  variant,
  user,
  displayName,
  onLogout,
  onNavigate,
  layout,
}: AppNavLinksProps) {
  const isStack = layout === "stack";
  const containerClass = isStack
    ? "flex flex-col gap-1 p-2"
    : "flex items-center gap-2 text-sm sm:gap-3";

  const activePageClass = isStack ? navActiveClass : "font-medium text-zinc-900";

  return (
    <div className={containerClass}>
      {variant === "dashboard" && (
        <>
          <span className={activePageClass} aria-current="page">
            {NAV_COPY.dashboard}
          </span>
          {isAdminRole(user?.role) &&
            (isStack ? (
              <Link href="/admin" className={navAdminClass} onClick={onNavigate}>
                {NAV_COPY.admin}
              </Link>
            ) : (
              <Link
                href="/admin"
                className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-800 hover:bg-emerald-100 min-h-11 inline-flex items-center"
              >
                {NAV_COPY.admin}
              </Link>
            ))}
        </>
      )}

      {variant === "admin" && (
        <>
          {isStack ? (
            <Link href="/dashboard" className={navLinkClass} onClick={onNavigate}>
              {NAV_COPY.dashboard}
            </Link>
          ) : (
            <NavLink href="/dashboard" active={false} onNavigate={onNavigate}>
              {NAV_COPY.dashboard}
            </NavLink>
          )}
          <span className={activePageClass} aria-current="page">
            {NAV_COPY.admin}
          </span>
        </>
      )}

      <span
        className={
          isStack
            ? "px-3 py-1 text-sm text-zinc-600"
            : "hidden text-zinc-600 lg:inline"
        }
      >
        {displayName}
      </span>

      {variant === "admin" ? (
        <span
          className={
            isStack
              ? "mx-3 w-fit rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800"
              : "rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800"
          }
        >
          ADMIN
        </span>
      ) : (
        user?.role && (
          <span
            className={
              isStack
                ? "mx-3 w-fit rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700"
                : "rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700"
            }
          >
            {user.role}
          </span>
        )
      )}

      {onLogout && (
        <button
          type="button"
          onClick={() => {
            onLogout();
            onNavigate?.();
          }}
          className={
            isStack
              ? `${navLinkClass} w-full text-left`
              : "rounded-md border border-zinc-300 px-3 py-1.5 hover:bg-zinc-50 min-h-11"
          }
        >
          {NAV_COPY.logout}
        </button>
      )}
    </div>
  );
}

/**
 * Ticket 06 + M1: Header ร่วม — mobile hamburger เหมือน SiteNavbar
 */
export function AppHeader({ variant, user, onLogout }: AppHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const displayName =
    user?.fullName || user?.email || NAV_COPY.defaultUser;

  return (
    <header className="relative z-20 flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-4 sm:px-6">
      <BrandLogo />

      {variant === "auth" ? null : (
        <>
          <nav className="hidden md:block" aria-label="Main">
            <AppNavLinks
              variant={variant}
              user={user}
              displayName={displayName}
              onLogout={onLogout}
              layout="row"
            />
          </nav>

          <div className="relative md:hidden">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-label={NAV_COPY.menuAria}
              className="min-h-11 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            >
              {NAV_COPY.menu}
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full z-30 mt-1 min-w-52 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                <AppNavLinks
                  variant={variant}
                  user={user}
                  displayName={displayName}
                  onLogout={onLogout}
                  onNavigate={() => setMenuOpen(false)}
                  layout="stack"
                />
              </div>
            )}
          </div>
        </>
      )}
    </header>
  );
}
