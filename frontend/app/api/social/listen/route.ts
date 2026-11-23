import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  fetchReddit, fetchYouTube, fetchBluesky, fetchHackerNews,
  fetchSearchQuestions, fetchNewsHeadlines, broaderTopic, fetchTikTok, fetchFacebook, fetchTwitter, topHashtags, type SourcePost,
} from "@/lib/socialSources";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

type Platform = "reddit" | "youtube" | "bluesky" | "hackernews" | "x" | "tiktok" | "facebook";
type Sentiment = "positive" | "neutral" | "negative";

const LABEL: Record<Platform, string> = {
  reddit: "Reddit", youtube: "YouTube", bluesky: "Bluesky", hackernews: "Hacker News",
  x: "X (Twitter)", tiktok: "TikTok", facebook: "Facebook",
};

const FETCHERS: Partial<Record<Platform, (k: string) => Promise<SourcePost[]>>> = {
  reddit: fetchReddit, youtube: fetchYouTube, bluesky: fetchBluesky, hackernews: fetchHackerNews, tiktok: fetchTikTok,
  facebook: fetchFacebook, x: fetchTwitter,
};

const COMMUNITY_KIND: Record<Platform, string> = {
  reddit: "subreddit names without r/", youtube: "YouTube channel names", bluesky: "Bluesky hashtags without # or feed topics",
  hackernews: "HN topic areas", x: "hashtags without #",
  tiktok: "TikTok hashtags without #", facebook: "Facebook group names",
};

function topCommunities(posts: SourcePost[], n = 6): string[] {
  const counts = new Map<string, number>();
  for (const p of posts) counts.set(p.community, (counts.get(p.community) ?? 0) + 1 + Math.log10(1 + p.num_comments));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([c]) => c);
}

function parseJSON(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)); } catch { return null; }
}

// Shields the paid APIs from repeat searches within a warm server instance.
const CACHE_TTL = 6 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; payload: unknown }>();

