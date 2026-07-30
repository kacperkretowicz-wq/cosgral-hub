"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import type { OfferDocument } from "@/lib/offer-document";

interface Props {
  clientId: string;
  initialDocument: OfferDocument | null;
}

export function OfferDocumentManager({ clientId, initialDocument }: Props) {
  const router = useRouter();
  const [doc, setDoc] = useState<OfferDocument | null>(initialDocument);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  if (!doc) {
    return (
      <GlassCard title="Oferta Cosgral (dokument)">
        <p className="text-sm text-white/50">
          Brak strukturalnej oferty. Wygeneruj ją w{" "}
          <a href="/admin/generator" className="underline">
            Oferta
          </a>
          .
        </p>
      </GlassCard>
    );
  }

  const save = async () => {
    setSaving(true);
    setMessage("");
    const res = await fetch(`/api/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offer_document: doc, offer_ready: true }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(
        typeof data.error === "string" ? data.error : "Błąd zapisu oferty",
      );
      return;
    }
    setMessage("Zapisano ofertę Cosgral.");
    router.refresh();
  };

  return (
    <GlassCard title="Oferta Cosgral (edycja)">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs text-white/50">Tytuł okładki</label>
          <input
            value={doc.cover.title}
            onChange={(e) =>
              setDoc({
                ...doc,
                cover: { ...doc.cover, title: e.target.value },
              })
            }
            className="w-full rounded-sm border border-white/20 bg-white/5 px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-white/50">Podtytuł</label>
          <input
            value={doc.cover.subtitle}
            onChange={(e) =>
              setDoc({
                ...doc,
                cover: { ...doc.cover, subtitle: e.target.value },
              })
            }
            className="w-full rounded-sm border border-white/20 bg-white/5 px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-white/50">Cel — intro</label>
          <textarea
            value={doc.goal.intro}
            onChange={(e) =>
              setDoc({
                ...doc,
                goal: { ...doc.goal, intro: e.target.value },
              })
            }
            rows={4}
            className="w-full rounded-sm border border-white/20 bg-white/5 px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-white/50">
            Kierunek wizualny — rekomendacja
          </label>
          <textarea
            value={doc.visual_direction.recommendation}
            onChange={(e) =>
              setDoc({
                ...doc,
                visual_direction: {
                  ...doc.visual_direction,
                  recommendation: e.target.value,
                },
              })
            }
            rows={4}
            className="w-full rounded-sm border border-white/20 bg-white/5 px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-white/50">Link Drive (opcjonalnie)</label>
          <input
            value={doc.goal.drive_url ?? ""}
            onChange={(e) =>
              setDoc({
                ...doc,
                goal: {
                  ...doc.goal,
                  drive_url: e.target.value.trim() || null,
                },
              })
            }
            placeholder="https://drive.google.com/..."
            className="w-full rounded-sm border border-white/20 bg-white/5 px-3 py-2 text-sm"
          />
        </div>

        {message && (
          <p
            className={`text-xs ${
              message.includes("Zapisano") ? "text-green-300" : "text-red-300"
            }`}
          >
            {message}
          </p>
        )}
        <Button onClick={save} disabled={saving}>
          {saving ? "Zapisywanie…" : "Zapisz ofertę Cosgral"}
        </Button>
      </div>
    </GlassCard>
  );
}
