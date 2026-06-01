import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 45;
export const dynamic = "force-dynamic";

type Platform = "reddit" | "hackernews" | "x" | "linkedin" | "tiktok" | "facebook";

interface PostData {
  title: string;
  subreddit: string;
  score: number;
  num_comments: number;
  permalink: string;
  created_utc: number;
  selftext?: string;
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
  } catch { return null; }
}

async function fetchRedditPosts(keyword: string, token: string): Promise<PostData[]> {
  const base = `https://oauth.reddit.com/search?q=${encodeURIComponent(keyword)}&raw_json=1&limit=20`;
  const headers = { "Authorization": `Bearer ${token}`, "User-Agent": "web:snappymarketer:v1.0.0", "Accept": "application/json" };
  const [newRes, topRes] = await Promise.all([
    fetch(`${base}&sort=new`, { headers }),
    fetch(`${base}&sort=top&t=month`, { headers }),
  ]);
  const parse = async (r: Response) => {
    if (!r.ok) return [];
    const ct = r.headers.get("content-type") ?? "";
    if (!ct.includes("json")) return [];
    const d = await r.json().catch(() => null);
    return ((d?.data?.children ?? []) as { data: PostData }[]).map(c => c.data);
  };
  const [a, b] = await Promise.all([parse(newRes), parse(topRes)]);
  return [...a, ...b].filter((p, i, arr) => arr.findIndex(x => x.permalink === p.permalink) === i)
    .filter(p => p.title && p.subreddit).slice(0, 20);
}

async function fetchHackerNewsPosts(keyword: string): Promise<PostData[]> {
  try {
    const res = await fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(keyword)}&hitsPerPage=20&tags=story`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.hits ?? []).filter((h: { title?: string }) => h.title).slice(0, 20).map((h: { title: string; author: string; points?: number; num_comments?: number; objectID: string; created_at: string; story_text?: string }) => ({
      title: h.title, subreddit: h.author, score: h.points ?? 0,
      num_comments: h.num_comments ?? 0, permalink: `/item?id=${h.objectID}`,
      created_utc: Math.floor(new Date(h.created_at).getTime() / 1000), selftext: h.story_text ?? "",
    }));
  } catch { return []; }
}

const PLATFORM_LABEL: Record<Platform, string> = {
  reddit: "Reddit discussions",
  hackernews: "HackerNews tech/startup community",
  x: "X (Twitter) — tweets, threads, viral content",
  linkedin: "LinkedIn — professional posts and B2B discussions",
  tiktok: "TikTok — short-form video trends and creator content",
  facebook: "Facebook — Groups, Pages, community discussions",
};

const COMMUNITY_TYPE: Record<Platform, string> = {
  reddit: "subreddits (no r/ prefix)",
  hackernews: "HN topic areas",
  x: "hashtags (no # prefix)",
  linkedin: "LinkedIn Groups or professional communities",
  tiktok: "TikTok hashtags (no # prefix)",
  facebook: "Facebook Groups or Pages",
};

const VALID_PLATFORMS = new Set<Platform>(["reddit", "hackernews", "x", "linkedin", "tiktok", "facebook"]);

export async function POST(req: NextRequest) {
  const { keyword, platform: rawPlatform } = await req.json();
  if (!keyword) return Response.json({ error: "Keyword required" }, { status: 400 });

  const platform: Platform = VALID_PLATFORMS.has(rawPlatform) ? rawPlatform : "reddit";
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });

  try {
    let posts: PostData[] = [];
    let hasRealData = false;
    let postUrlBase = "";

    if (platform === "reddit") {
      const token = await getRedditToken();
      if (token) { posts = await fetchRedditPosts(keyword, token); hasRealData = posts.length > 0; postUrlBase = "https://reddit.com"; }
    } else if (platform === "hackernews") {
      posts = await fetchHackerNewsPosts(keyword); hasRealData = posts.length > 0; postUrlBase = "https://news.ycombinator.com";
    }

    const platformLabel = PLATFORM_LABEL[platform];
    const communityType = COMMUNITY_TYPE[platform];
    const postContext = hasRealData
      ? posts.map((p, i) => `[${i}] ${p.subreddit} | "${p.title}" | score:${p.score}`).join("\n")
      : `Generate realistic insights based on knowledge of how people discuss "${keyword}" on ${platformLabel}.`;

    // Lean prompt — no content_discovery here, keeping response fast
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [{
        role: "user",
        content: `Analyze ${hasRealData ? "these posts" : "conversations"} about "${keyword}" on ${platformLabel}. ${postContext}

Return ONLY this JSON (no extras). Use 3-4 items per array. For top_communities use real ${communityType}:
{"posts":[{"index":0,"sentiment":"positive","key_insight":"brief"}],"sentiment_summary":{"positive":8,"neutral":10,"negative":7,"overall":"positive","summary":"2 sentences max"},"key_themes":["t1","t2","t3"],"opportunities":["o1","o2","o3"],"top_communities":["c1","c2","c3","c4"]}`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    const match = text.match(/\{[\s\S]*\}/);
    const analysis = match ? JSON.parse(match[0]) : {};

    const sentimentMap: Record<number, string> = {};
    const insightMap: Record<number, string> = {};
    for (const p of (analysis.posts ?? [])) { sentimentMap[p.index] = p.sentiment; insightMap[p.index] = p.key_insight; }

    const enrichedPosts = posts.map((p, i) => ({
      title: p.title, subreddit: p.subreddit, score: p.score, num_comments: p.num_comments,
      url: `${postUrlBase}${p.permalink}`, created_utc: p.created_utc,
      sentiment: (sentimentMap[i] ?? "neutral") as "positive" | "neutral" | "negative",
      key_insight: insightMap[i] ?? "",
    }));

    let top_communities: string[] = analysis.top_communities ?? [];
    if (platform === "reddit" && hasRealData) {
      const counts: Record<string, number> = {};
      for (const p of posts) counts[p.subreddit] = (counts[p.subreddit] ?? 0) + 1;
      top_communities = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([s]) => s);
    }

    return Response.json({
      posts: enrichedPosts,
      sentiment_summary: analysis.sentiment_summary ?? { positive: 0, neutral: 0, negative: 0, overall: "neutral", summary: "Unable to analyze." },
      top_communities,
      key_themes: analysis.key_themes ?? [],
      opportunities: analysis.opportunities ?? [],
      data_source: hasRealData ? platform : "ai",
      platform,
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
