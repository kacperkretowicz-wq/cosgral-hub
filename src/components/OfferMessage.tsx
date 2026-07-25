import Link from "next/link";
import type { Inspiration } from "@/lib/types";
import {
  getOfferClosing,
  getOfferFooter,
  getOfferIntro,
  getOfferSections,
  getOfferSubject,
  type OfferData,
} from "@/lib/offer-templates";
import { Button } from "./ui/Button";

interface OfferMessageProps {
  data: OfferData;
  showMaterialsLink?: boolean;
  token?: string;
}

export function OfferMessage({
  data,
  showMaterialsLink = true,
  token,
}: OfferMessageProps) {
  const sections = getOfferSections(data);
  const inspirations = data.inspirations ?? [];

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
        {getOfferIntro(data)}
      </div>

      {sections.map((section) => (
        <section key={section.title} className="space-y-3">
          <h2 className="text-lg font-bold">
            {section.number ? `${section.number}. ` : ""}
            {section.title}
          </h2>
          <ul className="space-y-2 text-sm leading-relaxed text-white/70 md:text-base">
            {section.items.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-white/40" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="text-sm leading-relaxed whitespace-pre-line text-white/80 md:text-base">
        {getOfferClosing(data)}
      </p>

      {inspirations.length > 0 && (
        <section className="space-y-6">
          {inspirations.map((insp: Inspiration, i: number) => (
            <div key={insp.name} className="glass rounded-lg p-6 space-y-3">
              <h3 className="text-base font-bold">
                {i + 1}. {insp.name}
              </h3>
              <p className="text-sm">
                <span className="text-white/50">Link: </span>
                <a
                  href={insp.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white underline underline-offset-2 hover:text-white/80"
                >
                  {insp.url}
                </a>
              </p>
              <p className="text-sm text-white/70">
                <span className="font-medium text-white/90">
                  Dlaczego ten wzór:{" "}
                </span>
                {insp.whyFit}
              </p>
              <p className="text-sm text-white/70">
                <span className="font-medium text-white/90">
                  Układ i wizualizacje:{" "}
                </span>
                {insp.layout}
              </p>
              <p className="text-sm text-white/70">
                <span className="font-medium text-white/90">
                  Dlaczego to działa:{" "}
                </span>
                {insp.whyWorks}
              </p>
            </div>
          ))}
        </section>
      )}

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
