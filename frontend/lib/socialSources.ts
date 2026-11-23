export interface SourcePost {
  title: string;
  text: string;
  community: string;
  author: string;
  score: number;
  num_comments: number;
  url: string;
  created_utc: number;
  comments: string[];
}

const UA = "web:snappymarketer:1.0 (social listening)";

async function getJSON<T = unknown>(url: string, init: RequestInit = {}, ms = 6000): Promise<T | null> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    const res = await fetch(url, {
      ...init,
      signal: ac.signal,
      cache: "no-store",
      headers: { "User-Agent": UA, ...(init.headers ?? {}) },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n).trim()}…` : s);
const stripHtml = (s: string) =>
  s.replace(/<[^>]+>/g, " ").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#x2F;/g, "/").replace(/\s+/g, " ").trim();

// ── Reddit (official API when REDDIT_CLIENT_ID/SECRET are set; anonymous JSON otherwise) ──
let redditToken: { value: string; expires: number } | null = null;

async function redditAuthHeader(): Promise<Record<string, string> | null> {
  const id = process.env.REDDIT_CLIENT_ID;
  const secret = process.env.REDDIT_CLIENT_SECRET;
  if (!id || !secret) return null;
  if (redditToken && redditToken.expires > Date.now()) return { Authorization: `Bearer ${redditToken.value}` };
  const data = await getJSON<{ access_token?: string; expires_in?: number }>(
    "https://www.reddit.com/api/v1/access_token",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    }
  );
  if (!data?.access_token) return null;
  redditToken = { value: data.access_token, expires: Date.now() + ((data.expires_in ?? 3600) - 60) * 1000 };
  return { Authorization: `Bearer ${data.access_token}` };
}

// ── Reddit via RapidAPI (SteadyAPI "Reddit"; RAPIDAPI_KEY + optional RAPIDAPI_REDDIT_HOST) ──
// Basic plan allows ~1 request/second, so calls are made one at a time.
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface RapidPost { id: string; title: string; author: string; subreddit: string; selftext?: string; score?: number; num_comments?: number; url?: string; permalink?: string; created_utc?: number; over_18?: boolean }

async function fetchRedditRapid(keyword: string): Promise<SourcePost[]> {
  const key = process.env.RAPIDAPI_KEY!;
  const host = process.env.RAPIDAPI_REDDIT_HOST || "reddit3.p.rapidapi.com";
  const headers = { "X-RapidAPI-Key": key, "X-RapidAPI-Host": host };
  const phrase = keyword.trim().includes(" ") ? `"${keyword.trim()}"` : keyword.trim();
  const words = keyword.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const spam = /for hire|hire me|pay (someone|me)|take my [\w ]{0,20}(exam|test|class|course)|do my [\w ]{0,20}(homework|exam)|cheat|bypass|proctored exam help/i;
  const exact = keyword.trim().toLowerCase();
  const relevant = (p: RapidPost) => {
    if (spam.test(p.title)) return false;
    const title = p.title.toLowerCase();
    return `${title} ${(p.selftext ?? "").toLowerCase()}`.includes(exact) || words.every((w) => title.includes(w));
  };

  const search = async (q: string, timeFilter: string) =>
    (await getJSON<{ body?: RapidPost[] }>(
      `https://${host}/v1/reddit/search?search=${encodeURIComponent(q)}&filter=posts&timeFilter=${timeFilter}&sortType=relevance`,
      { headers }, 12000
    ))?.body ?? [];

  let raw: RapidPost[] = [];
  const add = (more: RapidPost[]) => {
    const seen = new Set(raw.map((p) => p.id));
    raw = [...raw, ...more.filter((p) => relevant(p) && !seen.has(p.id))];
  };
  add(await search(phrase, "year"));
  if (raw.length < 5) { await sleep(1100); add(await search(phrase, "all")); }
  if (raw.length < 3 && phrase !== keyword.trim()) { await sleep(1100); add(await search(keyword.trim(), "all")); }

  const posts: SourcePost[] = raw.filter((p) => !p.over_18).slice(0, 25).map((p) => ({
    title: p.title,
    text: clip(String(p.selftext ?? ""), 400),
    community: p.subreddit,
    author: p.author,
    score: p.score ?? 0,
    num_comments: p.num_comments ?? 0,
    url: p.url || `https://www.reddit.com${p.permalink ?? ""}`,
    created_utc: p.created_utc ?? 0,
    comments: [],
  }));

  for (const p of [...posts].filter((x) => x.num_comments > 0).sort((a, b) => b.num_comments - a.num_comments).slice(0, 2)) {
    await sleep(1100);
    const detail = await getJSON<{ body?: { post_comments?: { content?: string; score?: number }[] } }>(
      `https://${host}/v1/reddit/post?url=${encodeURIComponent(p.url)}`, { headers }, 8000
    );
    p.comments = (detail?.body?.post_comments ?? [])
      .filter((c) => c.content && c.content !== "[deleted]" && c.content !== "[removed]")
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 6)
      .map((c) => clip(String(c.content), 280));
  }
  return posts;
}

