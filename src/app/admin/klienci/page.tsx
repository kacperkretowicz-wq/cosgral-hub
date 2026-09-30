"use client";

import { useEffect, useState } from "react";
import { KlienciListClient } from "@/components/KlienciListClient";
import type { CrmClient } from "@/lib/types";

export default function KlienciPage() {
  const [clients, setClients] = useState<CrmClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/crm-clients", { cache: "no-store" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Błąd ładowania");
        return;
      }
      const data = await res.json();
      setClients(Array.isArray(data) ? data : (data.clients ?? []));
    } catch {
      setError("Błąd sieci");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  return (
    <div>
      {error ? (
        <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-white/40 text-sm">
          Ładowanie klientów…
        </div>
      ) : (
        <KlienciListClient clients={clients} />
      )}
    </div>
  );
}
