import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });

// Fetch real-time Google Autocomplete suggestions
async function fetchSuggestions(query: string, gl = "us"): Promise<string[]> {
  try {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}&hl=en&gl=${gl}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Snappymarketer/1.0)" },
      signal: AbortSignal.timeout(4000),
    });
    const data = await res.json();
    return Array.isArray(data[1]) ? (data[1] as string[]) : [];
  } catch {
    return [];
  }
}

// Fetch recent Google News RSS headlines for a topic
async function fetchNewsHeadlines(query: string, gl = "us"): Promise<string[]> {
  try {
    const lang = ["es", "fr", "de", "pt", "it", "ja", "ko"].includes(gl) ? gl : "en";
    const cc = gl.toUpperCase();
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${lang}-${cc}&gl=${cc}&ceid=${cc}:${lang}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Snappymarketer/1.0)" },
      signal: AbortSignal.timeout(5000),
    });
    const text = await res.text();
    const headlines: string[] = [];
    // Extract item titles (skip channel title)
    const itemRegex = /<item>[\s\S]*?<title>([\s\S]*?)<\/title>/g;
    let m: RegExpExecArray | null;
    while ((m = itemRegex.exec(text)) !== null && headlines.length < 12) {
      const raw = m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, "$1").replace(/<[^>]+>/g, "").trim();
      if (raw) headlines.push(raw);
    }
    return headlines;
  } catch {
    return [];
  }
}

// Deduplicate and clean suggestion list
function dedup(arr: string[]): string[] {
  const seen = new Set<string>();
  return arr.filter(s => {
    const k = s.toLowerCase().trim();
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// Strip stale year references older than current year
function stripStaleYears(keywords: { keyword: string; trend: string; growth: number; volume: string }[], currentYear: number) {
  return keywords.map(kw => ({
    ...kw,
    keyword: kw.keyword
      .replace(new RegExp(`\\b(20[0-9]{2})\\b`, "g"), (match) => {
        const y = parseInt(match);
        return y < currentYear ? "" : match;
      })
      .replace(/\s{2,}/g, " ")
      .trim(),
  })).filter(kw => kw.keyword.length > 0);
}

export async function POST(req: NextRequest) {
  const { category, industry, keyword, geo = "us" } = await req.json();
  const topic = keyword || category || industry || "general business";
  const isKeywordExpansion = Boolean(keyword);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.toLocaleString("en-US", { month: "long" });
  const todayStr = `${currentMonth} ${currentYear}`;
  const glCode = (geo as string).toLowerCase().slice(0, 2);

  // Fetch real Google suggestions + recent news in parallel
  const seedQueries = isKeywordExpansion
    ? [topic, `best ${topic}`, `${topic} near me`, `how to ${topic}`, `${topic} vs`, `cheap ${topic}`]
    : [`${topic} trends`, `best ${topic}`, `${topic} tips`, `${topic} guide`, `${topic} tools`];

  const [suggestionArrays, newsHeadlines] = await Promise.all([
    Promise.all(seedQueries.map(q => fetchSuggestions(q, glCode))),
    fetchNewsHeadlines(topic, glCode),
  ]);
  const realSuggestions = dedup(suggestionArrays.flat()).slice(0, 40);

  const seedBlock = [
    realSuggestions.length > 0
      ? `\nReal Google Autocomplete suggestions right now (reflect what people are ACTUALLY searching today):\n${realSuggestions.map(s => `- ${s}`).join("\n")}`
      : "",
    newsHeadlines.length > 0
      ? `\nRecent news headlines (breaking/current events — use these to surface timely keywords):\n${newsHeadlines.map(h => `- ${h}`).join("\n")}`
      : "",
  ].filter(Boolean).join("\n");

  const sharedRules = `
Today is ${todayStr}. Generate keywords relevant as of ${currentYear}.

CRITICAL rules:
- NEVER include year numbers older than ${currentYear} in any keyword (no 2025, 2024, 2023, etc.)
- If a keyword is seasonal/time-sensitive (game schedules, holidays, events), write the timeless version: "knicks playoff tickets" NOT "knicks playoff tickets 2025"
- If the current year IS needed for context, you may use ${currentYear}
- Base keywords on what real users search TODAY in ${currentYear}
- Include real team matchups, current events, and trends from ${currentYear} where relevant${seedBlock}

Return ONLY a JSON array sorted by growth descending, no markdown:
[{"keyword":"...","trend":"rising","growth":45,"volume":"medium"},...]`;

  const prompt = isKeywordExpansion
    ? `Expand "${topic}" into 80 specific search queries people type into Google in ${currentYear}.

Include ALL of these types:
- Long-tail variations ("${topic} for beginners", "best ${topic}")
- Question queries (what is, how to, why, when, where)
- Comparison queries (vs, alternative to, instead of)
- Modifier queries (cheap, near me, online, professional, DIY)
- Use-case queries (for beginners, for home, for professionals)
- Buyer-intent queries (buy, price, discount, deal)
- Seasonal or currently trending angles specific to ${currentYear}

For each keyword:
- "trend": "rising" | "stable" | "declining"
- "growth": integer YoY% (-50 to +200)
- "volume": "high" | "medium" | "low"
${sharedRules}`

    : `Generate 80 specific keyword phrases people are actively searching on Google right now in ${currentYear} related to "${topic}".

Include a mix of:
- Currently trending topics in this space in ${currentYear}
- Question-based queries (how to, what is, best)
- Comparison & alternative queries
- Niche sub-topics and specific use cases
- Buyer-intent and commercial keywords
- Location or demographic modifiers where relevant

For each keyword:
- "trend": "rising" | "stable" | "declining"
- "growth": integer YoY% (-50 to +200)
- "volume": "high" | "medium" | "low"
${sharedRules}`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "[]";
  try {
    const match = text.match(/\[[\s\S]*\]/);
    const raw = match ? JSON.parse(match[0]) : [];
    const cleaned = stripStaleYears(raw, currentYear);
    return Response.json({ keywords: cleaned.slice(0, 80) });
  } catch {
    return Response.json({ keywords: [] });
  }
}
