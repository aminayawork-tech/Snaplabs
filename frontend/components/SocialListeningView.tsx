"use client";
import { useEffect, useState } from "react";
import { RecentResearch, SavedBar } from "./RecentResearch";
import { buildResearchMarkdown, downloadMarkdown } from "@/lib/exportResearch";

type Platform = "reddit" | "youtube" | "bluesky" | "hackernews" | "x" | "tiktok" | "facebook";

interface Post {
  title: string;
  text: string;
  community: string;
  author: string;
  score: number;
  num_comments: number;
  url: string;
  created_utc: number;
  sentiment: "positive" | "neutral" | "negative";
  key_insight: string;
}

interface SentimentSummary {
  positive: number;
  neutral: number;
  negative: number;
  overall: "positive" | "neutral" | "negative";
  summary: string;
}

interface PlatformActivity {
  platform: string;
  level: "high" | "medium" | "low";
  what_works: string;
}

interface ContentDiscovery {
  topic?: string;
  savedAt?: number;
  questions?: string[];
  top_content?: { title: string; platform: string; url: string; metric: string }[];
  ideas?: { title: string; platform: string; hook: string }[];
  top_formats: string[];
  best_angles: string[];
  platform_activity: PlatformActivity[];
  trending_topics: string[];
  content_gaps: string[];
}

interface ListenData {
  posts: Post[];
  sentiment_summary: SentimentSummary;
  top_communities: string[];
  key_themes: string[];
  opportunities: string[];
  pain_points: { point: string; quote: string; url: string | null }[];
  questions: string[];
  content_ideas: { title: string; format: string; why: string }[];
  search_questions: string[];
  data_source: "live" | "estimated";
  topic?: string;
  ai_error?: string;
  needs_key?: string;
  platform: Platform;
  savedAt?: number;
}

const ALL_PLATFORMS: Platform[] = ["reddit", "youtube", "bluesky", "hackernews", "x", "tiktok", "facebook"];

const PLATFORMS: { key: Platform; label: string; pill: string; activePill: string }[] = [
  { key: "reddit",     label: "Reddit",      pill: "bg-orange-50 text-orange-700 border-orange-200",    activePill: "bg-orange-600 text-white border-orange-600" },
  { key: "youtube",    label: "YouTube",     pill: "bg-red-50 text-red-700 border-red-200",             activePill: "bg-red-600 text-white border-red-600" },
  { key: "bluesky",    label: "Bluesky",     pill: "bg-sky-50 text-sky-700 border-sky-200",             activePill: "bg-sky-500 text-white border-sky-500" },
  { key: "hackernews", label: "HackerNews",  pill: "bg-amber-50 text-amber-700 border-amber-200",       activePill: "bg-amber-500 text-white border-amber-500" },
  { key: "x",          label: "X",           pill: "bg-slate-100 text-slate-700 border-slate-300",      activePill: "bg-slate-900 text-white border-slate-900" },
  { key: "tiktok",     label: "TikTok",      pill: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200", activePill: "bg-fuchsia-600 text-white border-fuchsia-600" },
  { key: "facebook",   label: "Facebook",    pill: "bg-indigo-50 text-indigo-700 border-indigo-200",    activePill: "bg-indigo-600 text-white border-indigo-600" },
];

const COMMUNITY_PREFIX: Record<Platform, string> = {
  reddit: "r/", youtube: "", bluesky: "#", hackernews: "", x: "#", tiktok: "#", facebook: "",
};

const COMMUNITY_STYLE: Record<Platform, string> = {
  reddit:     "bg-orange-50 text-orange-700 hover:bg-orange-100",
  youtube:    "bg-red-50 text-red-700 hover:bg-red-100",
  bluesky:    "bg-sky-50 text-sky-700 hover:bg-sky-100",
  hackernews: "bg-amber-50 text-amber-700 hover:bg-amber-100",
  x:          "bg-slate-100 text-slate-700 hover:bg-slate-200",
  tiktok:     "bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-100",
  facebook:   "bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
};

const COMMUNITY_LABEL: Record<Platform, string> = {
  reddit: "Active Subreddits", youtube: "Top Channels", bluesky: "Hashtags & Feeds", hackernews: "Topic Areas",
  x: "Top Hashtags",
  tiktok: "Top Hashtags", facebook: "Active Groups & Pages",
};

const COMMUNITY_LINK: Record<Platform, (c: string) => string | null> = {
  reddit:     c => `https://reddit.com/r/${c}`,
  youtube:    c => `https://www.youtube.com/results?search_query=${encodeURIComponent(c)}`,
  bluesky:    c => c.startsWith("@") ? `https://bsky.app/profile/${c.slice(1)}` : null,
  hackernews: () => null,
  x:          c => `https://x.com/hashtag/${encodeURIComponent(c)}`,
  tiktok:     c => `https://tiktok.com/tag/${encodeURIComponent(c)}`,
  facebook:   () => null,
};

const POST_HEADER: Record<Platform, string> = {
  reddit: "Reddit Discussions", youtube: "YouTube Videos", bluesky: "Bluesky Posts", hackernews: "HackerNews Stories",
  x: "Conversations", tiktok: "Videos", facebook: "Posts",
};

const SENTIMENT_STYLES = {
  positive: "bg-[#eff6ff] text-[#275fe8] border-[#bfdbfe]",
  neutral:  "bg-slate-100 text-slate-600 border-slate-200",
  negative: "bg-red-50 text-red-600 border-red-200",
};

const LEVEL_STYLES = {
  high:   { bar: "bg-[#275fe8]", label: "bg-[#eff6ff] text-[#275fe8]" },
  medium: { bar: "bg-blue-500",  label: "bg-blue-50 text-blue-700" },
  low:    { bar: "bg-slate-300", label: "bg-slate-100 text-slate-500" },
};

const LEVEL_WIDTH = { high: "w-full", medium: "w-2/3", low: "w-1/3" };

function SentimentBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold text-slate-500 w-16">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-700 w-10 text-right">{pct}%</span>
    </div>
  );
}

