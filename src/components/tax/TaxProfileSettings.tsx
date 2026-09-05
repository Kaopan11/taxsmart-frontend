"use client";

import { useEffect, useState } from "react";
import { DASHBOARD_COPY } from "@/lib/ui-copy";
import {
  DEFAULT_TAX_YEAR,
  getTaxProfile,
  updateTaxProfile,
  type TaxpayerType,
} from "@/lib/tax-api";

type TaxProfileSettingsProps = {
  /** Ticket 03: หลัง save สำเร็จ — parent refetch Tax Savings */
  onProfileSaved: () => void;
  onUnauthorized: () => void;
};

/**
 * Ticket 03: ฟอร์มสั้นตั้ง Tax Profile
 * โหลด GET /tax/profile เอง — Save เรียก PUT แล้วส่ง callback ให้ dashboard refetch savings
 */
export function TaxProfileSettings({
  onProfileSaved,
  onUnauthorized,
}: TaxProfileSettingsProps) {
  const [isLoading, setIsLoading] = useState(true);
  /** true = ยังไม่เคยบันทึก — แสดง banner ชวนตั้งรายได้ */
  const [profileIsDefault, setProfileIsDefault] = useState(true);

  const [taxpayerType, setTaxpayerType] = useState<TaxpayerType>("INDIVIDUAL");
  const [estimatedIncomeInput, setEstimatedIncomeInput] = useState("0");

  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Step 1: โหลด profile ปัจจุบัน (หรือ default จาก backend)
  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const profile = await getTaxProfile();
        if (cancelled) return;
        setProfileIsDefault(profile.isDefault);
        setTaxpayerType(profile.taxpayerType);
        setEstimatedIncomeInput(String(profile.estimatedIncome));
      } catch (error) {
        if (cancelled) return;
        if (error instanceof Error && error.message === "UNAUTHORIZED") {
          onUnauthorized();
          return;
        }
        setLoadError(DASHBOARD_COPY.taxProfileLoadFailed);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadProfile();
    return () => {
      cancelled = true;
    };
    // โหลดครั้งเดียวตอน mount — ไม่ผูก onUnauthorized เพื่อไม่ re-fetch loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSaveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (isSaving) return;

    setSaveError(null);
    setSaveMessage(null);

    // Step 2: validate ฝั่ง client — income ≥ 0
    const cleaned = estimatedIncomeInput.replace(/[฿,\s]/g, "").trim();
    const estimatedIncome = Number(cleaned);
    if (!Number.isFinite(estimatedIncome) || estimatedIncome < 0) {
      setSaveError(DASHBOARD_COPY.taxProfileIncomeInvalid);
      return;
    }

    setIsSaving(true);
    try {
      // Step 3: PUT profile → backend คำนวณ effective rate ใหม่
      const saved = await updateTaxProfile({
        taxpayerType,
        estimatedIncome,
        taxYear: DEFAULT_TAX_YEAR,
      });
      setProfileIsDefault(saved.isDefault);
      setTaxpayerType(saved.taxpayerType);
      setEstimatedIncomeInput(String(saved.estimatedIncome));
      setSaveMessage(DASHBOARD_COPY.taxProfileSaved);

      // Step 4: ให้ dashboard refetch GET /tax/savings — การ์ด Tax Savings อัปเดต
      onProfileSaved();
    } catch (error) {
      if (error instanceof Error && error.message === "UNAUTHORIZED") {
        onUnauthorized();
        return;
      }
      setSaveError(
        error instanceof Error ? error.message : "Save tax profile failed",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <section
        aria-busy="true"
        className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <p className="text-sm text-zinc-500">{DASHBOARD_COPY.taxProfileTitle}</p>
        <p className="mt-2 text-sm text-zinc-400">Loading…</p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      {/* Banner เฉพาะ user ที่ยังใช้ default profile (rate ~15%) */}
      {profileIsDefault && !loadError ? (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        >
          {DASHBOARD_COPY.taxProfileBanner}
        </div>
      ) : null}

      <form
        onSubmit={handleSaveProfile}
        className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <h2 className="text-sm font-medium text-zinc-900">
          {DASHBOARD_COPY.taxProfileTitle}
        </h2>

        {loadError ? (
          <p className="mt-2 text-sm text-red-600">{loadError}</p>
        ) : null}

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm">
            <span className="text-zinc-600">
              {DASHBOARD_COPY.taxProfileTypeLabel}
            </span>
            <select
              value={taxpayerType}
              onChange={(event) =>
                setTaxpayerType(event.target.value as TaxpayerType)
              }
              disabled={isSaving || Boolean(loadError)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm disabled:opacity-60"
            >
              <option value="INDIVIDUAL">
                {DASHBOARD_COPY.taxProfileIndividual}
              </option>
              <option value="CORPORATE">
                {DASHBOARD_COPY.taxProfileCorporate}
              </option>
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-zinc-600">
              {DASHBOARD_COPY.taxProfileIncomeLabel}
            </span>
            <input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={estimatedIncomeInput}
              onChange={(event) => setEstimatedIncomeInput(event.target.value)}
              disabled={isSaving || Boolean(loadError)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm disabled:opacity-60"
            />
          </label>

          <label className="block text-sm">
            <span className="text-zinc-600">
              {DASHBOARD_COPY.taxProfileYearLabel}
            </span>
            <input
              type="number"
              value={DEFAULT_TAX_YEAR}
              disabled
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500"
            />
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSaving || Boolean(loadError)}
              className="min-h-11 w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60 sm:w-auto"
            >
              {isSaving
                ? DASHBOARD_COPY.taxProfileSaving
                : DASHBOARD_COPY.taxProfileSave}
            </button>
          </div>
        </div>

        {saveError ? (
          <p className="mt-3 text-sm text-red-600">{saveError}</p>
        ) : null}
        {saveMessage ? (
          <p className="mt-3 text-sm text-emerald-700">{saveMessage}</p>
        ) : null}
      </form>
    </section>
  );
}