export async function POST(req: NextRequest) {
  const { keyword, platform: raw, fresh } = await req.json();
  if (!keyword) return Response.json({ error: "Keyword required" }, { status: 400 });
  const platform: Platform = raw in LABEL ? raw : "reddit";
  const fetcher = FETCHERS[platform];

  const cacheKey = `${platform}:${String(keyword).trim().toLowerCase()}`;
  const hit = cache.get(cacheKey);
  if (hit && !fresh && Date.now() - hit.at < CACHE_TTL) return Response.json(hit.payload);

  const gather = (kw: string) => Promise.all([
    fetcher ? fetcher(kw) : Promise.resolve([] as SourcePost[]),
    fetchSearchQuestions(kw),
    fetchNewsHeadlines(kw),
  ]);

  let topic: string = keyword;
  let [posts, questions, news] = await gather(keyword);
  if (fetcher ? posts.length < 3 : questions.length < 3) {
    const broader = await broaderTopic(keyword);
    if (broader) {
      const [p2, q2, n2] = await gather(broader);
      if (p2.length + q2.length > posts.length + questions.length) {
        topic = broader;
        [posts, questions, news] = [p2, q2, n2];
      }
    }
  }
  const live = posts.length > 0;
  const analysed = [...posts].sort((a, b) => (b.num_comments + b.score / 10) - (a.num_comments + a.score / 10)).slice(0, 20);

  const postBlock = analysed.map((p, i) => {
    const comments = p.comments.length ? `\n   Top replies: ${p.comments.map((c) => `"${c}"`).join(" | ")}` : "";
    return `[${i}] (${p.community}, ${p.score} ${platform === "youtube" || platform === "tiktok" ? "views" : "pts"}, ${p.num_comments} comments) ${p.title}${p.text && p.text !== p.title ? `\n   ${p.text}` : ""}${comments}`;
  }).join("\n");

  const prompt = `You are a social listening analyst. Topic: "${topic}". Platform: ${LABEL[platform]}.
${topic !== keyword ? `(The user searched "${keyword}", a brand or phrase too new or niche to have its own data. Analyze the broader "${topic}" conversation — what this audience needs, asks and complains about — and frame opportunities for "${keyword}".)\n` : ""}
${live
    ? `REAL ${LABEL[platform].toUpperCase()} POSTS (collected just now):\n${postBlock}`
    : `${LABEL[platform]} has no public data API, so there are no posts. Base your analysis on the real search and news signals below, and on what you know about how this audience talks on ${LABEL[platform]}. Be specific to "${topic}", never generic.`}

REAL GOOGLE SEARCHES people type about this topic:
${questions.join("; ") || "(none — rely on your knowledge of this audience)"}

LATEST NEWS HEADLINES:
${news.join("; ") || "(none)"}

Rules: be concrete and specific to this topic and these people. Never write about missing data, low visibility, or the absence of discussion — always describe what the audience actually wants, asks and struggles with. No generic marketing advice like "create educational content" or "engage with communities". Every opportunity and content idea must name the specific pain point, question or angle it targets.${live ? " Pain point quotes must be copied verbatim (shortened if needed) from the posts or replies above." : " Leave quote empty when you have no real source."}

Reply with ONLY this JSON:
{
  "summary": "3-4 sentences on what people are actually saying, what they want, and what frustrates them",
  "overall": "positive|neutral|negative",
  ${live ? `"post_sentiments": [{"i": 0, "s": "positive|neutral|negative", "insight": "what this post reveals, one line"}],` : `"pos": 0, "neu": 0, "neg": 0,`}
  "pain_points": [{"point": "specific frustration", "quote": "verbatim snippet or empty", "source": ${live ? "post index number or null" : "null"}}],
  "questions": ["real questions this audience asks (5-8)"],
  "themes": ["5-7 short specific themes"],
  "communities": ["4-6 real ${COMMUNITY_KIND[platform]} where this conversation happens"],
  "content_ideas": [{"title": "specific post/video title", "format": "e.g. Reddit post, short video, carousel", "why": "which pain point or question it answers"}],
  "opportunities": ["3-5 specific marketing moves"]
}${live ? `\nInclude a post_sentiments entry for every post index 0-${analysed.length - 1}.` : ""}`;

  let ai: Record<string, unknown> | null = null;
  let aiError = "";
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });
    const res = await anthropic.messages.create(
      { model: "claude-haiku-4-5-20251001", max_tokens: 3000, messages: [{ role: "user", content: prompt }] },
      { timeout: 40000 }
    );
    ai = parseJSON(res.content[0].type === "text" ? res.content[0].text : "");
    if (!ai) aiError = "AI analysis returned an unreadable response — try again.";
  } catch (e) {
    aiError = `AI analysis failed: ${e instanceof Error ? e.message : String(e)}`;
  }

  const sentiments = new Map<number, { s: Sentiment; insight: string }>();
  for (const ps of (ai?.post_sentiments as { i: number; s: Sentiment; insight: string }[] | undefined) ?? []) {
    if (["positive", "neutral", "negative"].includes(ps.s)) sentiments.set(Number(ps.i), { s: ps.s, insight: ps.insight ?? "" });
  }

  const outPosts = analysed.map((p, i) => ({
    title: p.title, text: p.text, community: p.community, author: p.author,
    score: p.score, num_comments: p.num_comments, url: p.url, created_utc: p.created_utc,
    sentiment: sentiments.get(i)?.s ?? ("neutral" as Sentiment),
    key_insight: sentiments.get(i)?.insight ?? "",
  }));

  const counts = live
    ? {
        positive: outPosts.filter((p) => p.sentiment === "positive").length,
        neutral: outPosts.filter((p) => p.sentiment === "neutral").length,
        negative: outPosts.filter((p) => p.sentiment === "negative").length,
      }
    : { positive: Number(ai?.pos ?? 0), neutral: Number(ai?.neu ?? 0), negative: Number(ai?.neg ?? 0) };
  const overall = (["positive", "neutral", "negative"].includes(ai?.overall as string) ? ai?.overall : "neutral") as Sentiment;

  const painPoints = ((ai?.pain_points as { point: string; quote?: string; source?: number | null }[] | undefined) ?? []).map((pp) => ({
    point: pp.point,
    quote: pp.quote ?? "",
    url: typeof pp.source === "number" ? outPosts[pp.source]?.url ?? null : null,
  }));

  const payload = {
    platform,
    topic,
    data_source: live ? "live" : "estimated",
    posts: outPosts,
    sentiment_summary: { ...counts, overall, summary: (ai?.summary as string) ?? "" },
    top_communities: live && (platform === "tiktok" || platform === "x") ? topHashtags(posts)
      : live && (platform === "reddit" || platform === "youtube" || platform === "facebook") ? topCommunities(posts) : ((ai?.communities as string[]) ?? []),
    key_themes: (ai?.themes as string[]) ?? [],
    pain_points: painPoints,
    questions: (ai?.questions as string[]) ?? [],
    content_ideas: (ai?.content_ideas as { title: string; format: string; why: string }[]) ?? [],
    opportunities: (ai?.opportunities as string[]) ?? [],
    search_questions: questions.slice(0, 12),
    ai_error: aiError || undefined,
    needs_key: !live && platform === "reddit" && !process.env.REDDIT_CLIENT_ID && !process.env.RAPIDAPI_KEY ? "RAPIDAPI_KEY (or REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET)"
      : !live && platform === "youtube" && !process.env.YOUTUBE_API_KEY ? "YOUTUBE_API_KEY"
      : !live && ["tiktok", "facebook", "x"].includes(platform) && !process.env.RAPIDAPI_KEY ? "RAPIDAPI_KEY" : undefined,
  };
  if (!aiError) cache.set(cacheKey, { at: Date.now(), payload });
  return Response.json(payload);
}
