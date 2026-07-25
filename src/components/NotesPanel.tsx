"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface NotesPanelProps {
  entityId: string;
  entityType: "crm_client" | "project";
}

export function NotesPanel({ entityId, entityType }: NotesPanelProps) {
  const [notes, setNotes] = useState<
    { id: string; content: string; author_email: string; created_at: string }[]
  >([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const queryKey =
    entityType === "crm_client" ? "crm_client_id" : "project_id";

  const loadNotes = async () => {
    const res = await fetch(`/api/notes?${queryKey}=${entityId}`);
    const data = await res.json();
    setNotes(Array.isArray(data) ? data : []);
    setLoaded(true);
  };

  if (!loaded) {
    return (
      <Button variant="ghost" onClick={loadNotes} className="text-sm">
        Pokaż notatki
      </Button>
    );
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        [queryKey]: entityId,
      }),
    });
    const note = await res.json();
    if (res.ok) {
      setNotes((prev) => [note, ...prev]);
      setContent("");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="flex gap-2">
        <Input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Dodaj notatkę..."
          className="flex-1"
        />
        <Button type="submit" disabled={loading}>
          Dodaj
        </Button>
      </form>

      {!notes.length ? (
        <p className="text-sm text-white/40">Brak notatek.</p>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div key={note.id} className="rounded-sm bg-white/5 p-3 text-sm">
              <p className="text-white/80">{note.content}</p>
              <p className="mt-1 text-xs text-white/30">
                {note.author_email} ·{" "}
                {new Date(note.created_at).toLocaleString("pl-PL")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
