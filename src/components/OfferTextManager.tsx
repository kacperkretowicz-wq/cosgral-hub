"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  OfferTextEditor,
  type OfferChatMessage,
} from "@/components/OfferTextEditor";

interface OfferTextManagerProps {
  clientId: string;
  companyName: string;
  industry?: string | null;
  pageType: "onepage" | "multipage";
  deadline?: string | null;
  initialOfferText: string | null;
}

export function OfferTextManager({
  clientId,
  companyName,
  industry,
  pageType,
  deadline,
  initialOfferText,
}: OfferTextManagerProps) {
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
    setMessage(res.ok ? "Zapisano treść oferty." : "Błąd zapisu treści oferty.");
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
      </div>
    </GlassCard>
  );
}
