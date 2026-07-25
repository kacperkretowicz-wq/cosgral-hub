"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GlassCard } from "@/components/ui/GlassCard";

interface ResourceLinksPanelProps {
  entityId: string;
  entityType: "crm_client" | "project";
}

export function ResourceLinksPanel({
  entityId,
  entityType,
}: ResourceLinksPanelProps) {
  const [links, setLinks] = useState<
    { id: string; title: string; url: string; category: string }[]
  >([]);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [loaded, setLoaded] = useState(false);

  const queryKey =
    entityType === "crm_client" ? "crm_client_id" : "project_id";

  const loadLinks = async () => {
    const res = await fetch(`/api/resource-links?${queryKey}=${entityId}`);
    const data = await res.json();
    setLinks(Array.isArray(data) ? data : []);
    setLoaded(true);
  };

  if (!loaded) {
    return (
      <Button variant="ghost" onClick={loadLinks} className="text-sm">
        Pokaż linki
      </Button>
    );
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/resource-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, url, [queryKey]: entityId }),
    });
    const link = await res.json();
    if (res.ok) {
      setLinks((prev) => [link, ...prev]);
      setTitle("");
      setUrl("");
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/resource-links?id=${id}`, { method: "DELETE" });
    setLinks((prev) => prev.filter((l) => l.id !== id));
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="grid gap-2 sm:grid-cols-3">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tytuł"
          required
        />
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          required
        />
        <Button type="submit">Dodaj link</Button>
      </form>

      {!links.length ? (
        <p className="text-sm text-white/40">Brak linków.</p>
      ) : (
        <div className="space-y-2">
          {links.map((link) => (
            <GlassCard key={link.id}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Link
                    href={link.url}
                    target="_blank"
                    className="font-medium hover:underline"
                  >
                    {link.title}
                  </Link>
                  <p className="text-xs text-white/40">{link.url}</p>
                </div>
                <Button variant="ghost" onClick={() => handleDelete(link.id)}>
                  Usuń
                </Button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