export async function fetchReddit(keyword: string): Promise<SourcePost[]> {
  if (!process.env.REDDIT_CLIENT_ID && process.env.RAPIDAPI_KEY) return fetchRedditRapid(keyword);
  const auth = await redditAuthHeader();
  const host = auth ? "https://oauth.reddit.com" : "https://www.reddit.com";
  const q = encodeURIComponent(keyword);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await getJSON<any>(`${host}/search${auth ? "" : ".json"}?q=${q}&sort=relevance&t=year&limit=25&type=link&raw_json=1`, { headers: auth ?? {} });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const posts: SourcePost[] = (data?.data?.children ?? []).map((c: any) => c.data).filter((p: any) => p && !p.over_18).map((p: any) => ({
    title: p.title as string,
    text: clip(String(p.selftext ?? ""), 400),
    community: p.subreddit as string,
    author: p.author as string,
    score: p.score ?? 0,
    num_comments: p.num_comments ?? 0,
    url: `https://www.reddit.com${p.permalink}`,
    created_utc: p.created_utc ?? 0,
    comments: [],
    _id: p.id as string,
  }));

  const top = [...posts].sort((a, b) => b.num_comments - a.num_comments).slice(0, 4);
  await Promise.all(top.map(async (p) => {
    const id = (p as SourcePost & { _id: string })._id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const thread = await getJSON<any>(`${host}/comments/${id}${auth ? "" : ".json"}?sort=top&limit=8&depth=1&raw_json=1`, { headers: auth ?? {} }, 4000);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    p.comments = (thread?.[1]?.data?.children ?? []).map((c: any) => c.data?.body).filter(Boolean).slice(0, 6).map((b: string) => clip(b, 280));
  }));
  return posts;
}

// ── YouTube (videos + top comments; needs YOUTUBE_API_KEY) ──
export async function fetchYouTube(keyword: string): Promise<SourcePost[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return [];
  const params = new URLSearchParams({ part: "snippet", q: keyword, type: "video", maxResults: "12", order: "relevance", relevanceLanguage: "en", key });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const search = await getJSON<any>(`https://www.googleapis.com/youtube/v3/search?${params}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = search?.items ?? [];
  if (!items.length) return [];
  const ids = items.map((i) => i.id.videoId).join(",");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stats = await getJSON<any>(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${ids}&key=${key}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const statMap = new Map<string, any>((stats?.items ?? []).map((v: any) => [v.id, v.statistics]));

  const posts: SourcePost[] = items.map((i) => {
    const s = statMap.get(i.id.videoId) ?? {};
    return {
      title: stripHtml(i.snippet.title),
      text: clip(stripHtml(i.snippet.description ?? ""), 200),
      community: i.snippet.channelTitle,
      author: i.snippet.channelTitle,
      score: Number(s.viewCount ?? 0),
      num_comments: Number(s.commentCount ?? 0),
      url: `https://www.youtube.com/watch?v=${i.id.videoId}`,
      created_utc: Math.floor(new Date(i.snippet.publishedAt).getTime() / 1000),
      comments: [],
      _id: i.id.videoId,
    };
  });

  const top = [...posts].sort((a, b) => b.num_comments - a.num_comments).slice(0, 4);
  await Promise.all(top.map(async (p) => {
    const id = (p as SourcePost & { _id: string })._id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ct = await getJSON<any>(`https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${id}&maxResults=10&order=relevance&textFormat=plainText&key=${key}`, {}, 4000);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    p.comments = (ct?.items ?? []).map((c: any) => c.snippet?.topLevelComment?.snippet?.textDisplay).filter(Boolean).slice(0, 6).map((b: string) => clip(b, 280));
  }));
  return posts;
}

