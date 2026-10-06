import { v4 as uuidv4 } from "uuid";
import type { TeamMessage } from "./types";
import { assertPersistentDb } from "./persistence";
import { readJsonStore, writeJsonStore } from "./json-store";
import { notifyTeam } from "./notify";
import { teamLabel } from "./team";

const FILE = "team_messages.json";
const CHANNEL = "general";

async function readMessages(): Promise<TeamMessage[]> {
  return readJsonStore<TeamMessage[]>(FILE, []);
}

async function writeMessages(messages: TeamMessage[]): Promise<void> {
  assertPersistentDb("zapis team chat");
  await writeJsonStore(FILE, messages);
}

export async function listTeamMessages(
  channel = CHANNEL,
  limit = 200,
): Promise<TeamMessage[]> {
  const messages = await readMessages();
  return messages
    .filter((m) => m.channel === channel)
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )
    .slice(-limit);
}

export async function createTeamMessage(input: {
  author_id: string;
  body: string;
  channel?: string;
}): Promise<TeamMessage> {
  const messages = await readMessages();
  const message: TeamMessage = {
    id: uuidv4(),
    channel: input.channel ?? CHANNEL,
    author_id: input.author_id,
    body: input.body.trim(),
    created_at: new Date().toISOString(),
    updated_at: null,
  };
  messages.push(message);
  // keep last 500
  const trimmed = messages.slice(-500);
  await writeMessages(trimmed);

  await notifyTeam({
    title: `💬 Nowa wiadomość w czacie firmowym`,
    body: `${teamLabel(input.author_id)}:\n${message.body.slice(0, 400)}`,
    href: "/admin/team",
  });

  return message;
}

export async function getTeamMessage(id: string): Promise<TeamMessage | null> {
  const messages = await readMessages();
  return messages.find((m) => m.id === id) ?? null;
}

export async function updateTeamMessage(
  id: string,
  body: string,
): Promise<TeamMessage | null> {
  const messages = await readMessages();
  const idx = messages.findIndex((m) => m.id === id);
  if (idx < 0) return null;
  const nextBody = body.trim();
  if (!nextBody) return null;
  messages[idx] = {
    ...messages[idx],
    body: nextBody,
    updated_at: new Date().toISOString(),
  };
  await writeMessages(messages);
  return messages[idx];
}

export async function deleteTeamMessage(id: string): Promise<boolean> {
  const messages = await readMessages();
  const next = messages.filter((m) => m.id !== id);
  if (next.length === messages.length) return false;
  await writeMessages(next);
  return true;
}
