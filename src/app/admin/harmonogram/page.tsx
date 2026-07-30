"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GlassCard } from "@/components/ui/GlassCard";
import { TASK_STATUS_LABELS } from "@/lib/intranet-labels";
import { TEAM, teamLabel } from "@/lib/team";
import type { Project, Task, TaskStatus } from "@/lib/types";

function startOfWeek(d = new Date()): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(d.getDate() + diff);
  return monday;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const DAY_LABELS = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Ndz"];

export default function HarmonogramPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("jakub");
  const [dueDate, setDueDate] = useState(isoDate(new Date()));
  const [projectId, setProjectId] = useState("");
  const [saving, setSaving] = useState(false);

  const from = isoDate(weekStart);
  const to = isoDate(addDays(weekStart, 6));

  const load = useCallback(async () => {
    setError("");
    try {
      const [tasksRes, projectsRes] = await Promise.all([
        fetch(`/api/tasks?from=${from}&to=${to}`, { cache: "no-store" }),
        fetch("/api/projects", { cache: "no-store" }),
      ]);
      const tasksData = await tasksRes.json();
      const projectsData = await projectsRes.json();
      if (!tasksRes.ok) {
        setError(
          typeof tasksData.error === "string"
            ? tasksData.error
            : "Błąd ładowania zadań — uruchom migrację 008_agency_os.sql",
        );
        setTasks([]);
      } else {
        setTasks(Array.isArray(tasksData) ? tasksData : []);
      }
      setProjects(Array.isArray(projectsData) ? projectsData : []);
    } catch {
      setError("Błąd sieci");
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        assignee,
        due_date: dueDate || null,
        project_id: projectId || null,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Błąd zapisu");
      return;
    }
    setTitle("");
    await load();
  };

  const setStatus = async (id: string, status: TaskStatus) => {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm("Usunąć zadanie?")) return;
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    await load();
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Harmonogram</h1>
          <p className="mt-1 text-sm text-white/50">
            Wspólny tydzień — Jakub i Kacper
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
          >
            ←
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setWeekStart(startOfWeek())}
          >
            Ten tydzień
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
          >
            →
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-sm border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <GlassCard title="Nowe zadanie">
        <form onSubmit={createTask} className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Tytuł"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="np. Draft oferty / montaż rolki"
          />
          <Input
            label="Termin"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <div className="space-y-2">
            <label className="block text-sm text-white/70">Kto</label>
            <select
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="w-full rounded-sm border border-white/20 bg-white/5 px-3 py-2 text-sm"
            >
              {TEAM.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-sm text-white/70">Zlecenie</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded-sm border border-white/20 bg-white/5 px-3 py-2 text-sm"
            >
              <option value="">— bez zlecenia —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Zapisywanie…" : "Dodaj do tygodnia"}
            </Button>
          </div>
        </form>
      </GlassCard>

      <div className="grid gap-3 md:grid-cols-7">
        {days.map((day, i) => {
          const key = isoDate(day);
          const dayTasks = tasks.filter((t) => t.due_date === key);
          const isToday = key === isoDate(new Date());
          return (
            <div
              key={key}
              className={`rounded-lg border p-3 ${
                isToday
                  ? "border-white/40 bg-white/10"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <p className="text-xs uppercase tracking-wide text-white/40">
                {DAY_LABELS[i]}
              </p>
              <p className="mb-3 text-sm font-medium">
                {day.toLocaleDateString("pl-PL", {
                  day: "numeric",
                  month: "short",
                })}
              </p>
              <div className="space-y-2">
                {!dayTasks.length && (
                  <p className="text-xs text-white/30">—</p>
                )}
                {dayTasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-sm bg-black/40 p-2 text-xs"
                  >
                    <p className="font-medium leading-snug">{task.title}</p>
                    <p className="mt-1 text-white/40">
                      {teamLabel(task.assignee)}
                      {task.projects?.title
                        ? ` · ${task.projects.title}`
                        : ""}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(
                        Object.keys(TASK_STATUS_LABELS) as TaskStatus[]
                      ).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setStatus(task.id, s)}
                          className={`rounded px-1.5 py-0.5 ${
                            task.status === s
                              ? "bg-white text-black"
                              : "bg-white/10 text-white/50"
                          }`}
                        >
                          {TASK_STATUS_LABELS[s].slice(0, 4)}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => remove(task.id)}
                        className="ml-auto text-red-300/70"
                      >
                        ×
                      </button>
                    </div>
                    {task.project_id && (
                      <Link
                        href={`/admin/zlecenia/${task.project_id}`}
                        className="mt-1 inline-block text-white/40 underline"
                      >
                        zlecenie
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
