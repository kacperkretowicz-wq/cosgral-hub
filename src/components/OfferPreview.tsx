"use client";

import { OfferMessage } from "@/components/OfferMessage";
import type { Inspiration, PageType } from "@/lib/types";

interface OfferPreviewProps {
  companyName: string;
  industry?: string;
  pageType: PageType;
  deadline?: string;
  offerText: string;
  inspirations?: Inspiration[];
}

export function OfferPreview({
  companyName,
  industry,
  pageType,
  deadline,
  offerText,
  inspirations = [],
}: OfferPreviewProps) {
  if (!offerText.trim() || !companyName.trim()) {
    return (
      <p className="text-sm text-white/40">
        Wpisz nazwę firmy i treść oferty, żeby zobaczyć podgląd.
      </p>
    );
  }

  return (
    <div className="rounded-sm border border-white/10 bg-black/20 p-4 md:p-6">
      <OfferMessage
        data={{
          companyName,
          pageType,
          deadline: deadline ?? "",
          industry,
          inspirations,
        }}
        offerText={offerText}
        showMaterialsLink={false}
      />
    </div>
  );
}
