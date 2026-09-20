import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-auth";
import { getOpsDb } from "@/lib/ops-db";
import { isTeamMemberId } from "@/lib/team";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  project_id: z.string().min(1).nullable().optional(),
  assignee: z.string().optional(),
  status: z.enum(["todo", "doing", "done"]).optional(),
  due_date: z.string().nullable().optional(),
  notes: z.string().optional(),
});

interface Props {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: Props) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.parse(body);
    if (parsed.assignee && !isTeamMemberId(parsed.assignee)) {
      return NextResponse.json(
        { error: "Assignee musi być jakub lub kacper." },
        { status: 400 },
      );
    }
    const data = await getOpsDb().updateTask(id, parsed);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Props) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    await getOpsDb().deleteTask(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
