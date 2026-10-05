"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { CosgralBrand, CosgralLogo } from "@/components/CosgralLogo";
import { Button } from "@/components/ui/Button";

type AdminUser = {
  id: string;
  email: string;
  label: string;
  core: boolean;
  createdAt: string | null;
};

type PendingInvite = {
  email: string;
  label: string;
  invitedBy: string;
  expiresAt: string;
};

type UsersPayload = {
  me: string;
  users: AdminUser[];
  invites: PendingInvite[];
};

export function AdminAccountMenu({
  variant = "desktop",
}: {
  variant?: "desktop" | "mobile";
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<UsersPayload | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Nie udało się pobrać listy.");
      const json = (await res.json()) as UsersPayload;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleLogout = async () => {
    await fetch("/api/auth/login", { method: "DELETE" }).catch(() =>
      fetch("/api/auth/logout", { method: "POST" }),
    );
    window.location.href = "/admin/login";
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Błąd zaproszenia");
      if (json.emailSent) {
        setMessage(`Wysłano zaproszenie na ${email.trim().toLowerCase()}.`);
      } else {
        setMessage(
          json.inviteLink
            ? `Mail niedostępny — skopiuj link: ${json.inviteLink}`
            : json.emailDetail || "Zaproszenie zapisane, ale mail nie wyszedł.",
        );
      }
      setEmail("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (targetEmail: string) => {
    if (!confirm(`Usunąć dostęp dla ${targetEmail}?`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Błąd usuwania");
      setMessage(`Usunięto ${targetEmail}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd");
    } finally {
      setBusy(false);
    }
  };

  const overlay =
    open && mounted
      ? createPortal(
          <div
            className="fixed inset-0"
            style={{ zIndex: 9999 }}
            role="presentation"
          >
            <button
              type="button"
              className="absolute inset-0"
              style={{ background: "rgba(0,0,0,0.82)" }}
              aria-label="Zamknij panel konta"
              onClick={() => setOpen(false)}
            />
            <div
              className="absolute inset-x-0 top-0 flex justify-center px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:pt-6"
              style={{ pointerEvents: "none" }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Panel konta"
                className="w-full max-w-md origin-top animate-[sheetIn_0.28s_var(--ease)_both] rounded-[1.5rem] border border-white/20 p-4 shadow-[0_28px_80px_rgba(0,0,0,0.85)]"
                style={{
                  pointerEvents: "auto",
                  background: "#0a0a0a",
                }}
              >
                <div className="mb-3 flex items-start justify-between gap-2 px-1">
                  <div>
                    <p className="label-mono">Konto</p>
                    <p className="mt-1 text-sm text-white/70">
                      {data?.me ?? (loading ? "…" : "—")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="text-[0.65rem] uppercase tracking-[0.14em] text-white/45 hover:text-white"
                  >
                    Zamknij
                  </button>
                </div>

                <form onSubmit={handleInvite} className="mb-3 space-y-2">
                  <label className="block px-1 text-[0.65rem] uppercase tracking-[0.14em] text-white/40">
                    Zaproś użytkownika
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@firma.pl"
                      className="min-w-0 flex-1 rounded-full border border-white/15 bg-white/[0.08] px-3.5 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/35"
                    />
                    <Button
                      type="submit"
                      disabled={busy || !email.trim()}
                      className="shrink-0 px-4"
                    >
                      Wyślij
                    </Button>
                  </div>
                </form>

                {message ? (
                  <p className="mb-2 break-all px-1 text-xs text-emerald-300/90">
                    {message}
                  </p>
                ) : null}
                {error ? (
                  <p className="mb-2 px-1 text-xs text-red-300">{error}</p>
                ) : null}

                <div className="max-h-[min(16rem,42vh)] space-y-1 overflow-y-auto pr-1">
                  <p className="px-1 pb-1 text-[0.65rem] uppercase tracking-[0.14em] text-white/35">
                    Dostęp
                  </p>
                  {loading && !data ? (
                    <p className="px-1 text-sm text-white/40">Ładowanie…</p>
                  ) : null}
                  {data?.users.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center gap-2 rounded-xl px-2 py-2 hover:bg-white/[0.05]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-white/90">{u.label}</p>
                        <p className="truncate text-[0.7rem] text-white/40">
                          {u.email}
                        </p>
                      </div>
                      {u.core ? (
                        <span className="shrink-0 text-[0.6rem] uppercase tracking-[0.12em] text-white/30">
                          core
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleRemove(u.email)}
                          className="shrink-0 text-[0.65rem] uppercase tracking-[0.12em] text-red-300/80 hover:text-red-200"
                        >
                          Usuń
                        </button>
                      )}
                    </div>
                  ))}
                  {(data?.invites.length ?? 0) > 0 ? (
                    <>
                      <p className="px-1 pb-1 pt-2 text-[0.65rem] uppercase tracking-[0.14em] text-white/35">
                        Oczekujące
                      </p>
                      {data?.invites.map((i) => (
                        <div
                          key={i.email}
                          className="rounded-xl px-2 py-2 text-sm text-white/55"
                        >
                          <p className="truncate">{i.email}</p>
                          <p className="text-[0.65rem] text-white/30">
                            do {new Date(i.expiresAt).toLocaleDateString("pl-PL")}
                          </p>
                        </div>
                      ))}
                    </>
                  ) : null}
                </div>

                <div className="mt-3 flex gap-2">
                  <Link
                    href="/admin"
                    onClick={() => setOpen(false)}
                    className="inline-flex flex-1 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[0.65rem] font-medium uppercase tracking-[0.14em] text-white/55 hover:bg-white/10 hover:text-white"
                  >
                    Home
                  </Link>
                  <Button
                    variant="ghost"
                    onClick={() => void handleLogout()}
                    className="flex-1"
                  >
                    Wyloguj
                  </Button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          variant === "desktop"
            ? "mb-8 block w-full rounded-2xl px-2 py-1 text-left transition hover:bg-white/[0.04]"
            : "glass-pill flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5"
        }
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Konto i zaproszenia"
      >
        {variant === "desktop" ? (
          <CosgralBrand size="md" subtitle="Hub" />
        ) : (
          <>
            <CosgralLogo size="sm" />
            <span className="text-[0.7rem] font-medium uppercase tracking-[0.16em] text-white/70">
              Cosgral
            </span>
          </>
        )}
      </button>
      {overlay}
    </>
  );
}
