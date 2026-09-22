"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/CrmUi";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

type PushState =
  | "loading"
  | "unsupported"
  | "need-install"
  | "need-https"
  | "ready"
  | "enabled"
  | "denied"
  | "missing-vapid";

export function PushEnableCard() {
  const [state, setState] = useState<PushState>("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [publicKey, setPublicKey] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (typeof window === "undefined") return;

    if (!window.isSecureContext && location.hostname !== "localhost") {
      setState("need-https");
      return;
    }

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      if (isIos() && !isStandalone()) {
        setState("need-install");
        return;
      }
      setState("unsupported");
      return;
    }

    if (isIos() && !isStandalone()) {
      setState("need-install");
      return;
    }

    try {
      const res = await fetch("/api/push/subscribe", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!data.configured || !data.publicKey) {
        setState("missing-vapid");
        setPublicKey(null);
        return;
      }
      setPublicKey(data.publicKey as string);

      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (Notification.permission === "denied") {
        setState("denied");
        return;
      }
      setState(existing ? "enabled" : "ready");
    } catch {
      setState("unsupported");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const enable = async () => {
    if (!publicKey) return;
    setBusy(true);
    setMsg("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        setMsg("Odmówiono powiadomień w ustawieniach iPhone.");
        setBusy(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMsg(typeof data.error === "string" ? data.error : "Błąd zapisu");
        setBusy(false);
        return;
      }
      setState("enabled");
      setMsg("Gotowe — powiadomienia z Huba będą na tym iPhonie.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Błąd włączania push");
    }
    setBusy(false);
  };

  const disable = async () => {
    setBusy(true);
    setMsg("");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("ready");
      setMsg("Wyłączono push na tym urządzeniu.");
    } catch {
      setMsg("Nie udało się wyłączyć.");
    }
    setBusy(false);
  };

  return (
    <section className="surface space-y-4 p-5 md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <p className="label-mono">iPhone / PWA</p>
        <StatusPill
          tone={
            state === "enabled"
              ? "ok"
              : state === "denied" || state === "missing-vapid"
                ? "warn"
                : "neutral"
          }
        >
          {state === "enabled"
            ? "Push ON"
            : state === "need-install"
              ? "Dodaj do ekranu"
              : state === "ready"
                ? "Gotowe do włączenia"
                : state === "denied"
                  ? "Zablokowane"
                  : state === "missing-vapid"
                    ? "Brak VAPID"
                    : state === "need-https"
                      ? "Potrzebny HTTPS"
                      : state === "unsupported"
                        ? "Niedostępne"
                        : "…"}
        </StatusPill>
      </div>

      {state === "need-install" ? (
        <ol className="space-y-2 text-sm leading-relaxed text-white/60">
          <li>
            1. Otwórz Hub w <strong className="text-white/85">Safari</strong>{" "}
            (nie Chrome) — adres produkcyjny HTTPS.
          </li>
          <li>
            2. U dołu / w menu:{" "}
            <strong className="text-white/85">Udostępnij</strong> →{" "}
            <strong className="text-white/85">Do ekranu początkowego</strong>.
          </li>
          <li>
            3. Otwórz ikonę <strong className="text-white/85">Cosgral</strong> z
            ekranu i wróć tu, żeby włączyć powiadomienia.
          </li>
        </ol>
      ) : null}

      {state === "need-https" ? (
        <p className="text-sm text-white/55">
          Push działa tylko na HTTPS (produkcja Netlify/Vercel) albo localhost.
          Na iPhonie użyj publicznego URL Huba.
        </p>
      ) : null}

      {state === "missing-vapid" ? (
        <p className="text-sm text-white/55">
          Dodaj w Netlify / .env:{" "}
          <code className="text-white/80">NEXT_PUBLIC_VAPID_PUBLIC_KEY</code> i{" "}
          <code className="text-white/80">VAPID_PRIVATE_KEY</code>, potem
          redeploy.
        </p>
      ) : null}

      {state === "denied" ? (
        <p className="text-sm text-white/55">
          Powiadomienia zablokowane. Ustawienia iPhone → Powiadomienia → Cosgral
          Hub → włącz.
        </p>
      ) : null}

      {(state === "ready" || state === "enabled") && (
        <p className="text-sm leading-relaxed text-white/55">
          Alerty z Huba (czat strony, taski, kalendarz, Cosgral AI, team) trafią
          na ten iPhone jako powiadomienie systemowe.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {state === "ready" || state === "need-install" ? (
          <Button
            type="button"
            disabled={busy || state === "need-install"}
            onClick={() => void enable()}
          >
            {busy ? "…" : "Włącz powiadomienia na tym iPhonie"}
          </Button>
        ) : null}
        {state === "enabled" ? (
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => void disable()}
          >
            {busy ? "…" : "Wyłącz na tym urządzeniu"}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={() => void refresh()}
        >
          Odśwież status
        </Button>
      </div>

      {msg ? <p className="text-sm text-white/55">{msg}</p> : null}
    </section>
  );
}
