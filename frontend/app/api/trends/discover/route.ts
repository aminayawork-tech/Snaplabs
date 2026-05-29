import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { category, industry } = await req.json();
  const topic = category || industry || "general business";

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [{
      role: "user",
      content: `Generate 12 currently trending, specific long-tail keyword phrases that people are actively searching on Google in the "${topic}" industry/category right now in 2025.

Rules:
- Each keyword must be 2-6 words
- Focus on rising trends, not evergreen basics
- Mix informational, commercial and transactional intent
- Be specific (e.g. "mushroom coffee benefits" not just "coffee")
- Return ONLY a JSON array of strings, no markdown fences

Example format: ["keyword one", "keyword two", ...]`
    }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "[]";
  try {
    const match = text.match(/\[[\s\S]*\]/);
    const keywords: string[] = match ? JSON.parse(match[0]) : [];
    return Response.json({ keywords: keywords.slice(0, 12) });
  } catch {
    return Response.json({ keywords: [] });
  }
}
