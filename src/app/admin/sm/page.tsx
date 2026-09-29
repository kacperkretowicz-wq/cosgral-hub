"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { PageHeader, EmptyState } from "@/components/ui/CrmUi";
import type { SmPost, SmPostStatus, SmQueueStats } from "@/lib/sm-db";

function PlatformBadge({ platform }: { platform: string }) {
  const colors: Record<string, string> = {
    instagram: "bg-pink-500/15 text-pink-300 border-pink-500/25",
    facebook:  "bg-blue-500/15 text-blue-300 border-blue-500/25",
    linkedin:  "bg-sky-500/15  text-sky-300  border-sky-500/25",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-widest ${colors[platform] ?? "bg-white/10 text-white/60 border-white/15"}`}>
      {platform}
    </span>
  );
}

function StatusDot({ status }: { status: SmPostStatus }) {
  const colors: Record<SmPostStatus, string> = {
    draft:     "bg-white/30",
    approved:  "bg-emerald-400",
    rejected:  "bg-red-400/60",
    scheduled: "bg-amber-400",
    published: "bg-blue-400",
    failed:    "bg-red-500",
  };
  const labels: Record<SmPostStatus, string> = {
    draft: "Draft", approved: "Zatwierdzone", rejected: "Odrzucone",
    scheduled: "Zaplanowane", published: "Opublikowane", failed: "Błąd",
  };
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${colors[status]}`} />
      <span className="text-[0.65rem] uppercase tracking-widest text-white/45">{labels[status]}</span>
    </span>
  );
}