function timeAgo(utc: number) {
  const secs = Math.floor(Date.now() / 1000 - utc);
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function SentimentIcon({ overall }: { overall: "positive" | "neutral" | "negative" }) {
  const stroke = overall === "positive" ? "stroke-green-500" : overall === "negative" ? "stroke-red-500" : "stroke-slate-400";
  const bg = overall === "positive" ? "bg-[#eff6ff]" : overall === "negative" ? "bg-red-50" : "bg-slate-100";
  return (
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bg}`}>
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-6 h-6 ${stroke}`}>
        {overall === "positive"
          ? <><circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></>
          : overall === "negative"
          ? <><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></>
          : <><circle cx="12" cy="12" r="10"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></>
        }
      </svg>
    </div>
  );
}

type ResultsMap = Partial<Record<Platform, ListenData>>;
type LoadingMap = Partial<Record<Platform, boolean>>;
type ErrorMap = Partial<Record<Platform, string>>;

async function readJSON(res: Response) {
  const text = await res.text();
  try { return JSON.parse(text); }
  catch {
    return { error: res.status === 504 || /timeout|timed out|An error o/i.test(text)
      ? "This search took too long and timed out. Try again, or try a shorter or more common keyword."
      : `Server error (${res.status}). Please try again.` };
  }
}

// Saved research persists in localStorage so repeat searches don't spend API calls.
interface SavedResearch { keyword: string; updatedAt: number; results: ResultsMap; content?: ContentDiscovery }
const STORE_KEY = "snappy_social_research_v1";
const MAX_SAVED = 20;

function loadStore(): Record<string, SavedResearch> {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) ?? "{}"); } catch { return {}; }
}

function saveResearch(keyword: string, patch: Partial<Pick<SavedResearch, "results" | "content">>) {
  const store = loadStore();
  const k = keyword.toLowerCase();
  const prev = store[k] ?? { keyword, updatedAt: 0, results: {} };
  store[k] = { ...prev, keyword, updatedAt: Date.now(), results: { ...prev.results, ...patch.results }, content: patch.content ?? prev.content };
  let entries = Object.entries(store).sort((a, b) => b[1].updatedAt - a[1].updatedAt).slice(0, MAX_SAVED);
  while (entries.length) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(Object.fromEntries(entries))); return; }
    catch { entries = entries.slice(0, -1); }
  }
}

function deleteResearch(keyword: string) {
  const store = loadStore();
  delete store[keyword.toLowerCase()];
  try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch { /* ignore */ }
}


