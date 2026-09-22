"use client";

import { Button } from "@/components/ui/Button";

interface ShareLinksProps {
  companyName: string;
  offerUrl: string;
}

export function ShareLinks({ companyName, offerUrl }: ShareLinksProps) {
  const mailSubject = encodeURIComponent(
    `Cosgral — oferta (${companyName})`,
  );
  const mailBody = encodeURIComponent(
    `Cześć,\n\nPrzesyłamy link do oferty:\n\n${offerUrl}\n\nNa dole strony znajdziesz przycisk „Prześlij materiały”.\n\nPozdrawiamy,\nCosgral Agency`,
  );

  return (
    <div className="flex flex-wrap gap-3">
      <a href={`mailto:?subject=${mailSubject}&body=${mailBody}`}>
        <Button variant="secondary">Email</Button>
      </a>
    </div>
  );
}
