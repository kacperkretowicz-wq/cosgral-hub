import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-auth";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarEvent,
  listCalendarEvents,
  processCalendarReminders,
  updateCalendarEvent,
} from "@/lib/calendar-store";

const createSchema = z.object({
  title: z.string().min(1),
  starts_at: z.string().min(1),
  ends_at: z.string().nullable().optional(),
  all_day: z.boolean().optional(),
  attendees: z.array(z.string()).optional(),
  notes: z.string().optional(),
  remind_at: z.string().nullable().optional(),
});

const updateSchema = createSchema.partial();

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    await processCalendarReminders();
    const data = await listCalendarEvents();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const parsed = createSchema.parse(body);
    const data = await createCalendarEvent({
      title: parsed.title,
      starts_at: parsed.starts_at,
      ends_at: parsed.ends_at ?? null,
      all_day: parsed.all_day ?? false,
      attendees: parsed.attendees ?? [],
      notes: parsed.notes ?? "",
      remind_at: parsed.remind_at ?? null,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const id = z.string().min(1).parse(body.id);
    const parsed = updateSchema.parse(body);
    const existing = await getCalendarEvent(id);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const { id: _id, ...rest } = parsed as typeof parsed & { id?: string };
    const data = await updateCalendarEvent(id, {
      ...rest,
      reminded:
        rest.remind_at !== undefined && rest.remind_at !== existing.remind_at
          ? false
          : existing.reminded,
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    await deleteCalendarEvent(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
