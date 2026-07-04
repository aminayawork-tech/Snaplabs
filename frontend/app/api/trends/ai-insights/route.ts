import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 30;

const client = new Anthropic();

async function fetchSuggestions(query: string): Promise<string[]> {
  try {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}&hl=en`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Snappymarketer/1.0)" },
      signal: AbortSignal.timeout(3000),
    });
    const data = await res.json();
    return Array.isArray(data[1]) ? (data[1] as string[]) : [];
  } catch {
    return [];
  }
}

async function fetchNewsHeadlines(query: string): Promise<string[]> {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Snappymarketer/1.0)" },
      signal: AbortSignal.timeout(5000),
    });
    const text = await res.text();
    const headlines: string[] = [];
    const itemRegex = /<item>[\s\S]*?<title>([\s\S]*?)<\/title>/g;
    let m: RegExpExecArray | null;
    while ((m = itemRegex.exec(text)) !== null && headlines.length < 10) {
      const raw = m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, "$1").replace(/<[^>]+>/g, "").trim();
      if (raw) headlines.push(raw);
    }
    return headlines;
  } catch {
    return [];
  }
}

function dedup(arr: string[]): string[] {
  const seen = new Set<string>();
  return arr.filter(s => {
    const k = s.toLowerCase().trim();
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export async function POST(req: NextRequest) {
  const { keyword } = await req.json();
  if (!keyword) return Response.json({ error: "keyword required" }, { status: 400 });

  const now = new Date();
  const dateStr = `${now.toLocaleString("en-US", { month: "long" })} ${now.getFullYear()}`;

  // Fetch autocomplete + news in parallel
  const seeds = [
    keyword,
    `${keyword} tips`,
    `best ${keyword}`,
    `${keyword} how to`,
    `${keyword} trends`,
    `${keyword} near me`,
  ];
  const [arrays, newsHeadlines] = await Promise.all([
    Promise.all(seeds.map(q => fetchSuggestions(q))),
    fetchNewsHeadlines(keyword),
  ]);
  const suggestions = dedup(arrays.flat()).filter(s => s !== keyword).slice(0, 35);

  const contextBlock = [
    suggestions.length > 0
      ? `Real Google Autocomplete suggestions right now:\n${suggestions.map(s => `- ${s}`).join("\n")}`
      : "No autocomplete data available.",
    newsHeadlines.length > 0
      ? `\nRecent news headlines (breaking/current events for this topic):\n${newsHeadlines.map(h => `- ${h}`).join("\n")}`
      : "",
  ].filter(Boolean).join("\n");

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Today is ${dateStr}. Analyze the keyword: "${keyword}"

${contextBlock}

Use the news headlines and autocomplete data above to ground your analysis in CURRENT events and searches. Return a concise analysis as JSON only (no markdown):
{
  "summary": "2-3 sentences on what's driving current interest in this keyword, referencing specific recent events if the news shows them",
  "rising_trends": ["5-7 specific rising sub-topics or angles people are searching RIGHT NOW"],
  "audience_intent": "1-2 sentences on who is searching this and what they want",
  "content_opportunities": ["3-4 specific content ideas with clear angles tied to current events"],
  "key_takeaways": ["3 short, actionable takeaways for a marketer"]
}`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "{}";
  try {
    const match = text.match(/\{[\s\S]*\}/);
    const data = match ? JSON.parse(match[0]) : {};
    return Response.json({ ...data, keyword, suggestions: suggestions.slice(0, 12) });
  } catch {
    return Response.json({ keyword, error: "Parse error" }, { status: 500 });
  }
}
