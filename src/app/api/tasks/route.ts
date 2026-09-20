import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-auth";
import { getOpsDb } from "@/lib/ops-db";
import { notifyTeam } from "@/lib/notify";
import { isTeamMemberId, teamLabel } from "@/lib/team";

const createSchema = z.object({
  title: z.string().min(1),
  project_id: z.string().min(1).nullable().optional(),
  assignee: z.string().min(1),
  status: z.enum(["todo", "doing", "done"]).optional(),
  due_date: z.string().nullable().optional(),
  notes: z.string().optional(),
});

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const assignee = searchParams.get("assignee") ?? undefined;

  try {
    const data = await getOpsDb().getTasks({ from, to, assignee });
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
    if (!isTeamMemberId(parsed.assignee)) {
      return NextResponse.json(
        { error: "Assignee musi być jakub lub kacper." },
        { status: 400 },
      );
    }
    const data = await getOpsDb().createTask({
      title: parsed.title,
      project_id: parsed.project_id ?? null,
      assignee: parsed.assignee,
      status: parsed.status ?? "todo",
      due_date: parsed.due_date ?? null,
      notes: parsed.notes ?? "",
    });

    await notifyTeam({
      title: "✅ Utworzono nowy task",
      body: `${data.title}\nDla: ${teamLabel(data.assignee)}${
        data.due_date ? `\nTermin: ${data.due_date}` : ""
      }`,
      href: "/admin/tasks",
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