// ── Bluesky (public search API, no key) ──
export async function fetchBluesky(keyword: string): Promise<SourcePost[]> {
  const search = (sort: string) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getJSON<any>(`https://api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(keyword)}&limit=30&sort=${sort}&lang=en`);
  const [top, latest] = await Promise.all([search("top"), search("latest")]);
  const seen = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = [...(top?.posts ?? []), ...(latest?.posts ?? [])].filter((p: any) => !seen.has(p.uri) && seen.add(p.uri));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return raw.map((p: any) => {
    const handle = p.author?.handle ?? "unknown";
    const rkey = String(p.uri ?? "").split("/").pop();
    const text = String(p.record?.text ?? "");
    return {
      title: clip(text, 140),
      text: clip(text, 400),
      community: `@${handle}`,
      author: p.author?.displayName || handle,
      score: (p.likeCount ?? 0) + (p.repostCount ?? 0),
      num_comments: p.replyCount ?? 0,
      url: `https://bsky.app/profile/${handle}/post/${rkey}`,
      created_utc: Math.floor(new Date(p.indexedAt ?? p.record?.createdAt ?? Date.now()).getTime() / 1000),
      comments: [],
    };
  }).filter((p: SourcePost) => p.text.length > 20);
}

// ── HackerNews (Algolia, no key) ──
export async function fetchHackerNews(keyword: string): Promise<SourcePost[]> {
  const q = encodeURIComponent(keyword);
  const [stories, comments] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getJSON<any>(`https://hn.algolia.com/api/v1/search?query=${q}&hitsPerPage=15&tags=story`),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getJSON<any>(`https://hn.algolia.com/api/v1/search?query=${q}&hitsPerPage=20&tags=comment`),
  ]);
  const byStory = new Map<string, string[]>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const c of comments?.hits ?? []) {
    const k = String(c.story_id);
    byStory.set(k, [...(byStory.get(k) ?? []), clip(stripHtml(c.comment_text ?? ""), 280)]);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (stories?.hits ?? []).filter((h: any) => h.title).map((h: any) => ({
    title: h.title,
    text: clip(stripHtml(h.story_text ?? ""), 300),
    community: "Hacker News",
    author: h.author,
    score: h.points ?? 0,
    num_comments: h.num_comments ?? 0,
    url: `https://news.ycombinator.com/item?id=${h.objectID}`,
    created_utc: Math.floor(new Date(h.created_at).getTime() / 1000),
    comments: byStory.get(String(h.objectID)) ?? [],
  }));
}

// ── Cross-web signals: real Google searches + news headlines ──
export async function fetchSearchQuestions(keyword: string): Promise<string[]> {
  const seeds = [`${keyword} `, `how ${keyword}`, `is ${keyword}`, `best ${keyword}`, `${keyword} vs`, `why ${keyword}`, `what ${keyword}`, `${keyword} for`];
  const lists = await Promise.all(seeds.map((s) =>
    getJSON<[string, string[]]>(`https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(s)}`, {}, 3000)
  ));
  const out = new Set<string>();
  for (const l of lists) for (const s of (l?.[1] ?? []).slice(0, 4)) if (s.toLowerCase() !== keyword.toLowerCase()) out.add(s);
  return [...out].slice(0, 30);
}

