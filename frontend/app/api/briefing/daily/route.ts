import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

const client = new Anthropic();

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

// Category seeds — business/consumer trend verticals only, no sports/politics/celebrity
const CATEGORY_SEEDS = [
  { name: "Food & Beverage",        query: "food technology innovation restaurant trend" },
  { name: "Technology & AI",        query: "AI tool startup trend 2026" },
  { name: "Health & Wellness",      query: "health wellness biohacking supplement trend" },
  { name: "Sustainability",         query: "sustainable eco product clean energy startup" },
  { name: "Finance & Investing",    query: "fintech personal finance investment trend" },
  { name: "Beauty & Skincare",      query: "beauty skincare ingredient brand innovation" },
  { name: "E-commerce & Retail",    query: "ecommerce retail consumer product trend" },
  { name: "Creator Economy",        query: "creator economy content monetization social media" },
  { name: "Mental Health",          query: "mental health app therapy wellness innovation" },
  { name: "Real Estate",            query: "real estate proptech housing market trend" },
  { name: "Automotive & Mobility",  query: "EV autonomous vehicle mobility startup trend" },
  { name: "Travel & Hospitality",   query: "travel hospitality tourism trend 2026" },
  { name: "Business & Startup",     query: "startup business opportunity emerging niche" },
  { name: "Crypto & Web3",          query: "crypto blockchain web3 DeFi trend 2026" },
];

// Pick 6 categories deterministically based on day-of-year so the selection rotates daily
function pickCategories(dayOfYear: number): typeof CATEGORY_SEEDS {
  const shuffled = [...CATEGORY_SEEDS];
  // Rotate starting index by day so different categories surface each day
  const start = dayOfYear % shuffled.length;
  const rotated = [...shuffled.slice(start), ...shuffled.slice(0, start)];
  return rotated.slice(0, 6);
}

async function fetchAutocomplete(query: string): Promise<string[]> {
  try {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}&hl=en&gl=us`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Snappymarketer/1.0)" },
      signal: AbortSignal.timeout(4000),
    });
    const data = await res.json();
    return Array.isArray(data[1]) ? (data[1] as string[]).slice(0, 6) : [];
  } catch {
    return [];
  }
}

async function fetchNews(query: string): Promise<string[]> {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Snappymarketer/1.0)" },
      signal: AbortSignal.timeout(5000),
    });
    const text = await res.text();
    const headlines: string[] = [];
    const re = /<item>[\s\S]*?<title>([\s\S]*?)<\/title>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null && headlines.length < 6) {
      const raw = m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, "$1").replace(/<[^>]+>/g, "").trim();
      if (raw) headlines.push(raw);
    }
    return headlines;
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const now = new Date();
  const cacheKey = now.toISOString().slice(0, 10); // one result per calendar day

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return Response.json(cached.data);
  }

  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  const categories = pickCategories(dayOfYear);

  // Fetch autocomplete + news for each category in parallel
  const signals = await Promise.all(
    categories.map(async (cat) => {
      const [autocomplete, news] = await Promise.all([
        fetchAutocomplete(cat.query),
        fetchNews(cat.query),
      ]);
      return { cat, autocomplete, news };
    })
  );

  // Build context block for Claude
  const contextBlock = signals.map(({ cat, autocomplete, news }) => {
    const ac = autocomplete.length > 0 ? `Google searches: ${autocomplete.join(" | ")}` : "";
    const nl = news.length > 0 ? `News: ${news.slice(0, 4).join(" | ")}` : "";
    return `[${cat.name}]\n${ac}\n${nl}`.trim();
  }).join("\n\n");

  const dateStr = now.toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    messages: [{
      role: "user",
      content: `Today is ${dateStr}. You are the editor of a daily business trend newsletter, similar to Exploding Topics.

Below is real-time Google search + news data from 6 different industry categories. Your job is to:
1. Identify the single most interesting genuinely RISING business or consumer trend from each category
2. Choose the 3 best trends across 3 DIFFERENT categories — prioritize innovation, emerging technology, and business opportunity
3. DO NOT pick sports scores, celebrity gossip, political news, or one-day news events — only pick structural, growing business/consumer trends

Category data:
${contextBlock}

Write a concise Exploding Topics-style brief for each of the 3 chosen trends. Return ONLY a JSON array (no markdown, no extra text):
[
  {
    "name": "The specific trend or product name (e.g. 'Robotic Kitchen Automation', 'AI Skincare Diagnostics')",
    "category": "The category name from above",
    "summary": "3-4 sentences: what is this trend, which companies or products are driving it, specific numbers or facts that show it is growing. Newsletter style — punchy, specific, informative. No generic phrases.",
    "what_next": "3-4 sentences on the broader meta-trend this is part of and where it is heading. Name specific companies, markets, or dynamics. Be forward-looking and specific.",
    "related": ["2-3 closely related trends or companies also growing in this space"],
    "momentum": "exploding or rising or steady — based on how fast the trend is accelerating"
  }
]`,
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
