"use client";

import { useEffect, useId, useRef } from "react";
import { ACTION_COPY } from "@/lib/ui-copy";

export type ConfirmDialogVariant = "default" | "destructive";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
  isLoading?: boolean;
  /** z-60 เมื่อซ้อนบน review modal (z-50) */
  stackOnTop?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Generic confirm dialog — แทน window.confirm
 * Esc = cancel · โฟกัสปุ่ม Cancel ตอนเปิด
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = ACTION_COPY.deleteInvoice,
  cancelLabel = ACTION_COPY.cancel,
  variant = "default",
  isLoading = false,
  stackOnTop = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    cancelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!isLoading) {
          onCancel();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, isLoading, onCancel]);

  if (!open) {
    return null;
  }

  const confirmClassName =
    variant === "destructive"
      ? "rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
      : "rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center bg-black/40 p-4 ${
        stackOnTop ? "z-60" : "z-50"
      }`}
      onClick={() => {
        if (!isLoading) {
          onCancel();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="text-lg font-semibold text-zinc-900">
          {title}
        </h2>
        <p className="mt-2 text-sm text-zinc-600">{message}</p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            ref={cancelRef}
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={confirmClassName}
          >
            {isLoading ? ACTION_COPY.deleting : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
