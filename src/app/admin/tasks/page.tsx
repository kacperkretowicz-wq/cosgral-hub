"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { EmptyState, PageHeader } from "@/components/ui/CrmUi";
import { TEAM, teamLabel } from "@/lib/team";
import type { Project, Task } from "@/lib/types";

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("jakub");
  const [dueDate, setDueDate] = useState(todayIso());
  const [projectId, setProjectId] = useState("");
  const [busy, setBusy] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const load = useCallback(async () => {
    try {
      const [tRes, pRes] = await Promise.all([
        fetch("/api/tasks", { cache: "no-store" }),
        fetch("/api/projects", { cache: "no-store" }),
      ]);
      const tData = await tRes.json();
      const pData = await pRes.json();
      if (!tRes.ok) {
        setError(typeof tData.error === "string" ? tData.error : "Błąd");
        return;
      }
      setTasks(Array.isArray(tData) ? tData : []);
      setProjects(Array.isArray(pData) ? pData : []);
      setError("");
    } catch {
      setError("Błąd sieci");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const active = tasks.filter((t) => t.status !== "done");
  const done = tasks.filter((t) => t.status === "done");
  const visible = showDone ? done : active;

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        assignee,
        due_date: dueDate || null,
        project_id: projectId || null,
        status: "todo",
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Błąd");
      return;
    }
    setTitle("");
    await load();
  };

  const markDone = async (id: string) => {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });
    await load();
  };

  const restore = async (id: string) => {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "todo" }),
    });
    await load();
  };

  return (
    <div>
      <PageHeader
        eyebrow="CRM"
        title="Tasks"
        description="Checklista — odhaczone znikają z aktywnej listy."
        actions={
          <Button
            variant="secondary"
            type="button"
            onClick={() => setShowDone((v) => !v)}
          >
            {showDone ? "Aktywne" : "Archiwum"}
          </Button>
        }
      />

      {error ? (
        <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {!showDone ? (
        <form
          onSubmit={addTask}
          className="mb-8 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nowy task…"
            className="w-full rounded-full border border-white/15 bg-black/40 px-4 py-3 text-sm outline-none focus:border-white/35"
            required
          />
          <div className="grid gap-2 sm:grid-cols-3">
            <select
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="rounded-full border border-white/15 bg-black/40 px-4 py-2.5 text-sm"
            >
              {TEAM.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            <DateTimeField
              mode="date"
              value={dueDate}
              onChange={setDueDate}
            />
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="rounded-full border border-white/15 bg-black/40 px-4 py-2.5 text-sm"
            >
              <option value="">Bez zlecenia</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? "…" : "+ Dodaj"}
          </Button>
        </form>
      ) : null}

      {!visible.length ? (
        <EmptyState
          title={showDone ? "Puste archiwum" : "Brak aktywnych tasków"}
          description={
            showDone
              ? "Odhaczone taski pojawią się tutaj."
              : "Dodaj task powyżej."
          }
        />
      ) : (
        <ul className="divide-y divide-white/10 border-y border-white/10">
          {visible.map((task) => (
            <li
              key={task.id}
              className="flex min-h-[64px] items-start gap-3 py-4"
            >
              {!showDone ? (
                <button
                  type="button"
                  aria-label="Oznacz jako gotowe"
                  onClick={() => void markDone(task.id)}
                  className="mt-1 h-6 w-6 shrink-0 rounded-full border border-white/30 transition hover:bg-white hover:text-black"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => void restore(task.id)}
                  className="mt-1 shrink-0 text-xs text-white/40 underline"
                >
                  Przywróć
                </button>
              )}
              <div className="min-w-0 flex-1">
                <p
                  className={`font-medium ${showDone ? "text-white/40 line-through" : "text-white"}`}
                >
                  {task.title}
                </p>
                <p className="mt-1 text-xs text-white/40">
                  {teamLabel(task.assignee)}
                  {task.due_date ? ` · ${task.due_date}` : ""}
                  {task.project_id ? (
                    <>
                      {" · "}
                      <Link
                        href={`/admin/zlecenia/${task.project_id}`}
                        className="underline hover:text-white"
                      >
                        zlecenie
                      </Link>
                    </>
                  ) : null}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
