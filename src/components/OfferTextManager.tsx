"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { OfferPreview } from "@/components/OfferPreview";
import {
  OfferTextEditor,
  type OfferChatMessage,
} from "@/components/OfferTextEditor";
import type { Inspiration } from "@/lib/types";

interface OfferTextManagerProps {
  clientId: string;
  companyName: string;
  industry?: string | null;
  pageType: "onepage" | "multipage";
  deadline?: string | null;
  initialOfferText: string | null;
  inspirations?: Inspiration[];
}

export function OfferTextManager({
  clientId,
  companyName,
  industry,
  pageType,
  deadline,
  initialOfferText,
  inspirations = [],
}: OfferTextManagerProps) {
  const router = useRouter();
  const [offerText, setOfferText] = useState(initialOfferText ?? "");
  const [chatMessages, setChatMessages] = useState<OfferChatMessage[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleSave = async () => {
    if (!offerText.trim()) return;

    setSaving(true);
    setMessage("");

    const res = await fetch(`/api/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offer_text: offerText }),
    });

    setSaving(false);

    if (!res.ok) {
      setMessage("Błąd zapisu treści oferty.");
      return;
    }

    setMessage("Zapisano treść oferty.");
    router.refresh();
  };

  return (
    <GlassCard title="Treść oferty">
      <div className="space-y-4">
        <OfferTextEditor
          value={offerText}
          onChange={setOfferText}
          companyName={companyName}
          industry={industry ?? ""}
          pageType={pageType}
          deadline={deadline ?? ""}
          chatMessages={chatMessages}
          onChatMessagesChange={setChatMessages}
        />

        {offerText.trim() && (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Zapisywanie..." : "Zapisz treść oferty"}
          </Button>
        )}

        {message && <p className="text-sm text-white/60">{message}</p>}

        {offerText.trim() && (
          <div className="space-y-2 border-t border-white/10 pt-4">
            <p className="text-sm font-medium text-white/80">
              Podgląd na żywo (tak zobaczy klient)
            </p>
            <OfferPreview
              companyName={companyName}
              industry={industry ?? undefined}
              pageType={pageType}
              deadline={deadline ?? undefined}
              offerText={offerText}
              inspirations={inspirations}
            />
          </div>
        )}
      </div>
    </GlassCard>
  );
}
