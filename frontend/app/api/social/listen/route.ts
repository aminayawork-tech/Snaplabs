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

interface HNHit {
  title: string;
  points: number;
  num_comments: number;
  objectID: string;
  author: string;
  created_at: string;
  story_text?: string;
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

async function fetchRedditPosts(keyword: string, token: string): Promise<PostData[]> {
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
    return ((d?.data?.children ?? []) as { data: PostData }[]).map(c => c.data);
  };
  const [newPosts, topPosts] = await Promise.all([parse(newRes), parse(topRes)]);
  return [...newPosts, ...topPosts]
    .filter((p, i, a) => a.findIndex(x => x.permalink === p.permalink) === i)
    .filter(p => p.title && p.subreddit)
    .slice(0, 25);
}

async function fetchHackerNewsPosts(keyword: string): Promise<PostData[]> {
  try {
    const res = await fetch(
      `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(keyword)}&hitsPerPage=25&tags=story`
    );
    if (!res.ok) return [];
    const data = await res.json();
    const hits: HNHit[] = data.hits ?? [];
    return hits
      .filter(h => h.title)
      .slice(0, 25)
      .map(h => ({
        title: h.title,
        subreddit: h.author,
        score: h.points ?? 0,
        num_comments: h.num_comments ?? 0,
        permalink: `/item?id=${h.objectID}`,
        created_utc: Math.floor(new Date(h.created_at).getTime() / 1000),
        selftext: h.story_text ?? "",
      }));
  } catch {
    return [];
  }
}

const PLATFORM_LABEL: Record<Platform, string> = {
  reddit: "Reddit — discussions, posts, and comments",
  hackernews: "HackerNews — tech/startup community stories and comments",
  x: "X (Twitter) — tweets, threads, viral content, and hashtag conversations",
  linkedin: "LinkedIn — professional posts, thought leadership, and B2B discussions",
  tiktok: "TikTok — short-form video trends, creator content, and viral sounds",
  facebook: "Facebook — Groups, Pages, and community discussions",
};

const COMMUNITY_TYPE: Record<Platform, string> = {
  reddit: "subreddits (no r/ prefix) — 5-6 most active ones for this topic",
  hackernews: "relevant HN tags or topic areas",
  x: "hashtags (no # prefix) — top 5-6 most used for this topic",
  linkedin: "LinkedIn Groups or professional communities relevant to this topic",
  tiktok: "TikTok hashtags (no # prefix) — top 5-6 trending for this topic",
  facebook: "Facebook Groups or Pages most active around this topic",
};

async function generateAIInsights(
  keyword: string,
  anthropic: Anthropic,
  posts: PostData[],
  hasRealData: boolean,
  platform: Platform
) {
  const platformLabel = PLATFORM_LABEL[platform];
  const communityType = COMMUNITY_TYPE[platform];
  const postContext = hasRealData
    ? posts.map((p, i) => `[${i}] ${p.subreddit} | "${p.title}" | score:${p.score} | ${(p.selftext ?? "").slice(0, 150)}`).join("\n")
    : `No real-time data. Generate realistic insights based on your knowledge of how people discuss "${keyword}" on ${platformLabel}.`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1200,
    messages: [{
      role: "user",
      content: `You are a social media analyst. Analyze ${hasRealData ? "these posts" : "typical conversations"} about "${keyword}" on ${platformLabel} for a marketer.

${postContext}

For the "top_communities" field, provide 5-6 real ${communityType}.

Return ONLY valid JSON (no markdown fences, no comments inside the JSON):
{
  "posts": [{"index": 0, "sentiment": "positive|neutral|negative", "key_insight": "one-sentence marketer takeaway"}],
  "sentiment_summary": {
    "positive": 8, "neutral": 10, "negative": 7,
    "overall": "positive|neutral|negative",
    "summary": "2-3 sentences on how people feel about this topic on ${platformLabel}"
  },
  "key_themes": ["theme 1", "theme 2", "theme 3", "theme 4", "theme 5"],
  "opportunities": ["marketing opportunity 1", "opportunity 2", "opportunity 3"],
  "top_communities": ["name1", "name2", "name3", "name4", "name5"],
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
      if (token) {
        posts = await fetchRedditPosts(keyword, token);
        hasRealData = posts.length > 0;
        postUrlBase = "https://reddit.com";
      }
    } else if (platform === "hackernews") {
      posts = await fetchHackerNewsPosts(keyword);
      hasRealData = posts.length > 0;
      postUrlBase = "https://news.ycombinator.com";
    }

    const analysis = await generateAIInsights(keyword, anthropic, posts, hasRealData, platform);

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
      url: `${postUrlBase}${p.permalink}`,
      created_utc: p.created_utc,
      sentiment: (sentimentMap[i] ?? "neutral") as "positive" | "neutral" | "negative",
      key_insight: insightMap[i] ?? "",
    }));

    // For Reddit with real data: compute from actual subreddits; otherwise use Claude's output
    let top_communities: string[] = analysis.top_communities ?? [];
    if (platform === "reddit" && hasRealData) {
      const counts: Record<string, number> = {};
      for (const p of posts) counts[p.subreddit] = (counts[p.subreddit] ?? 0) + 1;
      top_communities = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([s]) => s);
    }

    return Response.json({
      posts: enrichedPosts,
      sentiment_summary: analysis.sentiment_summary ?? {
        positive: 0, neutral: 0, negative: 0, overall: "neutral",
        summary: "Unable to analyze sentiment at this time.",
      },
      top_communities,
      key_themes: analysis.key_themes ?? [],
      opportunities: analysis.opportunities ?? [],
      content_discovery: analysis.content_discovery ?? null,
      data_source: hasRealData ? platform : "ai",
      platform,
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
