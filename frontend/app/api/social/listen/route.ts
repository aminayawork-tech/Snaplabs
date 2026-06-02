import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 45;
export const dynamic = "force-dynamic";

type Platform = "reddit" | "hackernews" | "x" | "linkedin" | "tiktok" | "facebook";

async function fetchHN(keyword: string) {
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
      title: h.title as string,
      author: h.author as string,
      score: (h.points ?? 0) as number,
      num_comments: (h.num_comments ?? 0) as number,
      url: `https://news.ycombinator.com/item?id=${h.objectID}`,
      created_utc: Math.floor(new Date(h.created_at).getTime() / 1000),
    }));
  } catch { return []; }
}

const PLATFORM_LABEL: Record<Platform, string> = {
  reddit: "Reddit", hackernews: "HackerNews", x: "X (Twitter)",
  linkedin: "LinkedIn", tiktok: "TikTok", facebook: "Facebook",
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

  try {
    const realPosts = platform === "hackernews" ? await fetchHN(keyword) : [];
    const hasReal = realPosts.length > 0;

    const postCtx = hasReal
      ? `Recent posts: ${realPosts.slice(0, 5).map(p => `"${p.title}"`).join("; ")}.`
      : "";

    const prompt = `Social insights for "${keyword}" on ${PLATFORM_LABEL[platform]}. ${postCtx}
Reply with ONLY this JSON. Use real ${COMMUNITY_TYPE[platform]} for "communities":
{"overall":"neutral","summary":"2 sentences.","themes":["a","b","c","d"],"opportunities":["x","y","z"],"communities":["c1","c2","c3","c4"],"pos":30,"neu":50,"neg":20}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 250,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    const match = text.match(/\{[\s\S]*\}/);
    const ai = match ? JSON.parse(match[0]) : {};

    const overall = (["positive","neutral","negative"].includes(ai.overall) ? ai.overall : "neutral") as "positive"|"neutral"|"negative";

    return Response.json({
      posts: realPosts.map(p => ({
        title: p.title, subreddit: p.author, score: p.score,
        num_comments: p.num_comments, url: p.url, created_utc: p.created_utc,
        sentiment: "neutral" as const, key_insight: "",
      })),
      sentiment_summary: {
        positive: ai.pos ?? 30, neutral: ai.neu ?? 50, negative: ai.neg ?? 20,
        overall, summary: ai.summary ?? "No summary available.",
      },
      top_communities: ai.communities ?? [],
      key_themes: ai.themes ?? [],
      opportunities: ai.opportunities ?? [],
      data_source: hasReal ? platform : "ai",
      platform,
    });
  } catch (e) {
    console.error("[social/listen]", String(e));
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
