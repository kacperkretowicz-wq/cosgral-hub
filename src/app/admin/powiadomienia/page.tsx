"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { PageHeader, StatusPill } from "@/components/ui/CrmUi";

export default function PowiadomieniaPage() {
  const [status, setStatus] = useState<{
    whatsapp: boolean;
    email: boolean;
    email_to?: string;
    telegram: boolean;
    notify_base: string | null;
  } | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/notify/test", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setStatus(d))
      .catch(() => setStatus(null));
  }, []);

  const sendTest = async () => {
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/notify/test", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMsg(typeof data.error === "string" ? data.error : "Błąd");
      return;
    }
    const parts = [];
    if (data.whatsapp) parts.push("WhatsApp");
    if (data.email) parts.push(`email (${data.email_to || "kontakt@cosgral.pl"})`);
    if (data.telegram) parts.push("Telegram");
    setMsg(`Wysłano test → ${parts.join(" + ") || "brak kanału"}`);
  };

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <PageHeader
        eyebrow="Hub"
        title="Powiadomienia"
        description="WhatsApp (grupa) + email kontakt@cosgral.pl — z linkiem do strony w Hubie."
      />

      <div className="flex flex-wrap gap-2">
        <StatusPill tone={status?.whatsapp ? "ok" : "warn"}>
          WhatsApp {status?.whatsapp ? "OK" : "brak"}
        </StatusPill>
        <StatusPill tone={status?.email ? "ok" : "warn"}>
          Email {status?.email ? `OK → ${status.email_to}` : "brak SMTP"}
        </StatusPill>
        <StatusPill tone={status?.telegram ? "ok" : "neutral"}>
          Telegram {status?.telegram ? "OK" : "off"}
        </StatusPill>
      </div>

      <div className="space-y-3 text-sm leading-relaxed text-white/60">
        <p className="label-mono text-white/45">Email (Seohost)</p>
        <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-4 font-mono text-[0.7rem] text-white/75">
          {`NOTIFY_EMAIL_TO=kontakt@cosgral.pl
NOTIFY_EMAIL_FROM=Cosgral Hub <kontakt@cosgral.pl>
SMTP_HOST=smtp.seohost.pl
SMTP_PORT=587
SMTP_USER=kontakt@cosgral.pl
SMTP_PASS=haslo-skrzynki`}
        </pre>
        <p>
          Host SMTP weź z panelu Seohost (często{" "}
          <code className="text-white/80">smtp.seohost.pl</code> albo{" "}
          <code className="text-white/80">mail.cosgral.pl</code>).
        </p>
      </div>

      <p className="text-xs text-white/40">
        Base URL do linków:{" "}
        {status?.notify_base ||
          "— (ustaw NEXT_PUBLIC_APP_URL / COSGRAL_NOTIFY_BASE_URL)"}
      </p>

      <Button type="button" onClick={() => void sendTest()} disabled={busy}>
        {busy ? "Wysyłanie…" : "Wyślij test"}
      </Button>
      {msg ? <p className="text-sm text-white/55">{msg}</p> : null}
    </div>
  );
}