export async function fetchNewsHeadlines(keyword: string): Promise<string[]> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 4000);
  try {
    const res = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=en-US&gl=US&ceid=US:en`, { signal: ac.signal, cache: "no-store" });
    if (!res.ok) return [];
    const xml = await res.text();
    return [...xml.matchAll(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>/g)]
      .map((m) => stripHtml(m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, "$1")))
      .slice(0, 10);
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}

// For brand names / ultra-niche phrases with no data, find the broader topic their audience actually searches.
export async function broaderTopic(keyword: string): Promise<string | null> {
  const words = keyword.trim().split(/\s+/);
  if (words.length < 2) return null;
  const variants = [...new Set([
    words.slice(1).join(" "),
    words.slice(0, -1).join(" "),
    words.length > 2 ? words.slice(-2).join(" ") : "",
    words.length > 2 ? words.slice(1, -1).join(" ") : "",
  ])].filter((v) => v && v.toLowerCase() !== keyword.toLowerCase());

  const scored = await Promise.all(variants.map(async (v) => ({ v, n: (await fetchSearchQuestions(v)).length })));
  // Prefer the most specific variant that still has real search demand.
  const words_ = (v: string) => v.split(/\s+/).length;
  const best = scored.filter((s) => s.n >= 3).sort((a, b) => words_(b.v) - words_(a.v) || b.n - a.n)[0];
  return best?.v ?? null;
}

// ── TikTok via RapidAPI ("TikTok Scraper"; RAPIDAPI_KEY + optional RAPIDAPI_TIKTOK_HOST) ──
interface TikTokVideo {
  video_id: string; title?: string; play_count?: number; digg_count?: number; comment_count?: number;
  create_time?: number; author?: { unique_id?: string; nickname?: string };
}

export async function fetchTikTok(keyword: string): Promise<SourcePost[]> {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) return [];
  const host = process.env.RAPIDAPI_TIKTOK_HOST || "tiktok-scraper7.p.rapidapi.com";
  const headers = { "X-RapidAPI-Key": key, "X-RapidAPI-Host": host };
  const search = await getJSON<{ data?: { videos?: TikTokVideo[] } }>(
    `https://${host}/feed/search?keywords=${encodeURIComponent(keyword)}&region=us&count=20&cursor=0&publish_time=0&sort_type=0`,
    { headers }, 15000
  );

  const posts: SourcePost[] = (search?.data?.videos ?? []).filter((v) => v.title).map((v) => {
    const handle = v.author?.unique_id ?? "";
    return {
      title: clip(v.title!, 140),
      text: clip(v.title!, 400),
      community: handle ? `@${handle}` : "",
      author: v.author?.nickname || handle,
      score: v.play_count ?? 0,
      num_comments: v.comment_count ?? 0,
      url: `https://www.tiktok.com/@${handle}/video/${v.video_id}`,
      created_utc: v.create_time ?? 0,
      comments: [],
      _id: v.video_id,
    };
  });

  for (const p of [...posts].sort((a, b) => b.num_comments - a.num_comments).slice(0, 3)) {
    await sleep(1100);
    const res = await getJSON<{ data?: { comments?: { text?: string; digg_count?: number }[] } }>(
      `https://${host}/comment/list?url=${(p as SourcePost & { _id: string })._id}&count=20&cursor=0`, { headers }, 8000
    );
    p.comments = (res?.data?.comments ?? [])
      .filter((c) => c.text && c.text.length > 8)
      .sort((a, b) => (b.digg_count ?? 0) - (a.digg_count ?? 0))
      .slice(0, 8)
      .map((c) => clip(String(c.text), 280));
  }
  return posts;
}

export function topHashtags(posts: SourcePost[], n = 6): string[] {
  const counts = new Map<string, number>();
  const generic = new Set(["fyp", "foryou", "foryoupage", "viral", "fy", "trending", "xyzbca", "tiktok"]);
  for (const p of posts) {
    for (const tag of new Set((p.text.match(/#[\p{L}\p{N}_]+/gu) ?? []).map((t) => t.slice(1).toLowerCase()))) {
      if (!generic.has(tag)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([t]) => t);
}
