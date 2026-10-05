"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { CosgralLogo } from "@/components/CosgralLogo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function InviteAcceptPage() {
  const router = useRouter();
  const search = useSearchParams();
  const token = search.get("token")?.trim() ?? "";

  const [email, setEmail] = useState("");
  const [label, setLabel] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Brak tokenu zaproszenia.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/admin/invite?token=${encodeURIComponent(token)}`);
      const json = await res.json();
      if (cancelled) return;
      if (!res.ok) {
        setError(json.error || "Zaproszenie nieprawidłowe.");
        setLoading(false);
        return;
      }
      setEmail(json.email);
      setLabel(json.label || "");
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Hasło musi mieć min. 8 znaków.");
      return;
    }
    if (password !== password2) {
      setError("Hasła nie są takie same.");
      return;
    }
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/admin/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password, label: label || undefined }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Nie udało się aktywować.");
      setSubmitting(false);
      return;
    }
    router.push("/admin");
    router.refresh();
  };

  return (
    <PageShell showLogo={false}>
      <div className="mx-auto max-w-md pt-10">
        <div className="surface space-y-6 p-7 md:p-9">
          <div className="space-y-3">
            <CosgralLogo size="lg" priority />
            <p className="label-mono">Zaproszenie</p>
            <h1 className="cosgral-wordmark text-3xl">COSGRAL Hub</h1>
            <p className="text-sm text-white/50">
              Ustaw hasło, aby dołączyć do panelu administracyjnego.
            </p>
          </div>

          {loading ? (
            <p className="text-sm text-white/40">Sprawdzam zaproszenie…</p>
          ) : error && !email ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input label="E-mail" type="email" value={email} disabled readOnly />
              <Input
                label="Imię / nazwa"
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
              <Input
                label="Hasło"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              <Input
                label="Powtórz hasło"
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                required
                autoComplete="new-password"
              />
              {error ? <p className="text-sm text-red-400">{error}</p> : null}
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Aktywacja…" : "Dołącz do Huba"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </PageShell>
  );
}
