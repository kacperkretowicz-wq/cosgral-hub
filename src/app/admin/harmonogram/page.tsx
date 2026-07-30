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

/** Local YYYY-MM-DD (avoids UTC skew). */
function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const DAY_LABELS = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Ndz"];

function TaskCard({
  task,
  onStatus,
  onRemove,
}: {
  task: Task;
  onStatus: (id: string, status: TaskStatus) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="rounded-sm bg-black/40 p-3 text-sm">
      <p className="font-medium leading-snug">{task.title}</p>
      <p className="mt-1 text-xs text-white/40">
        {teamLabel(task.assignee)}
        {task.projects?.title ? ` · ${task.projects.title}` : ""}
      </p>
      <div className="mt-2 flex flex-wrap gap-1">
        {(Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onStatus(task.id, s)}
            className={`rounded px-1.5 py-0.5 text-xs ${
              task.status === s
                ? "bg-white text-black"
                : "bg-white/10 text-white/50"
            }`}
          >
            {TASK_STATUS_LABELS[s]}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onRemove(task.id)}
          className="ml-auto text-red-300/70"
        >
          ×
        </button>
      </div>
      {task.project_id && (
        <Link
          href={`/admin/zlecenia/${task.project_id}`}
          className="mt-1 inline-block text-xs text-white/40 underline"
        >
          zlecenie
        </Link>
      )}
    </div>
  );
}

export default function HarmonogramPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("jakub");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [dueDate, setDueDate] = useState(isoDate(new Date()));
  const [projectId, setProjectId] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState(isoDate(new Date()));

  const from = isoDate(weekStart);
  const to = isoDate(addDays(weekStart, 6));

  const load = useCallback(async () => {
    setError("");
    try {
      const q = new URLSearchParams({ from, to });
      if (filterAssignee) q.set("assignee", filterAssignee);
      const [tasksRes, projectsRes] = await Promise.all([
        fetch(`/api/tasks?${q}`, { cache: "no-store" }),
        fetch("/api/projects", { cache: "no-store" }),
      ]);
      const tasksData = await tasksRes.json();
      const projectsData = await projectsRes.json();
      if (!tasksRes.ok) {
        setError(
          typeof tasksData.error === "string"
            ? tasksData.error
            : "Błąd ładowania zadań",
        );
        setTasks([]);
      } else {
        setTasks(Array.isArray(tasksData) ? tasksData : []);
      }
      setProjects(Array.isArray(projectsData) ? projectsData : []);
    } catch {
      setError("Błąd sieci");
    }
  }, [from, to, filterAssignee]);

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
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Błąd statusu");
      return;
    }
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm("Usunąć zadanie?")) return;
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Nie udało się usunąć");
      return;
    }
    await load();
  };

  const selectedTasks = tasks.filter((t) => t.due_date === selectedDay);

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
            onClick={() => {
              const start = startOfWeek();
              setWeekStart(start);
              setSelectedDay(isoDate(new Date()));
            }}
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

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilterAssignee("")}
          className={`rounded-sm px-3 py-1.5 text-xs ${
            !filterAssignee ? "bg-white text-black" : "bg-white/10 text-white/60"
          }`}
        >
          Obaj
        </button>
        {TEAM.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setFilterAssignee(m.id)}
            className={`rounded-sm px-3 py-1.5 text-xs ${
              filterAssignee === m.id
                ? "bg-white text-black"
                : "bg-white/10 text-white/60"
            }`}
          >
            {m.label}
          </button>
        ))}
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

      {/* Mobile: day picker + list */}
      <div className="space-y-3 md:hidden">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {days.map((day, i) => {
            const key = isoDate(day);
            const count = tasks.filter((t) => t.due_date === key).length;
            const isSelected = key === selectedDay;
            const isToday = key === isoDate(new Date());
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSelectedDay(key);
                  setDueDate(key);
                }}
                className={`min-w-[3.25rem] rounded-sm px-2 py-2 text-center ${
                  isSelected
                    ? "bg-white text-black"
                    : isToday
                      ? "bg-white/20 text-white"
                      : "bg-white/5 text-white/60"
                }`}
              >
                <span className="block text-[10px] uppercase">
                  {DAY_LABELS[i]}
                </span>
                <span className="block text-sm font-medium">
                  {day.getDate()}
                </span>
                {count > 0 && (
                  <span className="block text-[10px] opacity-70">{count}</span>
                )}
              </button>
            );
          })}
        </div>
        <div className="space-y-2">
          {!selectedTasks.length ? (
            <p className="text-sm text-white/40">Brak zadań tego dnia.</p>
          ) : (
            selectedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onStatus={setStatus}
                onRemove={remove}
              />
            ))
          )}
        </div>
      </div>

      {/* Desktop week grid */}
      <div className="hidden gap-3 md:grid md:grid-cols-7">
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
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStatus={setStatus}
                    onRemove={remove}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
