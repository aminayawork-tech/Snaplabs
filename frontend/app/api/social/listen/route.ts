import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

interface RedditPost {
  data: {
    title: string;
    subreddit: string;
    score: number;
    num_comments: number;
    permalink: string;
    created_utc: number;
    selftext?: string;
    url: string;
  };
}

const REDDIT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; SnappyMarketer/1.0; market research tool)",
  "Accept": "application/json",
  "Accept-Language": "en-US,en;q=0.9",
};

async function redditFetch(url: string): Promise<{ data?: { children?: RedditPost[] } } | null> {
  const res = await fetch(url, { headers: REDDIT_HEADERS, redirect: "follow" });
  if (!res.ok) return null;
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("json")) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const { keyword } = await req.json();
  if (!keyword) return Response.json({ error: "Keyword required" }, { status: 400 });

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });

  try {
    const base = `https://www.reddit.com/search.json?raw_json=1&q=${encodeURIComponent(keyword)}`;
    const newData = await redditFetch(`${base}&sort=new&limit=20&t=month`);
    await new Promise(r => setTimeout(r, 300));
    const topData = await redditFetch(`${base}&sort=top&t=month&limit=15`);

    const allPosts: RedditPost["data"][] = [
      ...(newData?.data?.children ?? []).map((c: RedditPost) => c.data),
      ...(topData?.data?.children ?? []).map((c: RedditPost) => c.data),
    ]
      .filter((p, i, a) => a.findIndex(x => x.permalink === p.permalink) === i)
      .filter(p => p.title && p.subreddit)
      .slice(0, 25);

    if (!allPosts.length) {
      return Response.json({
        posts: [],
        sentiment_summary: { positive: 0, neutral: 0, negative: 0, overall: "neutral", summary: `No Reddit discussions found for "${keyword}". Try a broader term.` },
        top_subreddits: [],
        key_themes: [],
        opportunities: [],
      });
    }

    const postsSummary = allPosts
      .map((p, i) => `[${i}] r/${p.subreddit} | "${p.title}" | score:${p.score} | ${(p.selftext ?? "").slice(0, 150)}`)
      .join("\n");

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: `Analyze these Reddit posts about "${keyword}" for a marketer. Return ONLY valid JSON (no markdown fences).

POSTS:
${postsSummary}

Return this exact structure:
{
  "posts": [{"index": 0, "sentiment": "positive|neutral|negative", "key_insight": "one-sentence marketer takeaway"}],
  "sentiment_summary": {
    "positive": 8, "neutral": 10, "negative": 7,
    "overall": "neutral",
    "summary": "2-3 sentence overview of how people feel about this topic"
  },
  "key_themes": ["theme 1", "theme 2", "theme 3", "theme 4", "theme 5"],
  "opportunities": ["marketing opportunity 1", "opportunity 2", "opportunity 3"]
}`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    const match = text.match(/\{[\s\S]*\}/);
    const analysis = match ? JSON.parse(match[0]) : {};

    const sentimentMap: Record<number, string> = {};
    const insightMap: Record<number, string> = {};
    for (const p of (analysis.posts ?? [])) {
      sentimentMap[p.index] = p.sentiment;
      insightMap[p.index] = p.key_insight;
    }

    const enrichedPosts = allPosts.map((p, i) => ({
      title: p.title,
      subreddit: p.subreddit,
      score: p.score,
      num_comments: p.num_comments,
      url: `https://reddit.com${p.permalink}`,
      created_utc: p.created_utc,
      sentiment: (sentimentMap[i] ?? "neutral") as "positive" | "neutral" | "negative",
      key_insight: insightMap[i] ?? "",
    }));

    const subredditCounts: Record<string, number> = {};
    for (const p of allPosts) subredditCounts[p.subreddit] = (subredditCounts[p.subreddit] ?? 0) + 1;
    const top_subreddits = Object.entries(subredditCounts)
      .sort((a, b) => b[1] - a[1]).slice(0, 6).map(([s]) => s);

    return Response.json({
      posts: enrichedPosts,
      sentiment_summary: analysis.sentiment_summary ?? { positive: 0, neutral: allPosts.length, negative: 0, overall: "neutral", summary: "" },
      top_subreddits,
      key_themes: analysis.key_themes ?? [],
      opportunities: analysis.opportunities ?? [],
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
