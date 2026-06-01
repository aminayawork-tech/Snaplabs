import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "edge";

type Platform = "reddit" | "hackernews" | "x" | "linkedin" | "tiktok" | "facebook";

interface PostData {
  title: string;
  subreddit: string;
  score: number;
  num_comments: number;
  permalink: string;
  created_utc: number;
}

async function fetchHackerNewsPosts(keyword: string): Promise<PostData[]> {
  try {
    const res = await fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(keyword)}&hitsPerPage=20&tags=story`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.hits ?? [])
      .filter((h: { title?: string }) => h.title)
      .slice(0, 20)
      .map((h: { title: string; author: string; points?: number; num_comments?: number; objectID: string; created_at: string }) => ({
        title: h.title,
        subreddit: h.author,
        score: h.points ?? 0,
        num_comments: h.num_comments ?? 0,
        permalink: `/item?id=${h.objectID}`,
        created_utc: Math.floor(new Date(h.created_at).getTime() / 1000),
      }));
  } catch { return []; }
}

// Placeholder: add real API fetch functions here when credentials are available
// async function fetchLinkedInPosts(keyword: string): Promise<PostData[]> { ... }
// async function fetchTikTokPosts(keyword: string): Promise<PostData[]> { ... }
// async function fetchFacebookPosts(keyword: string): Promise<PostData[]> { ... }

const PLATFORM_LABEL: Record<Platform, string> = {
  reddit:     "Reddit — subreddits, discussions, AMAs",
  hackernews: "HackerNews tech/startup community",
  x:          "X (Twitter) — tweets, threads, viral content",
  linkedin:   "LinkedIn — professional posts and B2B discussions",
  tiktok:     "TikTok — short-form video trends and creator content",
  facebook:   "Facebook — Groups, Pages, community discussions",
};

const COMMUNITY_TYPE: Record<Platform, string> = {
  reddit:     "subreddits (no r/ prefix)",
  hackernews: "HN topic areas",
  x:          "hashtags (no # prefix)",
  linkedin:   "LinkedIn Groups or professional communities",
  tiktok:     "TikTok hashtags (no # prefix)",
  facebook:   "Facebook Groups or Pages",
};

const POST_URL_BASE: Partial<Record<Platform, string>> = {
  hackernews: "https://news.ycombinator.com",
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

    // HackerNews: real data via free Algolia API (no key needed)
    if (platform === "hackernews") {
      posts = await fetchHackerNewsPosts(keyword);
      hasRealData = posts.length > 0;
    }
    // Reddit + X: AI-powered (Reddit closed new API access; X is $100/mo)
    // LinkedIn / TikTok / Facebook: AI-powered until real API credentials are added

    const platformLabel = PLATFORM_LABEL[platform];
    const communityType = COMMUNITY_TYPE[platform];
    const postContext = hasRealData
      ? posts.map((p, i) => `[${i}] ${p.subreddit} | "${p.title}" | score:${p.score}`).join("\n")
      : `Generate realistic insights for "${keyword}" on ${platformLabel}.`;

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [{
        role: "user",
        content: `Analyze ${hasRealData ? "these posts" : "typical conversations"} about "${keyword}" on ${platformLabel}. ${postContext}

Return ONLY this JSON. Use 3-4 items per array. top_communities must be real ${communityType}:
{"posts":[{"index":0,"sentiment":"positive","key_insight":"brief"}],"sentiment_summary":{"positive":8,"neutral":10,"negative":7,"overall":"positive","summary":"2 sentences"},"key_themes":["t1","t2","t3"],"opportunities":["o1","o2","o3"],"top_communities":["c1","c2","c3","c4"]}`,
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

    const postUrlBase = POST_URL_BASE[platform] ?? "";
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

    return Response.json({
      posts: enrichedPosts,
      sentiment_summary: analysis.sentiment_summary ?? { positive: 0, neutral: 0, negative: 0, overall: "neutral", summary: "Unable to analyze." },
      top_communities: analysis.top_communities ?? [],
      key_themes: analysis.key_themes ?? [],
      opportunities: analysis.opportunities ?? [],
      data_source: hasRealData ? platform : "ai",
      platform,
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
