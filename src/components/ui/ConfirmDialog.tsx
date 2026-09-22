"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Portal } from "@/components/ui/Portal";

type Props = {
  open: boolean;
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Potwierdź",
  cancelLabel = "Anuluj",
  danger,
  busy,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;
  return (
    <Portal>
      <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center">
        <div
          className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0a0a] p-5 shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
        >
          <h2
            id="confirm-title"
            className="text-lg font-semibold tracking-tight text-white"
          >
            {title}
          </h2>
          {body ? (
            <div className="mt-2 text-sm leading-relaxed text-white/55">{body}</div>
          ) : null}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" type="button" onClick={onCancel} disabled={busy}>
              {cancelLabel}
            </Button>
            <Button
              variant={danger ? "danger" : "primary"}
              type="button"
              onClick={onConfirm}
              disabled={busy}
            >
              {busy ? "…" : confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
