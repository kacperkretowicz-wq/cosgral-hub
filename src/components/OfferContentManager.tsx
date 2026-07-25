"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { OfferContentEditor } from "@/components/OfferContentEditor";
import type { OfferContent } from "@/lib/offer-content";

interface OfferContentManagerProps {
  clientId: string;
  companyName: string;
  industry?: string | null;
  pageType: "onepage" | "multipage";
  deadline?: string | null;
  initialOfferContent: OfferContent | null;
}

export function OfferContentManager({
  clientId,
  companyName,
  industry,
  pageType,
  deadline,
  initialOfferContent,
}: OfferContentManagerProps) {
  const [offerContent, setOfferContent] = useState<OfferContent | null>(
    initialOfferContent,
  );
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleGenerate = async () => {
    setGenerating(true);
    setMessage("");

    const res = await fetch("/api/offer/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company_name: companyName,
        industry: industry ?? undefined,
        page_type: pageType,
        deadline: deadline ?? undefined,
        use_gemini: true,
      }),
    });

    const data = await res.json();
    setGenerating(false);

    if (!res.ok) {
      setMessage(data.error ?? "Błąd generowania tekstu");
      return;
    }

    setOfferContent(data.offer_content);
    setMessage("Tekst wygenerowany — zapisz, żeby zaktualizować ofertę.");
  };

  const handleSave = async () => {
    if (!offerContent) return;

    setSaving(true);
    setMessage("");

    const res = await fetch(`/api/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offer_content: offerContent }),
    });

    setSaving(false);
    setMessage(res.ok ? "Zapisano tekst oferty." : "Błąd zapisu tekstu oferty.");
  };

  return (
    <GlassCard title="Tekst oferty">
      <div className="space-y-4">
        <OfferContentEditor
          value={offerContent}
          onChange={setOfferContent}
          onGenerate={handleGenerate}
          generating={generating}
          companyName={companyName}
        />

        {offerContent && (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Zapisywanie..." : "Zapisz tekst oferty"}
          </Button>
        )}

        {message && <p className="text-sm text-white/60">{message}</p>}
      </div>
    </GlassCard>
  );
}
