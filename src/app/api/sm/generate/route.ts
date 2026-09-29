import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-auth";
import { smCreatePost } from "@/lib/sm-db";
import { generateCaption, generateImage, WEEKDAY_THEMES } from "@/lib/sm-ai";

const generateSchema = z.object({
  theme: z.string().optional(),
  platform: z.enum(["instagram", "facebook", "linkedin"]).optional(),
  post_type: z.enum(["static", "carousel", "story", "reel", "text"]).optional(),
  custom_topic: z.string().optional(),
  count: z.number().min(1).max(7).default(1),
});

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = generateSchema.parse(body);

    const dow = new Date().getDay(); // 0=Sun, 1=Mon…
    const todayConfig = WEEKDAY_THEMES[dow] ?? WEEKDAY_THEMES[1];

    const theme = parsed.theme ?? todayConfig.theme;
    const platforms = parsed.platform
      ? [parsed.platform]
      : todayConfig.platforms;
    const postType = parsed.post_type ?? todayConfig.post_type;

    const created = [];

    for (let i = 0; i < parsed.count; i++) {
      for (const platform of platforms) {
        const { caption, hashtags, imagePrompt } = await generateCaption({
          theme,
          platform,
          customTopic: parsed.custom_topic,
        });

        const imageUrl = await generateImage({ prompt: imagePrompt, postType });

        const post = await smCreatePost({
          platform,
          post_type: postType,
          theme,
          caption,
          hashtags,
          image_url: imageUrl,
          image_urls: null,
          video_url: null,
          status: "draft",
          platform_post_id: null,
          scheduled_at: null,
          published_at: null,
          error_message: null,
        });
        created.push(post);
      }
    }

    return NextResponse.json({
      posts: created,
      theme,
      theme_label: todayConfig.label,
    });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors }, { status: 400 });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
