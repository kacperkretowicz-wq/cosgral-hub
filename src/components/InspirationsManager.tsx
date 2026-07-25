"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { InspirationsEditor } from "@/components/InspirationsEditor";
import type { Inspiration } from "@/lib/types";

interface Props {
  clientId: string;
  initialInspirations: Inspiration[];
}

export function InspirationsManager({ clientId, initialInspirations }: Props) {
  const [inspirations, setInspirations] = useState(initialInspirations);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setMessage("");

    const res = await fetch("/api/inspirations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, inspirations }),
    });

    setSaving(false);
    if (res.ok) {
      setMessage("Zapisano inspiracje — odśwież podgląd oferty.");
    } else {
      setMessage("Błąd zapisu inspiracji.");
    }
  };

  return (
    <GlassCard title="Inspiracje stron w ofercie">
      <div className="space-y-4">
        <InspirationsEditor value={inspirations} onChange={setInspirations} />

        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Zapisywanie..." : "Zapisz inspiracje"}
        </Button>

        {message && <p className="text-sm text-white/60">{message}</p>}
      </div>
    </GlassCard>
  );
}
