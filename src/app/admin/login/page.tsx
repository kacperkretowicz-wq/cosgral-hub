"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { CosgralLogo } from "@/components/CosgralLogo";
import { DigitalField } from "@/components/DigitalField";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, remember }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Błąd logowania");
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  };

  return (
    <PageShell showLogo={false}>
      <div className="mx-auto grid max-w-5xl gap-6 pt-4 md:grid-cols-2 md:pt-10">
        <DigitalField
          variant="www"
          className="hidden min-h-[420px] md:block"
          veil={15}
          priority
        />

        <div className="surface flex flex-col justify-center space-y-6 p-7 md:p-9">
          <div className="space-y-4">
            <CosgralLogo size="lg" priority />
            <p className="label-mono">Cosgral Hub</p>
            <h1 className="cosgral-wordmark text-3xl md:text-4xl">COSGRAL</h1>
            <p className="text-[0.7rem] uppercase leading-relaxed tracking-[0.22em] text-white/45">
              Projektujemy i wdrażamy produkty cyfrowe dla firm
            </p>
          </div>

          <DigitalField
            variant="grafika"
            className="h-28 md:hidden"
            veil={25}
            priority
          />

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Login"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@cosgral.pl"
              required
              autoComplete="username"
            />
            <Input
              label="Hasło"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />

            <label className="flex items-center gap-2 text-sm text-white/50">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="accent-[var(--accent)]"
              />
              Zapamiętaj mnie (30 dni)
            </label>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Logowanie..." : "Zaloguj się"}
            </Button>
          </form>

          <p className="text-center text-xs text-white/30">
            <a href="/admin/setup" className="underline hover:text-white/60">
              Pierwsze uruchomienie? Skonfiguruj Supabase →
            </a>
          </p>
        </div>
      </div>
    </PageShell>
  );
}
