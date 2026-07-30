import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-auth";
import { normalizeOptionalDate } from "@/lib/date-utils";
import { generateOfferDocument } from "@/lib/free-ai-offer";
import { getFreeAiProvider } from "@/lib/free-ai-offer";

const schema = z.object({
  company_name: z.string().min(1),
  industry: z.string().optional(),
  page_type: z.enum(["onepage", "multipage"]),
  deadline: z.string().optional(),
  drive_folder_url: z.string().optional(),
});

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const parsed = schema.parse(body);
    const deadline = normalizeOptionalDate(parsed.deadline) ?? "";

    const result = await generateOfferDocument({
      companyName: parsed.company_name,
      pageType: parsed.page_type,
      deadline,
      industry: parsed.industry,
      driveFolderUrl: parsed.drive_folder_url,
    });

    return NextResponse.json({
      ...result,
      ai_provider: getFreeAiProvider(),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
