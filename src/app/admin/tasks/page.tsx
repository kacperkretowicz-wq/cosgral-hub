"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { EmptyState, PageHeader } from "@/components/ui/CrmUi";
import { DonutChart } from "@/components/ui/GlassChart";
import { DeleteRecordButton } from "@/components/DeleteRecordButton";
import { TASK_STATUS_LABELS } from "@/lib/intranet-labels";
import { TEAM, teamLabel } from "@/lib/team";
import type { Project, Task, TaskStatus } from "@/lib/types";

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function TaskRow({
  task,
  projects,
  showDone,
  onChanged,
}: {
  task: Task;
  projects: Project[];
  showDone: boolean;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [assignee, setAssignee] = useState(task.assignee);
  const [dueDate, setDueDate] = useState(task.due_date ?? "");
  const [projectId, setProjectId] = useState(task.project_id ?? "");
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [notes, setNotes] = useState(task.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        assignee,
        due_date: dueDate || null,
        project_id: projectId || null,
        status,
        notes,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Błąd zapisu");
      return;
    }
    setOpen(false);
    onChanged();
  };

  const markDone = async () => {
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });
    onChanged();
  };

  const restore = async () => {
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "todo" }),
    });
    onChanged();
  };

  return (
    <li className="px-3 py-3.5 md:px-4">
      <div className="flex min-h-[48px] items-start gap-3">
        {!showDone ? (
          <button
            type="button"
            aria-label="Oznacz jako gotowe"
            onClick={() => void markDone()}
            className="mt-1 h-6 w-6 shrink-0 rounded-full border border-white/30 bg-white/5 backdrop-blur-md transition hover:bg-white hover:text-black"
          />
        ) : (
          <button
            type="button"
            onClick={() => void restore()}
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
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 text-[0.65rem] uppercase tracking-[0.14em] text-white/55 hover:text-white"
        >
          {open ? "Zamknij" : "Edytuj"}
        </button>
      </div>

      {open ? (
        <form onSubmit={save} className="mt-4 space-y-3 rounded-2xl border border-white/12 bg-white/[0.04] p-3 backdrop-blur-xl">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="glass-field w-full px-4 py-2.5 text-sm"
            required
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <select
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="glass-field px-4 py-2.5 text-sm"
            >
              {TEAM.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            <DateTimeField
              mode="date"
              label="Termin"
              value={dueDate}
              onChange={setDueDate}
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className="glass-field px-4 py-2.5 text-sm"
            >
              {(Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map((k) => (
                <option key={k} value={k}>
                  {TASK_STATUS_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="glass-field w-full px-4 py-2.5 text-sm"
          >
            <option value="">Bez zlecenia</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Notatki"
            className="glass-field w-full rounded-2xl px-4 py-3 text-sm"
          />
          {error ? <p className="text-xs text-red-300">{error}</p> : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? "…" : "Zapisz"}
            </Button>
            <DeleteRecordButton
              apiUrl={`/api/tasks/${task.id}`}
              onDeleted={async () => {
                setOpen(false);
                await onChanged();
              }}
              label="Usuń"
              confirmTitle="Usuń task"
              confirmMessage={`Usunąć „${task.title}”?`}
            />
          </div>
        </form>
      ) : null}
    </li>
  );
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
  const chart = useMemo(
    () =>
      [
        { label: "Do zrobienia", value: tasks.filter((t) => t.status === "todo").length },
        { label: "W toku", value: tasks.filter((t) => t.status === "doing").length },
        { label: "Gotowe", value: tasks.filter((t) => t.status === "done").length },
      ].filter((i) => i.value > 0),
    [tasks],
  );

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

  return (
    <div>
      <PageHeader
        eyebrow="CRM"
        title="Tasks"
        description="Dodawaj, edytuj i odhaczaj — kliknij Edytuj przy tasku."
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

      {chart.length ? (
        <section className="surface mb-6 p-5">
          <p className="label-mono mb-4">Postęp</p>
          <DonutChart items={chart} size={128} />
        </section>
      ) : null}

      {!showDone ? (
        <form onSubmit={addTask} className="surface mb-8 space-y-3 p-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nowy task…"
            className="glass-field w-full px-4 py-3 text-sm"
            required
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <select
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="glass-field px-4 py-2.5 text-sm"
            >
              {TEAM.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            <DateTimeField
              mode="date"
              label="Termin"
              value={dueDate}
              onChange={setDueDate}
            />
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="glass-field px-4 py-2.5 text-sm"
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
        <ul className="surface-list divide-y divide-white/8">
          {visible.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              projects={projects}
              showDone={showDone}
              onChanged={load}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
