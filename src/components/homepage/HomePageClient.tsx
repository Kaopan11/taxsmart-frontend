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
  formatTaxSavingsHint,
  pickRecentInvoices,
} from "@/lib/invoice-display";
import {
  listInvoices,
  type InvoiceApiResponse,
} from "@/lib/invoices-api";
import {
  DEFAULT_TAX_YEAR,
  getTaxSavings,
} from "@/lib/tax-api";
import { HOMEPAGE_COPY } from "@/lib/ui-copy";

/**
 * Phase B: หน้าแรก — สลับ guest landing vs Welcome Hub หลัง login
 */
export function HomePageClient() {
  const { user, loggedIn, isAdmin, sessionChecked, displayName, logout } =
    useHomeSession();

  const [invoices, setInvoices] = useState<InvoiceApiResponse[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  /** Ticket 02: Tax Savings จาก API — แยกจาก computeInvoiceSummary */
  const [taxSavingsAmount, setTaxSavingsAmount] = useState(0);
  const [taxSavingsHint, setTaxSavingsHint] = useState<string>(
    HOMEPAGE_COPY.summaryTaxSavingsUnavailable,
  );
  const [loadingTaxSavings, setLoadingTaxSavings] = useState(false);

  // โหลด invoice + tax savings เมื่อ session พร้อม + login แล้วเท่านั้น
  useEffect(() => {
    if (!sessionChecked || !loggedIn) {
      setInvoices([]);
      setTaxSavingsAmount(0);
      setTaxSavingsHint(HOMEPAGE_COPY.summaryTaxSavingsUnavailable);
      return;
    }

    let cancelled = false;

    async function loadHubData() {
      setLoadingInvoices(true);
      setLoadingTaxSavings(true);

      const invoicesPromise = listInvoices().catch(() => [] as InvoiceApiResponse[]);
      const savingsPromise = getTaxSavings(DEFAULT_TAX_YEAR).catch(() => null);

      const [rows, savings] = await Promise.all([invoicesPromise, savingsPromise]);

      if (cancelled) return;

      setInvoices(rows);
      setLoadingInvoices(false);

      if (savings) {
        setTaxSavingsAmount(savings.taxSavings);
        setTaxSavingsHint(formatTaxSavingsHint(savings.effectiveRate));
      } else {
        setTaxSavingsAmount(0);
        setTaxSavingsHint(HOMEPAGE_COPY.summaryTaxSavingsUnavailable);
      }
      setLoadingTaxSavings(false);
    }

    void loadHubData();
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

  const hubLoading =
    !sessionChecked || loadingInvoices || loadingTaxSavings;

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
              taxSavingsAmount={taxSavingsAmount}
              taxSavingsHint={taxSavingsHint}
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
