"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { CosgralLogo } from "@/components/CosgralLogo";
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
    <PageShell logoHref="/admin/login" logoSize="lg">
      <div className="mx-auto max-w-md pt-8">
        <div className="glass rounded-lg p-8 space-y-6">
          <div className="space-y-4 text-center">
            <div className="flex justify-center">
              <CosgralLogo size="xl" priority />
            </div>
            <h1 className="text-2xl font-bold">Cosgral Hub</h1>
            <p className="text-sm text-white/50">
              Zaloguj się do panelu zespołu
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jakub.gral00@gmail.com"
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

            <label className="flex items-center gap-2 text-sm text-white/60">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="accent-white"
              />
              Zapamiętaj mnie (30 dni)
            </label>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Logowanie..." : "Zaloguj się"}
            </Button>
          </form>

          <p className="text-center text-xs text-white/40">
            Jakub: Cosgral2026!Jakub · Kacper: Cosgral2026!Kacper
          </p>

          <p className="text-center text-xs text-white/30">
            <a href="/admin/setup" className="underline hover:text-white/50">
              Pierwsze uruchomienie? Skonfiguruj Supabase →
            </a>
          </p>
        </div>
      </div>
    </PageShell>
  );
}
