import type { OfferDocument } from "@/lib/offer-document";

interface OfferDocumentViewProps {
  document: OfferDocument;
  /** Light Juicy print style (default) vs dark admin preview */
  variant?: "print" | "dark";
  materialsHref?: string;
  showPrintButton?: boolean;
}

export function OfferDocumentView({
  document: doc,
  variant = "print",
  materialsHref,
  showPrintButton = false,
}: OfferDocumentViewProps) {
  const isPrint = variant === "print";
  const ink = isPrint ? "text-neutral-900" : "text-white";
  const muted = isPrint ? "text-neutral-500" : "text-white/50";
  const soft = isPrint ? "text-neutral-700" : "text-white/75";
  const rule = isPrint ? "border-neutral-200" : "border-white/15";
  const panel = isPrint ? "bg-white" : "bg-white/5";
  const accent = isPrint ? "bg-neutral-100" : "bg-white/5";

  return (
    <article
      className={`offer-document mx-auto max-w-3xl space-y-16 ${ink} ${panel} ${
        isPrint ? "px-6 py-10 md:px-12 md:py-14" : "p-6 md:p-10"
      }`}
    >
      {showPrintButton && (
        <div className="print:hidden flex justify-end gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-sm border border-neutral-300 px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-50"
          >
            Pobierz / drukuj PDF
          </button>
          {materialsHref && (
            <a
              href={materialsHref}
              className="rounded-sm bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
            >
              Prześlij materiały →
            </a>
          )}
        </div>
      )}

      {/* Cover */}
      <header className="space-y-8">
        <p className={`text-[11px] tracking-[0.35em] uppercase ${muted}`}>
          {doc.cover.eyebrow}
        </p>
        <div className="space-y-3">
          <p className={`text-sm tracking-[0.2em] uppercase ${muted}`}>
            Cosgral × {doc.cover.client_name}
          </p>
          <h1 className="font-serif text-5xl leading-none tracking-tight md:text-7xl">
            {doc.cover.title}
          </h1>
          <p className={`max-w-xl text-base leading-relaxed ${soft}`}>
            {doc.cover.subtitle}
          </p>
        </div>
        <div className={`flex items-end justify-between border-t pt-4 ${rule}`}>
          <p className={`text-xs tracking-[0.2em] uppercase ${muted}`}>
            Cosgral.agency
          </p>
          <p className={`text-sm ${soft}`}>{doc.cover.prepared_for}</p>
        </div>
      </header>

      {/* TOC */}
      <section className="space-y-6">
        <p className={`text-[11px] tracking-[0.35em] uppercase ${muted}`}>
          Spis treści
        </p>
        <ol className="space-y-3">
          {doc.toc.map((item) => (
            <li
              key={item.number}
              className={`flex items-baseline justify-between gap-4 border-b pb-3 ${rule}`}
            >
              <span className="flex gap-4 text-sm">
                <span className={muted}>{item.number}</span>
                <span>{item.title}</span>
              </span>
              <span className={`shrink-0 text-xs ${muted}`}>{item.pages}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Goal */}
      <section className="space-y-8">
        <div className="space-y-2">
          <p className={`text-[11px] tracking-[0.35em] uppercase ${muted}`}>
            01 · Cel projektu
          </p>
          <h2 className="font-serif text-3xl leading-tight md:text-4xl">
            {doc.goal.heading}
          </h2>
        </div>
        <p className={`whitespace-pre-wrap text-sm leading-relaxed ${soft}`}>
          {doc.goal.intro}
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {doc.goal.process.map((step) => (
            <div key={step.number} className={`space-y-2 p-4 ${accent}`}>
              <p className={`text-xs tracking-[0.2em] uppercase ${muted}`}>
                {step.number}
              </p>
              <h3 className="font-medium">{step.title}</h3>
              <p className={`text-sm leading-relaxed ${soft}`}>{step.body}</p>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <h3 className="text-sm font-medium tracking-wide uppercase">
            {doc.goal.why_now_heading}
          </h3>
          <ul className="space-y-2">
            {doc.goal.why_now.map((item) => (
              <li key={item} className={`text-sm leading-relaxed ${soft}`}>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className={`border-l-2 pl-4 ${rule}`}>
          <p className={`text-xs tracking-[0.2em] uppercase ${muted}`}>
            Gdzie przesyłać materiały
          </p>
          <p className={`mt-2 whitespace-pre-wrap text-sm ${soft}`}>
            {doc.goal.materials_deadline_note}
          </p>
        </div>
      </section>

      {/* Materials */}
      <section className="space-y-8">
        <div className="space-y-2">
          <p className={`text-[11px] tracking-[0.35em] uppercase ${muted}`}>
            {doc.materials_intro.part_label}
          </p>
          <h2 className="font-serif text-3xl md:text-4xl">
            {doc.materials_intro.heading}
          </h2>
          <p className={`text-sm leading-relaxed ${soft}`}>
            {doc.materials_intro.body}
          </p>
        </div>
        <div className="space-y-8">
          {doc.material_sections.map((section) => (
            <div key={section.number} className="space-y-3">
              <div className="flex items-baseline gap-3">
                <span className={`text-xs ${muted}`}>SEKCJA {section.number}</span>
                <h3 className="text-lg font-medium">{section.title}</h3>
              </div>
              <ul className="space-y-2">
                {section.items.map((item) => (
                  <li key={item} className={`text-sm leading-relaxed ${soft}`}>
                    {item}
                  </li>
                ))}
              </ul>
              {section.note && (
                <p className={`text-xs italic ${muted}`}>{section.note}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Portfolio */}
      <section className="space-y-6">
        <div className="space-y-2">
          <p className={`text-[11px] tracking-[0.35em] uppercase ${muted}`}>
            03 · Portfolio
          </p>
          <h2 className="font-serif text-3xl md:text-4xl">
            {doc.portfolio.heading}
          </h2>
          <p className={`text-sm leading-relaxed ${soft}`}>
            {doc.portfolio.intro}
          </p>
        </div>
        {[doc.portfolio.top, doc.portfolio.list, doc.portfolio.social_proof].map(
          (block) => (
            <div key={block.title} className={`space-y-2 border-t pt-4 ${rule}`}>
              <h3 className="font-medium">{block.title}</h3>
              <ul className="space-y-2">
                {block.items.map((item) => (
                  <li key={item} className={`text-sm leading-relaxed ${soft}`}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ),
        )}
      </section>

      {/* Contact / branding */}
      <section className="space-y-6">
        <div className="space-y-2">
          <p className={`text-[11px] tracking-[0.35em] uppercase ${muted}`}>
            04 · Kontakt i branding
          </p>
          <h2 className="font-serif text-3xl md:text-4xl">
            {doc.contact_branding.heading}
          </h2>
        </div>
        {[
          doc.contact_branding.contact,
          doc.contact_branding.branding,
          doc.contact_branding.access,
        ].map((block) => (
          <div key={block.title} className="space-y-2">
            <h3 className="text-sm font-medium tracking-wide uppercase">
              {block.title}
            </h3>
            <ul className="space-y-2">
              {block.items.map((item) => (
                <li key={item} className={`text-sm leading-relaxed ${soft}`}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <p className={`text-sm italic ${muted}`}>{doc.contact_branding.note}</p>
      </section>

      {/* Visual direction */}
      <section className="space-y-8">
        <div className="space-y-2">
          <p className={`text-[11px] tracking-[0.35em] uppercase ${muted}`}>
            {doc.visual_direction.part_label}
          </p>
          <h2 className="font-serif text-3xl md:text-4xl">
            {doc.visual_direction.heading}
          </h2>
          <p className={`text-sm leading-relaxed ${soft}`}>
            {doc.visual_direction.intro}
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {doc.visual_direction.patterns.map((pattern, index) => (
            <div key={pattern.id} className={`space-y-2 border-t pt-4 ${rule}`}>
              <p className={`text-xs ${muted}`}>
                WZÓR {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className="font-medium">
                {pattern.name}{" "}
                <a
                  href={pattern.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-sm underline ${muted}`}
                >
                  {pattern.url.replace(/^https?:\/\//, "")}
                </a>
              </h3>
              <p className={`text-sm ${soft}`}>
                <span className="font-medium">Dlaczego: </span>
                {pattern.why}
              </p>
              <p className={`text-sm ${soft}`}>
                <span className="font-medium">Układ: </span>
                {pattern.layout}
              </p>
              <p className={`text-sm ${soft}`}>
                <span className="font-medium">Efekt: </span>
                {pattern.effect}
              </p>
            </div>
          ))}
        </div>
        <div className={`p-4 ${accent}`}>
          <p className={`text-xs tracking-[0.2em] uppercase ${muted}`}>
            Co z tego bierzemy
          </p>
          <p className={`mt-2 whitespace-pre-wrap text-sm leading-relaxed ${soft}`}>
            {doc.visual_direction.recommendation}
          </p>
        </div>
      </section>

      {/* Summary */}
      <section className="space-y-6">
        <div className="space-y-2">
          <p className={`text-[11px] tracking-[0.35em] uppercase ${muted}`}>
            06 · Podsumowanie
          </p>
          <h2 className="font-serif text-3xl md:text-4xl">
            {doc.summary.heading}
          </h2>
        </div>
        <ul className="space-y-2">
          {doc.summary.checklist.map((item) => (
            <li key={item} className={`flex gap-3 text-sm ${soft}`}>
              <span className={muted}>☐</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <div className={`space-y-2 border-t pt-4 ${rule}`}>
          <p className={`text-xs tracking-[0.2em] uppercase ${muted}`}>
            Kolejny krok
          </p>
          <p className={`text-sm leading-relaxed ${soft}`}>
            {doc.summary.next_step}
          </p>
          {doc.summary.drive_url && (
            <a
              href={doc.summary.drive_url}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-sm underline"
            >
              {doc.summary.drive_url}
            </a>
          )}
        </div>
        <footer className={`flex flex-wrap justify-between gap-4 border-t pt-6 ${rule}`}>
          <div>
            <p className={`text-xs tracking-[0.2em] uppercase ${muted}`}>
              Kontakt
            </p>
            <p className="text-sm">{doc.summary.contact_site}</p>
            <a
              href={`mailto:${doc.summary.contact_email}`}
              className="text-sm underline"
            >
              {doc.summary.contact_email}
            </a>
          </div>
          {materialsHref && (
            <a
              href={materialsHref}
              className={`print:hidden self-end rounded-sm px-5 py-3 text-sm ${
                isPrint
                  ? "bg-neutral-900 text-white"
                  : "bg-white text-black"
              }`}
            >
              Prześlij materiały →
            </a>
          )}
        </footer>
      </section>
    </article>
  );
}
