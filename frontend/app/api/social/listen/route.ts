import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 45;
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
  };
}

async function getRedditToken(): Promise<string | null> {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  try {
    const res = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "web:snappymarketer:v1.0.0",
      },
      body: "grant_type=client_credentials",
    });
    if (!res.ok) return null;
    const d = await res.json();
    return d.access_token ?? null;
  } catch {
    return null;
  }
}

async function fetchRedditPosts(keyword: string, token: string): Promise<RedditPost["data"][]> {
  const base = `https://oauth.reddit.com/search?q=${encodeURIComponent(keyword)}&raw_json=1&limit=25`;
  const headers = {
    "Authorization": `Bearer ${token}`,
    "User-Agent": "web:snappymarketer:v1.0.0",
    "Accept": "application/json",
  };

  const [newRes, topRes] = await Promise.all([
    fetch(`${base}&sort=new`, { headers }),
    fetch(`${base}&sort=top&t=month`, { headers }),
  ]);

  const parse = async (r: Response) => {
    if (!r.ok) return [];
    const ct = r.headers.get("content-type") ?? "";
    if (!ct.includes("json")) return [];
    const d = await r.json().catch(() => null);
    return ((d?.data?.children ?? []) as RedditPost[]).map(c => c.data);
  };

  const [newPosts, topPosts] = await Promise.all([parse(newRes), parse(topRes)]);
  return [...newPosts, ...topPosts]
    .filter((p, i, a) => a.findIndex(x => x.permalink === p.permalink) === i)
    .filter(p => p.title && p.subreddit)
    .slice(0, 25);
}

async function generateAIInsights(keyword: string, anthropic: Anthropic, posts: RedditPost["data"][], hasRealData: boolean) {
  const postContext = hasRealData
    ? posts.map((p, i) => `[${i}] r/${p.subreddit} | "${p.title}" | score:${p.score} | ${(p.selftext ?? "").slice(0, 150)}`).join("\n")
    : `No real-time Reddit data available. Generate realistic insights based on your knowledge of how people discuss "${keyword}" online.`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2000,
    messages: [{
      role: "user",
      content: `You are a social media analyst. ${hasRealData ? "Analyze these Reddit posts" : "Based on your knowledge of online discussions"} about "${keyword}" for a marketer.

${postContext}

Return ONLY valid JSON (no markdown fences):
{
  "posts": [{"index": 0, "sentiment": "positive|neutral|negative", "key_insight": "one-sentence marketer takeaway"}],
  "sentiment_summary": {
    "positive": 8, "neutral": 10, "negative": 7,
    "overall": "positive|neutral|negative",
    "summary": "2-3 sentences on how people feel about this topic online"
  },
  "key_themes": ["theme 1", "theme 2", "theme 3", "theme 4", "theme 5"],
  "opportunities": ["marketing opportunity 1", "opportunity 2", "opportunity 3"],
  "content_discovery": {
    "top_formats": ["Blog posts", "YouTube tutorials", "Short-form video", "Newsletters"],
    "best_angles": ["How-to / educational", "Comparison / vs", "Personal story", "Data-driven"],
    "platform_activity": [
      {"platform": "YouTube", "level": "high", "what_works": "tutorial and explainer videos"},
      {"platform": "Reddit", "level": "high", "what_works": "discussion threads, personal experience posts"},
      {"platform": "TikTok", "level": "medium", "what_works": "quick tips and transformation content"},
      {"platform": "LinkedIn", "level": "low", "what_works": "professional takes and case studies"}
    ],
    "trending_topics": ["trending topic 1", "trending topic 2", "trending topic 3"],
    "content_gaps": ["underserved angle 1", "underserved angle 2", "underserved angle 3"]
  }
}`,
    }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "{}";
  const match = text.match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : {};
}

export async function POST(req: NextRequest) {
  const { keyword } = await req.json();
  if (!keyword) return Response.json({ error: "Keyword required" }, { status: 400 });

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });

  try {
    // Try Reddit OAuth, fall back to Claude-only if unavailable
    const token = await getRedditToken();
    let posts: RedditPost["data"][] = [];
    let hasRealData = false;

    if (token) {
      posts = await fetchRedditPosts(keyword, token);
      hasRealData = posts.length > 0;
    }

    const analysis = await generateAIInsights(keyword, anthropic, posts, hasRealData);

    const sentimentMap: Record<number, string> = {};
    const insightMap: Record<number, string> = {};
    for (const p of (analysis.posts ?? [])) {
      sentimentMap[p.index] = p.sentiment;
      insightMap[p.index] = p.key_insight;
    }

    const enrichedPosts = posts.map((p, i) => ({
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
    for (const p of posts) subredditCounts[p.subreddit] = (subredditCounts[p.subreddit] ?? 0) + 1;
    const top_subreddits = Object.entries(subredditCounts)
      .sort((a, b) => b[1] - a[1]).slice(0, 6).map(([s]) => s);

    return Response.json({
      posts: enrichedPosts,
      sentiment_summary: analysis.sentiment_summary ?? {
        positive: 0, neutral: 0, negative: 0, overall: "neutral",
        summary: "Unable to analyze sentiment at this time.",
      },
      top_subreddits,
      key_themes: analysis.key_themes ?? [],
      opportunities: analysis.opportunities ?? [],
      content_discovery: analysis.content_discovery ?? null,
      data_source: hasRealData ? "reddit" : "ai",
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
