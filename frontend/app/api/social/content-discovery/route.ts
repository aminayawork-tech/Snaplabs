import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 45;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { keyword } = await req.json();
  if (!keyword) return Response.json({ error: "Keyword required" }, { status: 400 });

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 700,
      messages: [{
        role: "user",
        content: `Content strategist. Analyze what content exists and what's missing for the topic: "${keyword}".
Return ONLY valid JSON:
{"top_formats":["format1","format2","format3","format4"],"best_angles":["angle1","angle2","angle3","angle4"],"platform_activity":[{"platform":"YouTube","level":"high","what_works":"tutorial videos"},{"platform":"Reddit","level":"high","what_works":"discussion threads"},{"platform":"TikTok","level":"medium","what_works":"quick tips"},{"platform":"LinkedIn","level":"low","what_works":"professional takes"},{"platform":"Facebook","level":"medium","what_works":"community groups"},{"platform":"X","level":"medium","what_works":"threads and hot takes"}],"trending_topics":["topic1","topic2","topic3"],"content_gaps":["gap1","gap2","gap3"]}`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    const match = text.match(/\{[\s\S]*\}/);
    const data = match ? JSON.parse(match[0]) : {};
    return Response.json(data);
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
