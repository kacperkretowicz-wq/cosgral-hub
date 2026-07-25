import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-auth";
import { normalizeOptionalDate } from "@/lib/date-utils";
import { chatEditOfferText } from "@/lib/gemini-offer";

const schema = z.object({
  company_name: z.string().min(1),
  industry: z.string().optional(),
  page_type: z.enum(["onepage", "multipage"]),
  deadline: z.string().optional(),
  offer_text: z.string().min(1),
  message: z.string().min(1),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "model"]),
        text: z.string(),
      }),
    )
    .optional(),
});

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const parsed = schema.parse(body);
    const deadline = normalizeOptionalDate(parsed.deadline) ?? "";

    const result = await chatEditOfferText(
      {
        companyName: parsed.company_name,
        pageType: parsed.page_type,
        deadline,
        industry: parsed.industry,
      },
      parsed.offer_text,
      parsed.history ?? [],
      parsed.message,
    );

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