function StatsBar({ stats }: { stats: SmQueueStats }) {
  const items = [
    { label: "Drafty",        value: stats.draft,           color: "text-white/70" },
    { label: "Zatwierdzone",  value: stats.approved,        color: "text-emerald-400" },
    { label: "Zaplanowane",   value: stats.scheduled,       color: "text-amber-400" },
    { label: "Dziś",          value: stats.published_today, color: "text-blue-400" },
    { label: "Błędy",         value: stats.failed,          color: "text-red-400" },
  ];
  return (
    <div className="mb-6 grid grid-cols-5 gap-3">
      {items.map((s) => (
        <div key={s.label} className="surface p-4 text-center">
          <p className={`text-2xl font-light ${s.color}`}>{s.value}</p>
          <p className="label-mono mt-1">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Image uploader inside a post card ─────────────────────────────────────
function ImageUploader({
  postId,
  currentUrl,
  onUploaded,
}: {
  postId: string;
  currentUrl: string | null;
  onUploaded: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [mode, setMode] = useState<"idle" | "url">("idle");
  const [err, setErr] = useState("");

  const handleFile = async (file: File) => {
    if (!file) return;
    setUploading(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/sm/upload-image", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? "Błąd uploadu"); return; }
      // Save URL to post
      await fetch(`/api/sm/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: data.url }),
      });
      onUploaded(data.url);
    } finally {
      setUploading(false);
    }
  };

  const handleUrl = async () => {
    if (!urlInput.trim()) return;
    await fetch(`/api/sm/posts/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: urlInput.trim() }),
    });
    onUploaded(urlInput.trim());
    setUrlInput("");
    setMode("idle");
  };

  const CANVA_TEMPLATE =
    "https://www.canva.com/design/create?width=1080&height=1080&units=px";

  return (
    <div className="space-y-2">
      {err ? (
        <p className="text-xs text-red-300">{err}</p>
      ) : null}

      {mode === "url" ? (
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://..."
            className="glass-field flex-1 rounded-xl px-3 py-2 text-xs"
            onKeyDown={(e) => e.key === "Enter" && void handleUrl()}
          />
          <button
            type="button"
            onClick={() => void handleUrl()}
            className="rounded-xl bg-white/10 px-3 py-2 text-xs hover:bg-white/15"
          >
            OK
          </button>
          <button
            type="button"
            onClick={() => setMode("idle")}
            className="rounded-xl px-2 py-2 text-xs text-white/40 hover:text-white/70"
          >
            ✕
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/70 hover:bg-white/10 disabled:opacity-50"
          >
            {uploading ? "Wgrywam…" : "📁 Wgraj z dysku"}
          </button>
          <button
            type="button"
            onClick={() => setMode("url")}
            className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/70 hover:bg-white/10"
          >
            🔗 Wklej URL
          </button>
          <a
            href={CANVA_TEMPLATE}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-xl border border-[#7D2AE8]/40 bg-[#7D2AE8]/15 px-3 py-2 text-xs text-purple-300 hover:bg-[#7D2AE8]/25"
          >
            🎨 Canva
          </a>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// ── Post card ──────────────────────────────────────────────────────────────
function PostCard({
  post,
  onChanged,
}: {
  post: SmPost;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [caption, setCaption] = useState(post.caption);
  const [imageUrl, setImageUrl] = useState<string | null>(post.image_url);
  const [showUpload, setShowUpload] = useState(false);

  const act = async (action: "approve" | "reject" | "publish" | "delete") => {
    setBusy(true);
    try {
      if (action === "approve") {
        await fetch(`/api/sm/posts/${post.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "approved" }),
        });
      } else if (action === "reject") {
        await fetch(`/api/sm/posts/${post.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "rejected" }),
        });
      } else if (action === "publish") {
        const res = await fetch(`/api/sm/publish/${post.id}`, { method: "POST" });
        if (!res.ok) {
          const d = await res.json();
          alert(`Błąd publikacji: ${d.error ?? "nieznany błąd"}`);
          return;
        }
      } else if (action === "delete") {
        if (!confirm("Usunąć post?")) return;
        await fetch(`/api/sm/posts/${post.id}`, { method: "DELETE" });
      }
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const saveCaption = async () => {
    setBusy(true);
    await fetch(`/api/sm/posts/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caption }),
    });
    setBusy(false);
    setEditOpen(false);
    onChanged();
  };

  const isDraft    = post.status === "draft" || post.status === "rejected";
  const isApproved = post.status === "approved";
  const dateStr = post.scheduled_at
    ? new Date(post.scheduled_at).toLocaleString("pl-PL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : new Date(post.created_at).toLocaleDateString("pl-PL", { day: "numeric", month: "short" });

  return (
    <div className="surface flex flex-col overflow-hidden">
      {/* Image area */}
      <div className="relative aspect-square w-full overflow-hidden rounded-[calc(1.35rem-1px)] rounded-b-none">
        {imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <button
              type="button"
              onClick={() => setShowUpload((v) => !v)}
              className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-[0.6rem] text-white/80 hover:bg-black/80"
            >
              ✏️ Zmień
            </button>
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-white/[0.03]">
            <span className="label-mono opacity-30">BRAK GRAFIKI</span>
            <button
              type="button"
              onClick={() => setShowUpload((v) => !v)}
              className="rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/60 hover:border-white/40 hover:text-white/90"
            >
              + Dodaj grafikę
            </button>
          </div>
        )}
      </div>

      {/* Upload panel (toggle) */}
      {showUpload ? (
        <div className="border-b border-white/8 px-4 py-3">
          <ImageUploader
            postId={post.id}
            currentUrl={imageUrl}
            onUploaded={(url) => {
              setImageUrl(url);
              setShowUpload(false);
              onChanged();
            }}
          />
        </div>
      ) : null}

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Header row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <PlatformBadge platform={post.platform} />
            <span className="label-mono opacity-60">{post.post_type}</span>
          </div>
          <StatusDot status={post.status} />
        </div>

        {/* Theme & date */}
        <p className="label-mono opacity-50">{post.theme.replace("_", " ")} · {dateStr}</p>

        {/* Caption */}
        {editOpen ? (
          <div className="space-y-2">
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={5}
              className="glass-field w-full rounded-2xl px-4 py-3 text-sm"
            />
            <div className="flex gap-2">
              <Button type="button" onClick={saveCaption} disabled={busy}>
                {busy ? "…" : "Zapisz"}
              </Button>
              <Button variant="ghost" type="button" onClick={() => setEditOpen(false)}>
                Anuluj
              </Button>
            </div>
          </div>
        ) : (
          <p className="line-clamp-4 flex-1 text-sm leading-relaxed text-white/70">
            {post.caption || <span className="italic text-white/30">Brak caption</span>}
          </p>
        )}

        {/* Error */}
        {post.error_message ? (
          <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {post.error_message}
          </p>
        ) : null}

        {/* Actions */}
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          {isDraft ? (
            <>
              <Button type="button" onClick={() => act("approve")} disabled={busy} className="flex-1 text-xs">
                ✓ Zatwierdź
              </Button>
              <Button variant="secondary" type="button" onClick={() => act("reject")} disabled={busy} className="flex-1 text-xs">
                ✗ Odrzuć
              </Button>
            </>
          ) : null}
          {isApproved ? (
            <Button type="button" onClick={() => act("publish")} disabled={busy} className="flex-1 text-xs">
              {busy ? "…" : "↗ Publikuj teraz"}
            </Button>
          ) : null}
          {post.status === "published" ? (
            <span className="flex-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-center text-xs text-emerald-300">
              ✓ Opublikowano
            </span>
          ) : null}
          {!editOpen ? (
            <Button variant="ghost" type="button" onClick={() => setEditOpen(true)} disabled={busy} className="text-xs">
              Edytuj
            </Button>
          ) : null}
          <Button variant="ghost" type="button" onClick={() => act("delete")} disabled={busy} className="text-xs text-red-300/70 hover:text-red-300">
            ✕
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Filter tabs ────────────────────────────────────────────────────────────
const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "",          label: "Wszystkie" },
  { value: "draft",     label: "Drafty" },
  { value: "approved",  label: "Zatwierdzone" },
  { value: "scheduled", label: "Zaplanowane" },
  { value: "published", label: "Opublikowane" },
  { value: "failed",    label: "Błędy" },
];

// ── Weekly calendar ────────────────────────────────────────────────────────
function WeekCalendar({ posts }: { posts: SmPost[] }) {
  const DAY_LABELS = ["Nd", "Pon", "Wt", "Śr", "Czw", "Pt", "Sb"];
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const ds = d.toISOString().split("T")[0];
    const dayPosts = posts.filter((p) => {
      const pd = p.scheduled_at ?? p.created_at;
      return pd?.startsWith(ds);
    });
    return { d, ds, dayPosts, isToday: d.toDateString() === today.toDateString() };
  });

  const STATUS_DOT: Record<SmPostStatus, string> = {
    draft: "bg-white/30", approved: "bg-emerald-400", rejected: "bg-red-400/60",
    scheduled: "bg-amber-400", published: "bg-blue-400", failed: "bg-red-500",
  };

  return (
    <section className="mt-8">
      <p className="label-mono mb-4">Kalendarz tygodnia</p>
      <div className="grid grid-cols-7 gap-2">
        {days.map(({ d, dayPosts, isToday }, i) => (
          <div
            key={i}
            className={`surface-list min-h-[4.5rem] p-2.5 ${isToday ? "ring-1 ring-white/30" : ""}`}
          >
            <p className="label-mono mb-1 opacity-50">{DAY_LABELS[(i + 1) % 7]}</p>
            <p className={`text-lg font-light ${isToday ? "text-white" : "text-white/40"}`}>{d.getDate()}</p>
            <div className="mt-1.5 flex flex-col gap-1">
              {dayPosts.slice(0, 3).map((p) => (
                <div key={p.id} className="flex items-center gap-1 overflow-hidden">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[p.status]}`} />
                  <span className="truncate text-[0.55rem] text-white/50">{p.platform}</span>
                </div>
              ))}
              {dayPosts.length > 3 ? (
                <span className="text-[0.52rem] text-white/30">+{dayPosts.length - 3}</span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Generate error banner ──────────────────────────────────────────────────
function GenerateResult({ result, onDismiss }: { result: { ok: boolean; message: string }; onDismiss: () => void }) {
  if (result.ok) {
    return (
      <div className="mb-4 flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
        <span>✓ {result.message}</span>
        <button type="button" onClick={onDismiss} className="ml-4 text-emerald-300/60 hover:text-emerald-300">✕</button>
      </div>
    );
  }
  return (
    <div className="mb-4 flex items-center justify-between rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
      <span>⚠ {result.message}</span>
      <button type="button" onClick={onDismiss} className="ml-4 text-red-300/60 hover:text-red-300">✕</button>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function SmPage() {
  const [posts, setPosts] = useState<SmPost[]>([]);
  const [stats, setStats] = useState<SmQueueStats>({ total: 0, draft: 0, approved: 0, scheduled: 0, published_today: 0, failed: 0 });
  const [filter, setFilter] = useState("");
  const [platform, setPlatform] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [genResult, setGenResult] = useState<{ ok: boolean; message: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter)   params.set("status",   filter);
      if (platform) params.set("platform", platform);
      params.set("limit", "60");
      const res = await fetch(`/api/sm/posts?${params}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Błąd ładowania postów"); return; }
      setPosts(data.posts ?? []);
      setStats(data.stats ?? {});
      setError("");
    } catch {
      setError("Błąd sieci — sprawdź połączenie");
    } finally {
      setLoading(false);
    }
  }, [filter, platform]);

  useEffect(() => { void load(); }, [load]);

  const generate = async () => {
    setGenerating(true);
    setGenResult(null);
    try {
      const res = await fetch("/api/sm/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenResult({ ok: false, message: data.error ?? "Błąd generowania" });
        return;
      }
      const count = data.posts?.length ?? 0;
      setGenResult({
        ok: true,
        message: `Wygenerowano ${count} post${count === 1 ? "" : count < 5 ? "y" : "ów"} — temat: ${data.theme_label ?? data.theme}`,
      });
      await load();
    } catch (e) {
      setGenResult({ ok: false, message: e instanceof Error ? e.message : "Błąd sieci" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Cosgral"
        title="Social Media"
        description="Generuj, przeglądaj i publikuj treści na Instagram, Facebook i LinkedIn."
        actions={
          <div className="flex gap-2">
            <Button type="button" onClick={generate} disabled={generating}>
              {generating ? "Generuję…" : "+ Generuj post"}
            </Button>
          </div>
        }
      />

      {/* Generate result banner */}
      {genResult ? (
        <GenerateResult result={genResult} onDismiss={() => setGenResult(null)} />
      ) : null}

      {/* Load error */}
      {error ? (
        <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {/* Stats */}
      <StatsBar stats={stats} />

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-all duration-300 ${
              filter === f.value
                ? "border-white/40 bg-white/12 text-white"
                : "border-white/10 text-white/45 hover:border-white/20 hover:text-white/70"
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="ml-auto">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="glass-field rounded-full px-4 py-1.5 text-xs"
          >
            <option value="">Wszystkie platformy</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="linkedin">LinkedIn</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
          <span className="label-mono ml-3">Ładowanie…</span>
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          title="Brak postów"
          description="Kliknij '+ Generuj post' aby AI stworzyła pierwszą treść."
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onChanged={load} />
          ))}
        </div>
      )}

      {/* Calendar */}
      <WeekCalendar posts={posts} />
    </div>
  );
}
