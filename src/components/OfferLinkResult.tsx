"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { ShareLinks } from "@/components/ShareLinks";
import { isLocalUrl } from "@/lib/app-url";

interface OfferLinkResultProps {
  companyName: string;
  offerUrl: string;
  token: string;
  projectId?: string;
  crmClientId?: string;
}

export function OfferLinkResult({
  companyName,
  offerUrl,
  token,
  projectId,
  crmClientId,
}: OfferLinkResultProps) {
  const [copied, setCopied] = useState(false);
  const isLocal = isLocalUrl(offerUrl);

  const copyLink = () => {
    navigator.clipboard.writeText(offerUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3">
        <p className="font-medium text-green-200">Gotowe — {companyName}</p>
        <p className="text-sm text-green-200/70">
          Skopiuj link i wyślij klientowi. Zobaczy ofertę i na dole przycisk
          „Prześlij materiały”.
        </p>
      </div>

      {isLocal && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
          Ten link działa tylko na Twoim komputerze (localhost). Aby klient
          mógł go otworzyć, wdróż aplikację na Vercel i ustaw{" "}
          <code className="text-yellow-100">NEXT_PUBLIC_APP_URL</code>.
        </div>
      )}

      <GlassCard title="Link do oferty dla klienta">
        <div className="space-y-4">
          <code className="block overflow-x-auto rounded-sm bg-white/5 px-4 py-3 text-sm break-all">
            {offerUrl}
          </code>

          <Button onClick={copyLink} className="w-full py-4 text-base">
            {copied ? "Skopiowano!" : "Kopiuj link do oferty dla klienta"}
          </Button>

          <ShareLinks companyName={companyName} offerUrl={offerUrl} />

          <div className="flex flex-wrap gap-3 border-t border-white/10 pt-4">
            <Link href={offerUrl} target="_blank">
              <Button variant="secondary">Podgląd oferty</Button>
            </Link>
            <Link href={`/admin/clients/${token}`}>
              <Button variant="ghost">Szczegóły klienta</Button>
            </Link>
            {projectId && (
              <Link href={`/admin/zlecenia/${projectId}`}>
                <Button variant="ghost">Zlecenie</Button>
              </Link>
            )}
            {crmClientId && (
              <Link href={`/admin/klienci/${crmClientId}`}>
                <Button variant="ghost">Profil CRM</Button>
              </Link>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
