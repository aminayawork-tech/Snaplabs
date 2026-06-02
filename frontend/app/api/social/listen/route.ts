import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 45;
export const dynamic = "force-dynamic";

type Platform = "reddit" | "hackernews" | "x" | "linkedin" | "tiktok" | "facebook";

interface HNHit {
  title?: string;
  author: string;
  points?: number;
  num_comments?: number;
  objectID: string;
  created_at: string;
}

async function fetchHackerNewsPosts(keyword: string) {
  try {
    const res = await fetch(
      `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(keyword)}&hitsPerPage=10&tags=story`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.hits ?? [])
      .filter((h: HNHit) => h.title)
      .slice(0, 10)
      .map((h: HNHit) => ({
        title: h.title!,
        author: h.author,
        score: h.points ?? 0,
        num_comments: h.num_comments ?? 0,
        url: `https://news.ycombinator.com/item?id=${h.objectID}`,
        created_utc: Math.floor(new Date(h.created_at).getTime() / 1000),
      }));
  } catch { return []; }
}

const PLATFORM_LABEL: Record<Platform, string> = {
  reddit:     "Reddit",
  hackernews: "HackerNews",
  x:          "X (Twitter)",
  linkedin:   "LinkedIn",
  tiktok:     "TikTok",
  facebook:   "Facebook",
};

const COMMUNITY_TYPE: Record<Platform, string> = {
  reddit:     "subreddit names without r/",
  hackernews: "HN topic areas",
  x:          "hashtags without #",
  linkedin:   "LinkedIn group names",
  tiktok:     "TikTok hashtags without #",
  facebook:   "Facebook group names",
};

const VALID_PLATFORMS = new Set<Platform>(["reddit", "hackernews", "x", "linkedin", "tiktok", "facebook"]);

export async function POST(req: NextRequest) {
  const { keyword, platform: rawPlatform } = await req.json();
  if (!keyword) return Response.json({ error: "Keyword required" }, { status: 400 });

  const platform: Platform = VALID_PLATFORMS.has(rawPlatform) ? rawPlatform : "reddit";
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });

  try {
    // Fetch real posts for HackerNews only
    let realPosts: Awaited<ReturnType<typeof fetchHackerNewsPosts>> = [];
    if (platform === "hackernews") {
      realPosts = await fetchHackerNewsPosts(keyword);
    }

    const hasReal = realPosts.length > 0;
    const postSnippet = hasReal
      ? `Top posts: ${realPosts.slice(0, 5).map(p => `"${p.title}"`).join("; ")}.`
      : "";

    // Ultra-lean prompt — keeps total response under 200 tokens for fast Haiku reply
    const prompt = `Give social media insights for "${keyword}" on ${PLATFORM_LABEL[platform]}. ${postSnippet}
Respond with ONLY this JSON, using real ${COMMUNITY_TYPE[platform]} for communities:
{"overall":"positive","summary":"Two sentences about sentiment and discussion.","themes":["t1","t2","t3","t4"],"opportunities":["o1","o2","o3"],"communities":["c1","c2","c3","c4"],"positive_pct":35,"neutral_pct":45,"negative_pct":20}`;

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 220,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    const match = text.match(/\{[\s\S]*\}/);
    const ai = match ? JSON.parse(match[0]) : {};

    const overall = (["positive", "neutral", "negative"].includes(ai.overall) ? ai.overall : "neutral") as "positive" | "neutral" | "negative";

    return Response.json({
      posts: realPosts.map(p => ({
        title: p.title,
        subreddit: p.author,
        score: p.score,
        num_comments: p.num_comments,
        url: p.url,
        created_utc: p.created_utc,
        sentiment: "neutral" as const,
        key_insight: "",
      })),
      sentiment_summary: {
        positive: ai.positive_pct ?? 35,
        neutral:  ai.neutral_pct  ?? 45,
        negative: ai.negative_pct ?? 20,
        overall,
        summary: ai.summary ?? "No summary available.",
      },
      top_communities: ai.communities ?? [],
      key_themes:      ai.themes       ?? [],
      opportunities:   ai.opportunities ?? [],
      data_source: hasReal ? platform : "ai",
      platform,
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
