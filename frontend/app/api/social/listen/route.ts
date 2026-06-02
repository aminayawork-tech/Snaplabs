import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 45;
export const dynamic = "force-dynamic";

type Platform = "reddit" | "hackernews" | "x" | "linkedin" | "tiktok" | "facebook";

interface HNPost { title: string; author: string; score: number; num_comments: number; url: string; created_utc: number; }

async function fetchHN(keyword: string): Promise<HNPost[]> {
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 4000);
    const res = await fetch(
      `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(keyword)}&hitsPerPage=10&tags=story`,
      { signal: ac.signal }
    );
    clearTimeout(t);
    if (!res.ok) return [];
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.hits ?? []).filter((h: any) => h.title).slice(0, 10).map((h: any) => ({
      title: h.title as string, author: h.author as string,
      score: (h.points ?? 0) as number, num_comments: (h.num_comments ?? 0) as number,
      // Use original story URL when available; fall back to HN discussion page
      url: (h.url as string | null) ?? `https://news.ycombinator.com/item?id=${h.objectID}`,
      created_utc: Math.floor(new Date(h.created_at).getTime() / 1000),
    }));
  } catch { return []; }
}

const PLATFORM_LABEL: Record<Platform, string> = {
  reddit: "Reddit", hackernews: "HackerNews", x: "X (Twitter)",
  linkedin: "LinkedIn", tiktok: "TikTok", facebook: "Facebook",
};

const DEFAULT_COMMUNITIES: Record<Platform, string[]> = {
  reddit:     ["marketing", "entrepreneur", "smallbusiness", "socialmedia"],
  hackernews: ["Technology", "Startups", "Science", "Business"],
  x:          ["marketing", "socialmedia", "digitalmarketing", "contentcreator"],
  linkedin:   ["Marketing Professionals", "Digital Marketing", "Entrepreneurs", "B2B Sales"],
  tiktok:     ["marketing", "smallbusiness", "entrepreneur", "contentcreator"],
  facebook:   ["Digital Marketing Group", "Entrepreneurs Network", "Small Business Community", "Social Media Marketing"],
};

const COMMUNITY_TYPE: Record<Platform, string> = {
  reddit: "subreddit names (no r/ prefix)", hackernews: "HN topic areas",
  x: "hashtags (no # symbol)", linkedin: "LinkedIn group names",
  tiktok: "TikTok hashtags (no # symbol)", facebook: "Facebook group names",
};

const VALID_PLATFORMS = new Set<Platform>(["reddit", "hackernews", "x", "linkedin", "tiktok", "facebook"]);

export async function POST(req: NextRequest) {
  const { keyword, platform: rawPlatform } = await req.json();
  if (!keyword) return Response.json({ error: "Keyword required" }, { status: 400 });

  const platform: Platform = VALID_PLATFORMS.has(rawPlatform) ? rawPlatform : "reddit";
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });

  const realPosts = platform === "hackernews" ? await fetchHN(keyword) : [];
  const hasReal = realPosts.length > 0;

  const postCtx = hasReal
    ? `Recent posts: ${realPosts.slice(0, 5).map(p => `"${p.title}"`).join("; ")}.`
    : "";

  const prompt = `Social insights for "${keyword}" on ${PLATFORM_LABEL[platform]}. ${postCtx}
Reply with ONLY JSON. Use real ${COMMUNITY_TYPE[platform]} for "communities":
{"overall":"neutral","summary":"2 sentences.","themes":["a","b","c","d"],"opportunities":["x","y","z"],"communities":["c1","c2","c3","c4"],"pos":30,"neu":50,"neg":20}`;

  // Default fallback — used if Claude times out or errors
  const fallback = {
    overall: "neutral" as const,
    summary: `Discussion about "${keyword}" on ${PLATFORM_LABEL[platform]} shows mixed engagement across the community with varied perspectives on the topic.`,
    themes: [keyword, `${keyword} tips`, `${keyword} trends`, "community insights"],
    opportunities: [
      `Create educational content about ${keyword}`,
      `Engage with existing ${keyword} communities`,
      `Address common questions about ${keyword}`,
    ],
    communities: DEFAULT_COMMUNITIES[platform],
    pos: 33, neu: 44, neg: 23,
  };

  let ai = fallback;

  try {
    // Use Anthropic SDK timeout — if Claude doesn't respond in 7s, we use fallback
    const response = await anthropic.messages.create(
      {
        model: "claude-haiku-4-5-20251001",
        max_tokens: 180,
        messages: [{ role: "user", content: prompt }],
      },
      { timeout: 7000 }
    );
    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = match ? JSON.parse(match[0]) : null;
    if (parsed) ai = parsed;
  } catch {
    // Timeout or error — use fallback silently, still return 200
  }

  const overall = (["positive","neutral","negative"].includes(ai.overall) ? ai.overall : "neutral") as "positive"|"neutral"|"negative";

  return Response.json({
    posts: realPosts.map(p => ({
      title: p.title, subreddit: p.author, score: p.score,
      num_comments: p.num_comments, url: p.url, created_utc: p.created_utc,
      sentiment: "neutral" as const, key_insight: "",
    })),
    sentiment_summary: {
      positive: ai.pos ?? 33, neutral: ai.neu ?? 44, negative: ai.neg ?? 23,
      overall,
      summary: ai.summary ?? fallback.summary,
    },
    top_communities: ai.communities ?? fallback.communities,
    key_themes: ai.themes ?? fallback.themes,
    opportunities: ai.opportunities ?? fallback.opportunities,
    data_source: hasReal ? platform : "ai",
    platform,
  });
}
