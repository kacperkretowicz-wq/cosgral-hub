import Link from "next/link";
import {
  getOfferFooter,
  getOfferSubject,
  type OfferData,
} from "@/lib/offer-templates";
import { resolveOfferText } from "@/lib/offer-content";
import type { OfferContent } from "@/lib/offer-content";
import { Button } from "./ui/Button";

interface OfferMessageProps {
  data: OfferData;
  offerText?: string | null;
  offerContent?: OfferContent | null;
  showMaterialsLink?: boolean;
  token?: string;
}

export function OfferMessage({
  data,
  offerText,
  offerContent,
  showMaterialsLink = true,
  token,
}: OfferMessageProps) {
  const body = resolveOfferText(offerText, offerContent, data);

  return (
    <article className="space-y-8">
      <header className="space-y-4">
        <p className="text-xs tracking-[0.2em] text-white/40 uppercase">
          Oferta materiałów
        </p>
        <h1 className="text-2xl leading-tight font-bold md:text-3xl">
          {getOfferSubject(data)}
        </h1>
      </header>

      <div className="space-y-4 text-sm leading-relaxed whitespace-pre-line text-white/80 md:text-base">
        {body}
      </div>

      <footer className="space-y-6 border-t border-white/10 pt-8">
        <p className="text-sm leading-relaxed whitespace-pre-line text-white/80">
          {getOfferFooter()}
        </p>

        {showMaterialsLink && token && (
          <div className="flex justify-center pt-4">
            <Link href={`/o/${token}/materialy`}>
              <Button className="px-10 py-4 text-base">
                Prześlij materiały →
              </Button>
            </Link>
          </div>
        )}
      </footer>
    </article>
  );
}
