"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface DeleteRecordButtonProps {
  apiUrl: string;
  redirectTo: string;
  label?: string;
  confirmMessage: string;
  className?: string;
}

export function DeleteRecordButton({
  apiUrl,
  redirectTo,
  label = "Usuń",
  confirmMessage,
  className = "",
}: DeleteRecordButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm(confirmMessage)) return;

    setLoading(true);
    try {
      const res = await fetch(apiUrl, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Nie udało się usunąć rekordu.");
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      onClick={handleDelete}
      disabled={loading}
      className={`text-red-400/80 hover:text-red-300 hover:bg-red-500/10 ${className}`}
    >
      {loading ? "Usuwanie..." : label}
    </Button>
  );
}
