import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { category, industry, keyword } = await req.json();
  const topic = keyword || category || industry || "general business";
  const isKeywordExpansion = Boolean(keyword);

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    messages: [{
      role: "user",
      content: isKeywordExpansion
        ? `Expand the keyword "${topic}" into 40 specific search queries that people ACTUALLY type into Google in 2025.

Include ALL of these types:
- Long-tail variations (e.g. "${topic} for beginners", "best ${topic} 2025")
- Question queries (what is, how to, why, when)
- Comparison queries (vs, alternative to, instead of)
- Modifier queries (cheap, near me, online, professional, DIY)
- Use-case queries (for weight loss, for women, for home, etc.)
- Brand/product specific if relevant
- Seasonal or trending angles

For each keyword return estimated metrics:
- "trend": "rising" | "stable" | "declining"
- "growth": integer YoY% estimate (-50 to +200)
- "volume": "high" | "medium" | "low"

Return ONLY a JSON array sorted by growth descending, no markdown:
[{"keyword":"...","trend":"rising","growth":45,"volume":"medium"},...]`

        : `Generate 40 specific keyword phrases that people are actively searching on Google right now in 2025 related to "${topic}".

Include a mix of:
- Currently trending rising topics in this space
- Question-based queries (how to, what is, best)
- Comparison & alternative queries
- Niche sub-topics and specific use cases
- Buyer-intent and commercial keywords
- Location or demographic modifiers where relevant

For each keyword return estimated metrics:
- "trend": "rising" | "stable" | "declining"
- "growth": integer YoY% estimate (-50 to +200)
- "volume": "high" | "medium" | "low"

Return ONLY a JSON array sorted by growth descending, no markdown:
[{"keyword":"...","trend":"rising","growth":65,"volume":"high"},...]`
    }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "[]";
  try {
    const match = text.match(/\[[\s\S]*\]/);
    const raw = match ? JSON.parse(match[0]) : [];
    return Response.json({ keywords: raw.slice(0, 40) });
  } catch {
    return Response.json({ keywords: [] });
  }
}