export default function SocialListeningView({ onNavigateToTrends }: { onNavigateToTrends?: (keyword: string) => void }) {
  const [keyword, setKeyword] = useState("");
  const [activePlatform, setActivePlatform] = useState<Platform>("reddit");
  const [results, setResults] = useState<ResultsMap>({});
  const [loadingMap, setLoadingMap] = useState<LoadingMap>({});
  const [errorMap, setErrorMap] = useState<ErrorMap>({});
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [recent, setRecent] = useState<SavedResearch[]>([]);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [activeSection, setActiveSection] = useState<"social" | "content">("social");
  const [contentDiscovery, setContentDiscovery] = useState<ContentDiscovery | null>(null);
  const [contentDiscoveryLoading, setContentDiscoveryLoading] = useState(false);

  const anyLoading = ALL_PLATFORMS.some(p => loadingMap[p]);
  const refreshRecent = () => setRecent(Object.values(loadStore()).sort((a, b) => b.updatedAt - a.updatedAt));
  useEffect(refreshRecent, []);

  const fetchPlatform = async (platform: Platform, kw: string, fresh = false) => {
    setLoadingMap(prev => ({ ...prev, [platform]: true }));
    setErrorMap(prev => ({ ...prev, [platform]: undefined }));
    try {
      const res = await fetch("/api/social/listen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: kw, platform, fresh }),
      });
      const json = await readJSON(res);
      if (json.error) {
        setErrorMap(prev => ({ ...prev, [platform]: json.error }));
      } else {
        const stamped = { ...json, savedAt: Date.now() };
        setResults(prev => ({ ...prev, [platform]: stamped }));
        if (!json.ai_error) {
          saveResearch(kw, { results: { [platform]: stamped } });
          refreshRecent();
        }
      }
    } catch (e) {
      setErrorMap(prev => ({ ...prev, [platform]: String(e) }));
    } finally {
      setLoadingMap(prev => ({ ...prev, [platform]: false }));
    }
  };

  const fetchContentDiscovery = async (kw: string, fresh = false) => {
    setContentDiscoveryLoading(true);
    try {
      const res = await fetch("/api/social/content-discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: kw, fresh }),
      });
      const json = await readJSON(res);
      if (json.error) setError(json.error);
      else {
        setError("");
        const stamped = { ...json, savedAt: Date.now() };
        setContentDiscovery(stamped);
        saveResearch(kw, { content: stamped });
        refreshRecent();
      }
    } catch {
      setError("Couldn't generate the content strategy. Please try again.");
    }
    finally { setContentDiscoveryLoading(false); }
  };

  const openResearch = (kw: string) => {
    const saved = loadStore()[kw.toLowerCase()];
    setKeyword(kw);
    setResults(saved?.results ?? {});
    setContentDiscovery(saved?.content ?? null);
    setErrorMap({});
    setError("");
    setShowAll(false);
    setActiveSection("social");
    setHasAnalyzed(true);
    const savedPlatforms = Object.keys(saved?.results ?? {}) as Platform[];
    if (saved?.results[activePlatform]) return;
    if (savedPlatforms.length) setActivePlatform(savedPlatforms[0]);
    else fetchPlatform(activePlatform, kw);
  };

  const analyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.trim()) openResearch(keyword.trim());
  };

  const data = results[activePlatform] ?? null;
  const isActiveLoading = !!loadingMap[activePlatform];
  const totalPosts = data ? (data.sentiment_summary.positive + data.sentiment_summary.neutral + data.sentiment_summary.negative) : 0;
  const visiblePosts = data ? (showAll ? data.posts : data.posts.slice(0, 8)) : [];

  return (
    <div className="view-enter">
      <div className="mb-5">
        <h2 className="font-display text-[1.375rem] font-bold text-slate-900 tracking-tight">Social Listening & Content Discovery</h2>
        <p className="text-[0.875rem] text-slate-500 mt-1">Enter a keyword, then click a platform to analyze it.</p>
      </div>

      <form onSubmit={analyze} className="flex gap-2 mb-5">
        <div className="flex-1 relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <input
            type="text"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder='Enter brand name or keyword (e.g. "cold plunge", "nurses", "weight loss")'
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#275fe8] focus:ring-1 focus:ring-[#275fe8] bg-white"
          />
        </div>
        <button type="submit" disabled={anyLoading || !keyword.trim()}
          className="bg-[#275fe8] hover:bg-[#1a4fd0] disabled:opacity-60 text-white font-semibold px-5 py-3 rounded-xl text-sm transition flex items-center gap-2 min-w-[100px] justify-center">
          Search
        </button>
      </form>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>}

      <RecentResearch
        className="-mt-2 mb-5"
        items={recent.map(r => ({ key: r.keyword.toLowerCase(), label: r.keyword, updatedAt: r.updatedAt, detail: `${Object.keys(r.results).length} platform(s)` }))}
        activeKey={hasAnalyzed ? keyword.trim().toLowerCase() : null}
        onOpen={(key) => { const r = recent.find(x => x.keyword.toLowerCase() === key); if (r) openResearch(r.keyword); }}
        onDelete={(key) => { deleteResearch(key); refreshRecent(); }}
      />

      {/* Platform tabs — visible once Analyze All has been clicked */}
      {hasAnalyzed && (
        <div className="mb-5">
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em]">Platform</p>
            {(Object.keys(results).length > 0 || contentDiscovery) && (
              <button
                onClick={() => downloadMarkdown(
                  `${keyword.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}-content-research.md`,
                  buildResearchMarkdown(keyword.trim(), results, contentDiscovery)
                )}
                title="Download blog briefs, pain points, questions and sources as a Markdown file"
                className="flex items-center gap-1.5 text-xs font-semibold border border-slate-200 bg-white text-slate-600 px-3 py-1.5 rounded-lg hover:border-[#275fe8] hover:text-[#275fe8] transition"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Export .md
                <span className="text-slate-400 font-normal">· {Object.keys(results).length + (contentDiscovery ? 1 : 0)} source{Object.keys(results).length + (contentDiscovery ? 1 : 0) === 1 ? "" : "s"}</span>
              </button>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {PLATFORMS.map(p => {
              const isLoading = !!loadingMap[p.key];
              const isDone = !!results[p.key];
              const isFailed = !!errorMap[p.key] && !isLoading;
              const isActive = activePlatform === p.key;
              return (
                <button
                  key={p.key}
                  disabled={isLoading}
                  title={isFailed ? "Failed — click to retry" : !isDone && !isLoading ? "Click to analyze" : undefined}
                  onClick={() => {
                    setActivePlatform(p.key);
                    setShowAll(false);
                    setActiveSection("social");
                    if (!isDone || isFailed) fetchPlatform(p.key, keyword.trim());
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition
                    ${isActive ? p.activePill : isFailed ? "bg-red-50 text-red-600 border-red-300" : p.pill}
                    ${isLoading ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
                  `}
                >
                  {isLoading
                    ? <span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    : isFailed
                    ? <span className="text-red-500 text-[10px] font-bold">↺</span>
                    : isDone
                    ? <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                    : <span className="w-1.5 h-1.5 rounded-full bg-current opacity-30" />
                  }
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Active platform loading state */}
      {isActiveLoading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-8 h-8 border-4 border-[#eff6ff] border-t-[#275fe8] rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Analyzing {PLATFORMS.find(p => p.key === activePlatform)?.label} conversations…</p>
        </div>
      )}

      {/* Error state for active platform */}
      {hasAnalyzed && !anyLoading && !data && errorMap[activePlatform] && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" className="w-6 h-6"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div className="max-w-sm">
            <p className="font-semibold text-slate-800 text-sm">Analysis failed</p>
            <p className="text-xs text-red-500 mt-1 font-mono break-all">{errorMap[activePlatform]}</p>
          </div>
          <button onClick={() => fetchPlatform(activePlatform, keyword.trim())}
            className="bg-[#275fe8] hover:bg-[#1a4fd0] text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition">
            Retry {PLATFORMS.find(p => p.key === activePlatform)?.label}
          </button>
        </div>
      )}

      {/* Prompt to pick a platform */}
      {hasAnalyzed && !anyLoading && !data && !errorMap[activePlatform] && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <p className="text-sm text-slate-500">Click a platform above to analyze <strong>{keyword.trim()}</strong></p>
        </div>
      )}

      {data && !isActiveLoading && (
        <div className="flex flex-col gap-4 view-enter">
          {data.savedAt && (
            <SavedBar savedAt={data.savedAt} label={PLATFORMS.find(p => p.key === activePlatform)?.label} onRefresh={() => fetchPlatform(activePlatform, keyword.trim(), true)} />
          )}

          {data.data_source === "live" ? (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-xs text-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
              <span><strong>Live data</strong> — analyzed {data.posts.length} real {PLATFORMS.find(p => p.key === activePlatform)?.label} posts{data.top_communities.length > 0 && activePlatform !== "hackernews" ? ` from ${data.top_communities.slice(0, 3).map(c => `${COMMUNITY_PREFIX[activePlatform]}${c}`).join(", ")}` : ""}, plus {data.search_questions.length} real Google searches.</span>
            </div>
          ) : (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-800">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 flex-shrink-0 mt-px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>
                {data.needs_key
                  ? <><strong>Not connected</strong> — add <code className="font-mono">{data.needs_key}</code> in Vercel to pull live {PLATFORMS.find(p => p.key === activePlatform)?.label} posts. </>
                  : <><strong>Estimated</strong> — {PLATFORMS.find(p => p.key === activePlatform)?.label} has no public data API. </>}
                {data.search_questions.length > 0
                  ? `Based on ${data.search_questions.length} real Google searches and today's news.`
                  : "Based on AI knowledge of this audience."}
                {" "}Reddit, YouTube, TikTok, Facebook, X, Bluesky and HackerNews show real posts.
              </span>
            </div>
          )}

          {data.topic && data.topic.toLowerCase() !== keyword.trim().toLowerCase() && (
            <div className="flex items-start gap-2 bg-[#f0f7ff] border border-[#bfdbfe] rounded-xl px-4 py-2.5 text-xs text-slate-700">
              <svg viewBox="0 0 24 24" fill="none" stroke="#275fe8" strokeWidth="2" className="w-4 h-4 flex-shrink-0 mt-px"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <span><strong>&ldquo;{keyword.trim()}&rdquo;</strong> has no conversation of its own yet, so this shows the broader <strong>&ldquo;{data.topic}&rdquo;</strong> conversation — the audience you&apos;re trying to reach.</span>
            </div>
          )}

          {data.ai_error && (
            <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-xs text-red-700">
              <span>{data.ai_error}</span>
              <button onClick={() => fetchPlatform(activePlatform, keyword.trim())} className="font-semibold underline flex-shrink-0">Retry</button>
            </div>
          )}

          {/* Section toggle */}
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
            <button onClick={() => setActiveSection("social")}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition
                ${activeSection === "social" ? "bg-white text-[#275fe8] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Social Listening
            </button>
            <button onClick={() => setActiveSection("content")}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition
                ${activeSection === "content" ? "bg-white text-[#275fe8] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              Content Discovery
            </button>
          </div>

          {/* ── SOCIAL LISTENING ── */}
          {activeSection === "social" && (
            <>
              {!data.ai_error && <div className={`grid grid-cols-1 gap-4 ${totalPosts > 0 ? "md:grid-cols-2" : ""}`}>
                {totalPosts > 0 && <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-4">Sentiment Overview</p>
                  <div className="flex items-center gap-3 mb-4">
                    <SentimentIcon overall={data.sentiment_summary.overall} />
                    <div>
                      <p className="font-bold text-slate-900 capitalize">{data.sentiment_summary.overall} overall</p>
                      <p className="text-xs text-slate-400">{data.data_source === "live" ? `${totalPosts} real posts analyzed` : "Estimated sentiment"}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <SentimentBar label="Positive" count={data.sentiment_summary.positive} total={totalPosts || 100} color="bg-emerald-500" />
                    <SentimentBar label="Neutral"  count={data.sentiment_summary.neutral}  total={totalPosts || 100} color="bg-slate-400" />
                    <SentimentBar label="Negative" count={data.sentiment_summary.negative} total={totalPosts || 100} color="bg-red-500" />
                  </div>
                </div>}

                <div className="flex flex-col gap-3">
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex-1">
                    <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-3">Key Themes</p>
                    <div className="flex flex-wrap gap-1.5">
                      {data.key_themes.map((t, i) => (
                        <span key={i} className="text-xs font-semibold bg-[#eff6ff] text-[#275fe8] px-2.5 py-1 rounded-full">{t}</span>
                      ))}
                    </div>
                  </div>
                  {data.top_communities.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                      <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-3">
                        {COMMUNITY_LABEL[activePlatform]}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {data.top_communities.map((c, i) => {
                          const href = COMMUNITY_LINK[activePlatform](c);
                          const prefix = COMMUNITY_PREFIX[activePlatform];
                          const cls = `text-xs font-semibold px-2.5 py-1 rounded-full transition ${COMMUNITY_STYLE[activePlatform]}`;
                          return href ? (
                            <a key={i} href={href} target="_blank" rel="noopener noreferrer" className={cls}>{prefix}{c}</a>
                          ) : (
                            <span key={i} className={cls}>{prefix}{c}</span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>}

              {data.sentiment_summary.summary && (
                <div className="bg-[#f0f7ff] border border-[#bfdbfe] rounded-2xl p-4">
                  <p className="text-[0.6875rem] font-semibold text-[#275fe8] uppercase tracking-[0.1em] mb-2">What People Are Saying</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{data.sentiment_summary.summary}</p>
                </div>
              )}

              {(data.pain_points.length > 0 || data.questions.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.pain_points.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                      <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-3">Pain Points</p>
                      <ul className="space-y-3">
                        {data.pain_points.map((pp, i) => (
                          <li key={i} className="text-sm">
                            <p className="font-semibold text-slate-800 flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 flex-shrink-0" />{pp.point}
                            </p>
                            {pp.quote && (
                              <p className="ml-3.5 mt-1 pl-3 border-l-2 border-slate-200 text-xs text-slate-500 italic">
                                &ldquo;{pp.quote}&rdquo;
                                {pp.url && <a href={pp.url} target="_blank" rel="noopener noreferrer" className="not-italic text-[#275fe8] font-semibold ml-1.5 hover:underline">source ↗</a>}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {data.questions.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                      <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-3">Questions People Ask</p>
                      <ul className="space-y-2">
                        {data.questions.map((q, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                            <span className="text-[#275fe8] font-bold flex-shrink-0">?</span>{q}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {data.content_ideas.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-3">Content Ideas From This Conversation</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {data.content_ideas.map((c, i) => (
                      <div key={i} className="border border-slate-100 bg-slate-50 rounded-xl p-3.5">
                        <span className="text-[0.625rem] font-bold uppercase tracking-wide text-[#275fe8]">{c.format}</span>
                        <p className="text-sm font-semibold text-slate-800 mt-1 leading-snug">{c.title}</p>
                        <p className="text-xs text-slate-500 mt-1.5">{c.why}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.opportunities.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-3">Marketing Opportunities</p>
                  <ul className="space-y-2">
                    {data.opportunities.map((o, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="text-[#275fe8] font-bold mt-0.5 flex-shrink-0">→</span>{o}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {visiblePosts.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
                    <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em]">
                      {POST_HEADER[activePlatform]} ({data.posts.length})
                    </p>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {visiblePosts.map((post, i) => (
                      <div key={i} className="px-5 py-4 hover:bg-slate-50 transition">
                        <div className="flex items-start gap-3">
                          <span className={`mt-0.5 flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-bold border ${SENTIMENT_STYLES[post.sentiment]}`}>
                            {post.sentiment}
                          </span>
                          <div className="min-w-0 flex-1">
                            <a href={post.url} target="_blank" rel="noopener noreferrer"
                              className="text-sm font-semibold text-slate-800 hover:text-[#275fe8] hover:underline line-clamp-2 underline-offset-2">
                              {post.title}
                            </a>
                            {post.key_insight && (
                              <p className="text-xs text-slate-500 mt-1 italic">{post.key_insight}</p>
                            )}
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400 flex-wrap">
                              <span className={`font-semibold ${COMMUNITY_STYLE[activePlatform].split(" ")[1]}`}>
                                {activePlatform === "reddit" ? `r/${post.community}` : activePlatform === "hackernews" ? `by ${post.author}` : post.community}
                              </span>
                              <span>{activePlatform === "youtube" || activePlatform === "tiktok" ? `${post.score.toLocaleString()} views` : `↑ ${post.score}`}</span>
                              <span>{post.num_comments} comments</span>
                              <span>{timeAgo(post.created_utc)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {data.posts.length > 8 && !showAll && (
                    <div className="px-5 py-3 border-t border-slate-100 text-center">
                      <button onClick={() => setShowAll(true)} className="text-sm text-[#275fe8] font-semibold hover:underline">
                        Show all {data.posts.length} posts
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── CONTENT DISCOVERY ── */}
          {activeSection === "content" && (
            contentDiscoveryLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-8 h-8 border-4 border-[#eff6ff] border-t-[#275fe8] rounded-full animate-spin" />
                <p className="text-sm text-slate-500">Pulling live YouTube, Bluesky &amp; search data…</p>
              </div>
            ) : contentDiscovery ? (
              <div className="flex flex-col gap-4">
                {contentDiscovery.savedAt && (
                  <SavedBar savedAt={contentDiscovery.savedAt} label="strategy" onRefresh={() => fetchContentDiscovery(keyword.trim(), true)} />
                )}
                {(contentDiscovery.top_content ?? []).length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <p className="text-[0.6875rem] font-semibold text-slate-500 uppercase tracking-[0.1em]">Top Performing Content Right Now (live)</p>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {(contentDiscovery.top_content ?? []).map((c, i) => (
                        <a key={i} href={c.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition">
                          <span className="text-[0.625rem] font-bold uppercase tracking-wide text-slate-400 w-20 flex-shrink-0">{c.platform}</span>
                          <span className="text-sm font-semibold text-slate-800 flex-1 min-w-0 truncate">{c.title}</span>
                          <span className="text-xs text-slate-400 flex-shrink-0 hidden sm:block">{c.metric}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {(contentDiscovery.ideas ?? []).length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-3">Ready-to-Use Content Ideas</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(contentDiscovery.ideas ?? []).map((idea, i) => (
                        <div key={i} className="border border-slate-100 bg-slate-50 rounded-xl p-3.5">
                          <span className="text-[0.625rem] font-bold uppercase tracking-wide text-[#275fe8]">{idea.platform}</span>
                          <p className="text-sm font-semibold text-slate-800 mt-1 leading-snug">{idea.title}</p>
                          <p className="text-xs text-slate-500 mt-1.5"><span className="font-semibold text-slate-600">Hook:</span> {idea.hook}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(contentDiscovery.questions ?? []).length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-3">What People Are Googling</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(contentDiscovery.questions ?? []).map((q, i) => (
                        <span key={i} className="text-xs text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">{q}</span>
                      ))}
                    </div>
                  </div>
                )}

                {(contentDiscovery.platform_activity ?? []).length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-4">Platform Activity</p>
                    <div className="space-y-3">
                      {(contentDiscovery.platform_activity ?? []).map((p, i) => {
                        const lvl: "high" | "medium" | "low" = (["high", "medium", "low"].includes(p.level) ? p.level : "low") as "high" | "medium" | "low";
                        const s = LEVEL_STYLES[lvl];
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-slate-700 w-20 flex-shrink-0">{p.platform}</span>
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${s.bar} ${LEVEL_WIDTH[lvl]}`} />
                            </div>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.label} w-16 text-center flex-shrink-0 capitalize`}>{lvl}</span>
                            <span className="text-xs text-slate-500 flex-1 hidden md:block">{p.what_works}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-3">Top Content Formats</p>
                    <div className="flex flex-wrap gap-2">
                      {(contentDiscovery.top_formats ?? []).map((f, i) => (
                        <span key={i} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium px-3 py-1.5 rounded-lg">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#275fe8]" />{f}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-3">Best Content Angles</p>
                    <ul className="space-y-1.5">
                      {(contentDiscovery.best_angles ?? []).map((a, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                          <span className="text-[#275fe8] font-bold flex-shrink-0">→</span>{a}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-3">Trending Topics to Cover</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(contentDiscovery.trending_topics ?? []).map((t, i) => (
                        <button
                          key={i}
                          onClick={() => onNavigateToTrends?.(t)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full transition ${onNavigateToTrends ? "bg-blue-50 text-blue-700 hover:bg-[#275fe8] hover:text-white cursor-pointer" : "bg-blue-50 text-blue-700"}`}
                          title={onNavigateToTrends ? `Search "${t}" in Keyword Trends` : undefined}
                        >
                          {t} {onNavigateToTrends && <span className="opacity-60">↗</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-3">Content Gaps (Opportunities)</p>
                    <ul className="space-y-1.5">
                      {(contentDiscovery.content_gaps ?? []).map((g, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                          <span className="text-[#275fe8] font-bold flex-shrink-0">+</span>{g}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#eff6ff] flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#275fe8" strokeWidth="2" className="w-7 h-7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">Generate Content Strategy</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">Discover what content formats and angles work best for <strong>{keyword.trim()}</strong> across all platforms.</p>
                </div>
                <button
                  onClick={() => fetchContentDiscovery(keyword.trim())}
                  className="bg-[#275fe8] hover:bg-[#1a4fd0] text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition">
                  Generate Content Strategy
                </button>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
