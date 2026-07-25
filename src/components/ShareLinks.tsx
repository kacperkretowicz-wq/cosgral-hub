"use client";

import { Button } from "@/components/ui/Button";

interface ShareLinksProps {
  companyName: string;
  offerUrl: string;
}

export function ShareLinks({ companyName, offerUrl }: ShareLinksProps) {
  const message = encodeURIComponent(
    `Cześć! Przygotowaliśmy ofertę dla ${companyName}:\n\n${offerUrl}\n\nNa dole strony jest przycisk do przesłania materiałów.\n\nPozdrawiamy,\nCosgral Agency`,
  );

  const mailSubject = encodeURIComponent(
    `Cosgral — oferta (${companyName})`,
  );
  const mailBody = encodeURIComponent(
    `Cześć,\n\nPrzesyłamy link do oferty:\n\n${offerUrl}\n\nNa dole strony znajdziesz przycisk „Prześlij materiały”.\n\nPozdrawiamy,\nCosgral Agency`,
  );

  return (
    <div className="flex flex-wrap gap-3">
      <a
        href={`https://wa.me/?text=${message}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Button variant="secondary">WhatsApp</Button>
      </a>
      <a href={`mailto:?subject=${mailSubject}&body=${mailBody}`}>
        <Button variant="secondary">Email</Button>
      </a>
    </div>
  );
}
