"use client";

import { useEffect, useMemo, useState } from "react";
import { ClosingCta } from "@/components/homepage/ClosingCta";
import { HeroSection } from "@/components/homepage/HeroSection";
import { HomeRecentInvoices } from "@/components/homepage/HomeRecentInvoices";
import { HomeSummaryCards } from "@/components/homepage/HomeSummaryCards";
import { LoggedInClosingCta } from "@/components/homepage/LoggedInClosingCta";
import { LoggedInHero } from "@/components/homepage/LoggedInHero";
import { ProductFeatures } from "@/components/homepage/ProductFeatures";
import { SiteNavbar } from "@/components/homepage/SiteNavbar";
import { useHomeSession } from "@/hooks/useHomeSession";
import {
  computeInvoiceSummary,
  countInvoiceStatuses,
  pickRecentInvoices,
} from "@/lib/invoice-display";
import {
  listInvoices,
  type InvoiceApiResponse,
} from "@/lib/invoices-api";

/**
 * Phase B: หน้าแรก — สลับ guest landing vs Welcome Hub หลัง login
 */
export function HomePageClient() {
  const { user, loggedIn, isAdmin, sessionChecked, displayName, logout } =
    useHomeSession();

  const [invoices, setInvoices] = useState<InvoiceApiResponse[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // โหลด invoice เมื่อ session พร้อม + login แล้วเท่านั้น
  useEffect(() => {
    if (!sessionChecked || !loggedIn) {
      setInvoices([]);
      return;
    }

    let cancelled = false;

    async function loadInvoices() {
      setLoadingInvoices(true);
      try {
        const rows = await listInvoices();
        if (!cancelled) {
          setInvoices(rows);
        }
      } catch {
        if (!cancelled) {
          setInvoices([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingInvoices(false);
        }
      }
    }

    void loadInvoices();
    return () => {
      cancelled = true;
    };
  }, [sessionChecked, loggedIn]);

  const summary = useMemo(
    () => computeInvoiceSummary(invoices),
    [invoices],
  );

  const statusCounts = useMemo(
    () => countInvoiceStatuses(invoices),
    [invoices],
  );

  const recentRows = useMemo(
    () => pickRecentInvoices(invoices),
    [invoices],
  );

  const hubLoading = !sessionChecked || loadingInvoices;

  return (
    <div className="flex min-h-screen flex-col bg-zinc-100 text-zinc-900">
      <SiteNavbar user={user} isAdmin={isAdmin} onLogout={logout} />

      <main className="flex-1">
        {loggedIn ? (
          <>
            <LoggedInHero
              displayName={displayName}
              statusCounts={
                hubLoading
                  ? { processing: 0, duplicate: 0, failed: 0 }
                  : statusCounts
              }
            />
            <HomeSummaryCards
              summary={sessionChecked ? summary : null}
              loading={hubLoading}
            />
            <HomeRecentInvoices rows={recentRows} loading={hubLoading} />
            <LoggedInClosingCta />
          </>
        ) : (
          <>
            <HeroSection />
            <ProductFeatures />
            <ClosingCta />
          </>
        )}
      </main>
    </div>
  );
}
