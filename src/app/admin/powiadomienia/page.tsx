"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { PageHeader, StatusPill } from "@/components/ui/CrmUi";
import { PushEnableCard } from "@/components/PushEnableCard";

export default function PowiadomieniaPage() {
  const [status, setStatus] = useState<{
    email: boolean;
    email_to?: string;
    telegram: boolean;
    web_push?: boolean;
    push_devices?: number;
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
    if (data.web_push) {
      parts.push(
        `iPhone/push${typeof data.push_sent === "number" ? ` (${data.push_sent})` : ""}`,
      );
    }
    if (data.email) parts.push(`email (${data.email_to || "kontakt@cosgral.pl"})`);
    if (data.telegram) parts.push("Telegram");
    setMsg(`Wysłano test → ${parts.join(" + ") || "brak kanału"}`);
    setStatus((s) =>
      s
        ? {
            ...s,
            web_push: Boolean(data.web_push),
            push_devices: data.push_devices ?? s.push_devices,
          }
        : s,
    );
  };

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <PageHeader
        eyebrow="Hub"
        title="Powiadomienia"
        description="Push na iPhone (ikona z ekranu) + email — alerty z Huba i Cosgral AI."
      />

      <PushEnableCard />

      <div className="flex flex-wrap gap-2">
        <StatusPill tone={status?.web_push ? "ok" : "warn"}>
          Push{" "}
          {status?.web_push
            ? `OK${status.push_devices ? ` · ${status.push_devices} urz.` : ""}`
            : "brak VAPID"}
        </StatusPill>
        <StatusPill tone={status?.email ? "ok" : "warn"}>
          Email {status?.email ? `OK → ${status.email_to}` : "brak SMTP"}
        </StatusPill>
        <StatusPill tone={status?.telegram ? "ok" : "neutral"}>
          Telegram {status?.telegram ? "OK" : "off"}
        </StatusPill>
      </div>

      <div className="space-y-3 text-sm leading-relaxed text-white/60">
        <p className="label-mono text-white/45">Jak dodać Hub na iPhone</p>
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>Safari → otwórz publiczny URL Huba (HTTPS).</li>
          <li>Udostępnij → Do ekranu początkowego → Dodaj.</li>
          <li>Otwórz ikonę Cosgral → Powiadomienia → Włącz push.</li>
        </ol>
        <p className="text-xs text-white/40">
          iOS 16.4+. Push działa tylko z aplikacji dodanej do ekranu, nie z karty
          Safari.
        </p>
      </div>

      <p className="text-xs text-white/40">
        Base URL do linków:{" "}
        {status?.notify_base ||
          "— (ustaw NEXT_PUBLIC_APP_URL / COSGRAL_NOTIFY_BASE_URL)"}
      </p>

      <Button type="button" onClick={() => void sendTest()} disabled={busy}>
        {busy ? "Wysyłanie…" : "Wyślij test (push + email)"}
      </Button>
      {msg ? <p className="text-sm text-white/55">{msg}</p> : null}
    </div>
  );
}
