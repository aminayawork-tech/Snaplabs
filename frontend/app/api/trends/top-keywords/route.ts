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

const TIMEFRAME_LABELS: Record<string, string> = {
  "1m": "this month",
  "6m": "the past 6 months",
  "1y": "the past year",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const geo = (searchParams.get("geo") ?? "US").toUpperCase().slice(0, 2);
  const timeframe = (searchParams.get("timeframe") ?? "1m") as "1m" | "6m" | "1y";

  const cacheKey = `${geo}-${timeframe}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return Response.json({ keywords: cached.keywords, geo, timeframe, fromCache: true });
  }

  const country = COUNTRY_NAMES[geo] ?? geo;
  const tfLabel = TIMEFRAME_LABELS[timeframe] ?? "this month";

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.toLocaleString("en-US", { month: "long" });
  const todayStr = `${currentMonth} ${currentYear}`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1200,
      messages: [
        {
          role: "user",
          content: `Today is ${todayStr}. List exactly 24 keywords with the highest monthly search volumes in ${country} for ${tfLabel}. They MUST span at least 8 different categories (health, finance, food, tech, travel, beauty, sports, entertainment, real estate, education, etc.).

Return ONLY a valid JSON array, no markdown, no explanation:
[
  { "keyword": "...", "category": "...", "monthly_volume": "...", "trend": "rising|stable|declining" }
]

Rules:
- monthly_volume as short string: "5M", "2.2M", "450K", "90K"
- keyword must be an actual search query people type right now in ${currentYear}
- NEVER include year numbers in keywords (e.g. do NOT write "best laptop ${currentYear - 2}" or "top movies ${currentYear - 1}") — write timeless queries like "best laptop" or "new movies"
- If a keyword is inherently time-sensitive (e.g. sports scores, current events), write the timeless version
- category should be short (2-3 words max)
- trend: rising = growing vs prior period, stable = flat, declining = shrinking
- focus on queries people search when looking to buy, learn, or solve a problem
- be specific to ${country}'s culture, language, and search behavior in ${currentYear}`,
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

    // Strip any stale year references that slipped through (e.g. "2023", "2024", "2025")
    keywords = keywords.map(kw => ({
      ...kw,
      keyword: kw.keyword.replace(/\b(202[0-5])\b/g, "").replace(/\s{2,}/g, " ").trim(),
    }));

    cache.set(cacheKey, { keywords, expiresAt: Date.now() + CACHE_TTL });
    return Response.json({ keywords, geo, timeframe });
  } catch (err) {
    return Response.json({ keywords: [], geo, timeframe, error: String(err) });
  }
}
