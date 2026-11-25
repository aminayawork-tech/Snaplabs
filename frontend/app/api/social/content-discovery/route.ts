import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { fetchYouTube, fetchTikTok, fetchBluesky, fetchHackerNews, fetchSearchQuestions, fetchNewsHeadlines, broaderTopic, type SourcePost } from "@/lib/socialSources";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const fmtNum = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : `${n}`);

const CACHE_TTL = 6 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; payload: unknown }>();

export async function POST(req: NextRequest) {
  const started = Date.now();
  const { keyword, fresh } = await req.json();
  if (!keyword) return Response.json({ error: "Keyword required" }, { status: 400 });
  const cacheKey = String(keyword).trim().toLowerCase();
  const hit = cache.get(cacheKey);
  if (hit && !fresh && Date.now() - hit.at < CACHE_TTL) return Response.json(hit.payload);

  const gather = (kw: string) => Promise.all([
    fetchYouTube(kw).catch(() => []), fetchBluesky(kw), fetchHackerNews(kw),
    fetchSearchQuestions(kw), fetchNewsHeadlines(kw), fetchTikTok(kw).catch(() => []),
  ]);
  let topic: string = keyword;
  let [youtube, bluesky, hn, questions, news, tiktok] = await gather(keyword);
  const signal = () => youtube.length + bluesky.length + hn.length + questions.length + tiktok.length;
  if (signal() < 6 && Date.now() - started < 22000) {
    const broader = await broaderTopic(keyword);
    if (broader) {
      const before = signal();
      const next = await gather(broader);
      if (next[0].length + next[1].length + next[2].length + next[3].length + next[5].length > before) {
        topic = broader;
        [youtube, bluesky, hn, questions, news, tiktok] = next;
      }
    }
  }

  const top = (posts: SourcePost[], n: number) => [...posts].sort((a, b) => b.score - a.score).slice(0, n);
  const topContent = [
    ...top(tiktok, 5).map((p) => ({ title: p.title, platform: "TikTok", url: p.url, metric: `${fmtNum(p.score)} views · ${p.community}` })),
    ...top(youtube, 6).map((p) => ({ title: p.title, platform: "YouTube", url: p.url, metric: `${fmtNum(p.score)} views · ${p.community}` })),
    ...top(bluesky, 3).map((p) => ({ title: p.title, platform: "Bluesky", url: p.url, metric: `${fmtNum(p.score)} likes+reposts` })),
    ...top(hn, 3).map((p) => ({ title: p.title, platform: "Hacker News", url: p.url, metric: `${p.score} points · ${p.num_comments} comments` })),
  ];

  const evidence = [
    youtube.length && `TOP YOUTUBE VIDEOS:\n${top(youtube, 10).map((p) => `- "${p.title}" (${fmtNum(p.score)} views, ${p.community})`).join("\n")}`,
    youtube.some((p) => p.comments.length) && `YOUTUBE VIEWER COMMENTS:\n${youtube.flatMap((p) => p.comments).slice(0, 15).map((c) => `- "${c}"`).join("\n")}`,
    tiktok.length && `TOP TIKTOKS:\n${top(tiktok, 10).map((p) => `- "${p.title}" (${fmtNum(p.score)} views, ${p.num_comments} comments)`).join("\n")}`,
    tiktok.some((p) => p.comments.length) && `TIKTOK COMMENTS:\n${tiktok.flatMap((p) => p.comments).slice(0, 15).map((c) => `- "${c}"`).join("\n")}`,
    bluesky.length && `BLUESKY POSTS:\n${top(bluesky, 8).map((p) => `- "${p.title}" (${p.score} engagements)`).join("\n")}`,
    hn.length && `HACKER NEWS:\n${top(hn, 5).map((p) => `- "${p.title}" (${p.score} pts)`).join("\n")}`,
    questions.length && `REAL GOOGLE SEARCHES:\n${questions.join("; ")}`,
    news.length && `NEWS HEADLINES:\n${news.join("; ")}`,
  ].filter(Boolean).join("\n\n");

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });
    const response = await anthropic.messages.create(
      {
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2500,
        messages: [{
          role: "user",
          content: `You are a content strategist. Topic: "${topic}".${topic !== keyword ? ` (The user searched "${keyword}", a brand or phrase too new to have its own data — plan content for "${keyword}" using the broader "${topic}" landscape. Never comment on the lack of data.)` : ""}
Here is real data collected just now:

${evidence || "(no live data found — rely on your knowledge, and be specific)"}

Using this evidence, work out what content is winning and what is missing. Be specific to "${topic}" — no generic advice. Gaps must be questions or angles from the evidence that the existing content does not answer well.

Reply with ONLY this JSON:
{"top_formats":["4 specific formats, e.g. '10-min registry practice walkthrough video'"],
"best_angles":["4 specific angles with the hook"],
"platform_activity":[{"platform":"YouTube","level":"high|medium|low","what_works":"specific"},{"platform":"Reddit","level":"...","what_works":"..."},{"platform":"TikTok","level":"...","what_works":"..."},{"platform":"Instagram","level":"...","what_works":"..."},{"platform":"Facebook","level":"...","what_works":"..."},{"platform":"Blog / SEO","level":"...","what_works":"..."}],
"trending_topics":["5 short sub-topics rising right now"],
"content_gaps":["4 specific gaps"],
"ideas":[{"title":"ready-to-use title","platform":"where to post","hook":"first line or first 3 seconds"}]}
Give 6 ideas.`,
        }],
      },
      { timeout: Math.max(12000, 56000 - (Date.now() - started)), maxRetries: 0 }
    );

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const start = text.indexOf("{");
    const data = start >= 0 ? JSON.parse(text.slice(start, text.lastIndexOf("}") + 1)) : {};
    const payload = { ...data, topic, questions: questions.slice(0, 15), top_content: topContent };
    cache.set(cacheKey, { at: Date.now(), payload });
    return Response.json(payload);
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
