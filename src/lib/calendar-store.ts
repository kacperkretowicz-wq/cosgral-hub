import { v4 as uuidv4 } from "uuid";
import type { CalendarEvent } from "./types";
import { assertPersistentDb } from "./persistence";
import { readJsonStore, writeJsonStore } from "./json-store";
import { notifyTeam } from "./notify";

const FILE = "calendar_events.json";

async function readEvents(): Promise<CalendarEvent[]> {
  return readJsonStore<CalendarEvent[]>(FILE, []);
}

async function writeEvents(events: CalendarEvent[]): Promise<void> {
  assertPersistentDb("zapis kalendarza");
  await writeJsonStore(FILE, events);
}

export async function listCalendarEvents(): Promise<CalendarEvent[]> {
  const events = await readEvents();
  return events.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

export async function getCalendarEvent(
  id: string,
): Promise<CalendarEvent | null> {
  const events = await readEvents();
  return events.find((e) => e.id === id) ?? null;
}

export async function createCalendarEvent(
  input: Omit<CalendarEvent, "id" | "created_at" | "updated_at" | "reminded">,
): Promise<CalendarEvent> {
  const events = await readEvents();
  const now = new Date().toISOString();
  const event: CalendarEvent = {
    ...input,
    id: uuidv4(),
    reminded: false,
    created_at: now,
    updated_at: now,
  };
  events.push(event);
  await writeEvents(events);
  return event;
}

export async function updateCalendarEvent(
  id: string,
  input: Partial<CalendarEvent>,
): Promise<CalendarEvent> {
  const events = await readEvents();
  const idx = events.findIndex((e) => e.id === id);
  if (idx === -1) throw new Error("Event not found");
  events[idx] = {
    ...events[idx],
    ...input,
    updated_at: new Date().toISOString(),
  };
  await writeEvents(events);
  return events[idx];
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  const events = await readEvents();
  await writeEvents(events.filter((e) => e.id !== id));
}

/** Fire due reminders once; call on list/poll. */
export async function processCalendarReminders(): Promise<number> {
  const events = await readEvents();
  const now = Date.now();
  let sent = 0;
  let dirty = false;

  for (const event of events) {
    if (!event.remind_at || event.reminded) continue;
    const at = new Date(event.remind_at).getTime();
    if (Number.isNaN(at) || at > now) continue;
    await notifyTeam({
      title: `📅 Przypomnienie: ${event.title}`,
      body: `${new Date(event.starts_at).toLocaleString("pl-PL")}${
        event.notes ? `\n${event.notes.slice(0, 200)}` : ""
      }`,
      href: "/admin/kalendarz",
    });
    event.reminded = true;
    event.updated_at = new Date().toISOString();
    sent += 1;
    dirty = true;
  }

  if (dirty) await writeEvents(events);
  return sent;
}
