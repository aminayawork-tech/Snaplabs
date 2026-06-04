import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

interface TopKeyword {
  keyword: string;
  category: string;
  monthly_volume: string;
  trend: "rising" | "stable" | "declining";
}

const client = new Anthropic();
const cache = new Map<string, { keywords: TopKeyword[]; expiresAt: number }>();
const CACHE_TTL = 60 * 60 * 1000;

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States", GB: "United Kingdom", CA: "Canada", AU: "Australia",
  IN: "India", DE: "Germany", FR: "France", BR: "Brazil", JP: "Japan",
  ES: "Spain", MX: "Mexico", NL: "Netherlands", IT: "Italy", SG: "Singapore",
  ZA: "South Africa", KR: "South Korea", NG: "Nigeria", AR: "Argentina",
  DO: "Dominican Republic", CO: "Colombia",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const geo = (searchParams.get("geo") ?? "US").toUpperCase().slice(0, 2);

  const cached = cache.get(geo);
  if (cached && cached.expiresAt > Date.now()) {
    return Response.json({ keywords: cached.keywords, geo, fromCache: true });
  }

  const country = COUNTRY_NAMES[geo] ?? geo;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1200,
      messages: [
        {
          role: "user",
          content: `List exactly 24 keywords with the highest monthly search volumes in ${country}. They MUST span at least 8 different categories (health, finance, food, tech, travel, beauty, sports, entertainment, real estate, education, etc.).

Return ONLY a valid JSON array, no markdown, no explanation:
[
  { "keyword": "...", "category": "...", "monthly_volume": "...", "trend": "rising|stable|declining" }
]

Rules:
- monthly_volume as short string: "5M", "2.2M", "450K", "90K"
- keyword must be an actual search query people type
- category should be short (2-3 words max)
- trend: rising = growing YoY, stable = flat, declining = shrinking
- focus on queries people search when looking to buy, learn, or solve a problem
- be specific to ${country}'s culture and language patterns`,
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "[]";
    let keywords: TopKeyword[] = [];
    try {
      keywords = JSON.parse(text);
    } catch {
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        try { keywords = JSON.parse(match[0]); } catch { /* empty */ }
      }
    }

    cache.set(geo, { keywords, expiresAt: Date.now() + CACHE_TTL });
    return Response.json({ keywords, geo });
  } catch (err) {
    return Response.json({ keywords: [], geo, error: String(err) });
  }
}
