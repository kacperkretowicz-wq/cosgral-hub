"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

function formatApiError(data: unknown): string {
  if (!data || typeof data !== "object") return "Nie udało się usunąć rekordu.";
  const err = (data as { error?: unknown }).error;
  if (typeof err === "string") return err;
  if (Array.isArray(err)) return "Nie udało się usunąć — sprawdź dane.";
  return "Nie udało się usunąć rekordu.";
}

interface DeleteRecordButtonProps {
  apiUrl: string;
  /** Po usunięciu — odśwież listę bez przeładowania strony */
  onDeleted?: () => void;
  /** Gdy brak onDeleted — pełna nawigacja */
  redirectTo?: string;
  label?: string;
  confirmMessage: string;
  confirmTitle?: string;
  className?: string;
}

export function DeleteRecordButton({
  apiUrl,
  onDeleted,
  redirectTo,
  label = "Usuń",
  confirmMessage,
  confirmTitle = "Potwierdź usunięcie",
  className = "",
}: DeleteRecordButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(apiUrl, {
        method: "DELETE",
        cache: "no-store",
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(formatApiError(data));
        return;
      }
      setOpen(false);
      if (onDeleted) {
        await Promise.resolve(onDeleted());
      } else if (redirectTo) {
        window.location.assign(redirectTo);
      }
    } catch {
      setError("Błąd sieci — spróbuj ponownie.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setError("");
          setOpen(true);
        }}
        disabled={loading}
        className={`text-red-400/80 hover:bg-red-500/10 hover:text-red-300 ${className}`}
      >
        {loading ? "Usuwanie..." : label}
      </Button>
      <ConfirmDialog
        open={open}
        title={confirmTitle}
        body={
          <>
            {confirmMessage}
            {error ? (
              <p className="mt-3 text-sm text-red-300">{error}</p>
            ) : null}
          </>
        }
        confirmLabel="Usuń"
        danger
        busy={loading}
        onCancel={() => setOpen(false)}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}
