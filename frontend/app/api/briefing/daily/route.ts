import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

const client = new Anthropic();

// Server-side cache keyed by YYYY-MM-DD, refreshes every 6 hours
const cache = new Map<string, { data: BriefingResponse; ts: number }>();
const CACHE_TTL = 6 * 60 * 60 * 1000;

interface BriefingTopic {
  name: string;
  category: string;
  summary: string;
  what_next: string;
  related: string[];
  momentum: "exploding" | "rising" | "steady";
}

interface BriefingResponse {
  date: string;
  generatedAt: string;
  topics: BriefingTopic[];
}

async function fetchTrendingTopics(): Promise<string[]> {
  try {
    const res = await fetch("https://trends.google.com/trending/rss?geo=US", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Snappymarketer/1.0)" },
      signal: AbortSignal.timeout(6000),
    });
    const xml = await res.text();
    const titles: string[] = [];
    const re = /<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([\s\S]*?)<\/title>/g;
    let m: RegExpExecArray | null;
    let skip = true;
    while ((m = re.exec(xml)) !== null) {
      if (skip) { skip = false; continue; } // skip channel title
      const t = (m[1] || m[2] || "").trim();
      if (t) titles.push(t);
      if (titles.length >= 20) break;
    }
    return titles;
  } catch {
    return [];
  }
}

async function fetchNewsForTopic(topic: string): Promise<string[]> {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(topic)}&hl=en-US&gl=US&ceid=US:en`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Snappymarketer/1.0)" },
      signal: AbortSignal.timeout(5000),
    });
    const text = await res.text();
    const headlines: string[] = [];
    const itemRe = /<item>[\s\S]*?<title>([\s\S]*?)<\/title>/g;
    let m: RegExpExecArray | null;
    while ((m = itemRe.exec(text)) !== null && headlines.length < 8) {
      const raw = m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, "$1").replace(/<[^>]+>/g, "").trim();
      if (raw) headlines.push(raw);
    }
    return headlines;
  } catch {
    return [];
  }
}

// Pick 3 diverse topics — prefer ones that look like substantive topics (not just person names)
function pickDiverseTopics(topics: string[]): string[] {
  const scored = topics.map(t => ({
    t,
    score: t.split(" ").length >= 2 ? 1 : 0, // multi-word topics preferred
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map(s => s.t);
}

export async function GET(req: NextRequest) {
  const now = new Date();
  const dateKey = now.toISOString().slice(0, 10);
  const hourBucket = Math.floor(now.getHours() / 6); // 4 buckets per day
  const cacheKey = `${dateKey}-${hourBucket}`;

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return Response.json(cached.data);
  }

  // 1. Get trending topics
  const allTopics = await fetchTrendingTopics();
  const picked = allTopics.length >= 3
    ? pickDiverseTopics(allTopics)
    : ["AI startups 2026", "real estate market", "health tech trends"];

  // 2. Fetch news for each in parallel
  const newsArrays = await Promise.all(picked.map(t => fetchNewsForTopic(t)));

  // 3. Build briefing context
  const topicsContext = picked.map((topic, i) => {
    const headlines = newsArrays[i].slice(0, 6);
    return `Topic ${i + 1}: "${topic}"\nRecent news headlines:\n${headlines.map(h => `- ${h}`).join("\n") || "- No specific headlines found"}`;
  }).join("\n\n");

  const dateStr = now.toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  // 4. Generate briefing with Claude
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    messages: [{
      role: "user",
      content: `Today is ${dateStr}. You are writing a daily trend briefing newsletter in the style of Exploding Topics. For each topic below, write a concise, engaging brief based on the real news headlines provided.

${topicsContext}

Return ONLY a JSON array (no markdown) with exactly 3 objects:
[
  {
    "name": "exact topic name",
    "category": "one of: Technology, Business, Health, Culture, Finance, Sports, Politics, Science",
    "summary": "3-4 sentences explaining what this topic/company/trend is and why it is surging right now. Be specific — mention real companies, people, numbers from the headlines. Write in a newsletter style: clear, punchy, informative.",
    "what_next": "3-4 sentences on where this trend is heading and what it means for the future. Reference the broader meta-trend. Be specific and forward-looking.",
    "related": ["2-3 related topics or companies also trending in this space"],
    "momentum": "exploding or rising or steady"
  }
]`
    }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "[]";
  try {
    const match = text.match(/\[[\s\S]*\]/);
    const topics: BriefingTopic[] = match ? JSON.parse(match[0]) : [];
    const result: BriefingResponse = {
      date: dateStr,
      generatedAt: now.toISOString(),
      topics: topics.slice(0, 3),
    };
    cache.set(cacheKey, { data: result, ts: Date.now() });
    return Response.json(result);
  } catch {
    return Response.json({ error: "Failed to generate briefing" }, { status: 500 });
  }
}
