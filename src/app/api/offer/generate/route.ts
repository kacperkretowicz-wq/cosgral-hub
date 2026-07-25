import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-auth";
import { normalizeOptionalDate } from "@/lib/date-utils";
import { generateOfferContentWithGemini } from "@/lib/gemini-offer";
import { buildDefaultOfferContent } from "@/lib/offer-content";
import { inspirationSchema } from "@/lib/inspiration-utils";

const schema = z.object({
  company_name: z.string().min(1),
  industry: z.string().optional(),
  page_type: z.enum(["onepage", "multipage"]),
  deadline: z.string().optional(),
  inspirations: z.array(inspirationSchema).optional(),
  use_gemini: z.boolean().optional(),
});

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const parsed = schema.parse(body);
    const deadline = normalizeOptionalDate(parsed.deadline) ?? "";

    const offerData = {
      companyName: parsed.company_name,
      pageType: parsed.page_type,
      deadline,
      industry: parsed.industry,
      inspirations: parsed.inspirations ?? [],
    };

    const offerContent =
      parsed.use_gemini !== false
        ? await generateOfferContentWithGemini(
            offerData,
            parsed.inspirations ?? [],
          )
        : buildDefaultOfferContent(offerData);

    return NextResponse.json({ offer_content: offerContent });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
