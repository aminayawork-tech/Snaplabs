"use client";
import { useState } from "react";

type Platform = "reddit" | "hackernews" | "x" | "linkedin" | "tiktok" | "facebook";

interface Post {
  title: string;
  subreddit: string;
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
  data_source: string;
  platform: Platform;
}

const ALL_PLATFORMS: Platform[] = ["reddit", "hackernews", "x", "linkedin", "tiktok", "facebook"];

const PLATFORMS: { key: Platform; label: string; pill: string; activePill: string }[] = [
  { key: "reddit",     label: "Reddit",      pill: "bg-orange-50 text-orange-700 border-orange-200",    activePill: "bg-orange-600 text-white border-orange-600" },
  { key: "hackernews", label: "HackerNews",  pill: "bg-amber-50 text-amber-700 border-amber-200",       activePill: "bg-amber-500 text-white border-amber-500" },
  { key: "x",          label: "X",           pill: "bg-slate-100 text-slate-700 border-slate-300",      activePill: "bg-slate-900 text-white border-slate-900" },
  { key: "linkedin",   label: "LinkedIn",    pill: "bg-blue-50 text-blue-700 border-blue-200",          activePill: "bg-blue-700 text-white border-blue-700" },
  { key: "tiktok",     label: "TikTok",      pill: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200", activePill: "bg-fuchsia-600 text-white border-fuchsia-600" },
  { key: "facebook",   label: "Facebook",    pill: "bg-indigo-50 text-indigo-700 border-indigo-200",    activePill: "bg-indigo-600 text-white border-indigo-600" },
];

const COMMUNITY_PREFIX: Record<Platform, string> = {
  reddit: "r/", hackernews: "", x: "#", linkedin: "", tiktok: "#", facebook: "",
};

const COMMUNITY_STYLE: Record<Platform, string> = {
  reddit:     "bg-orange-50 text-orange-700 hover:bg-orange-100",
  hackernews: "bg-amber-50 text-amber-700 hover:bg-amber-100",
  x:          "bg-slate-100 text-slate-700 hover:bg-slate-200",
  linkedin:   "bg-blue-50 text-blue-700 hover:bg-blue-100",
  tiktok:     "bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-100",
  facebook:   "bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
};

const COMMUNITY_LABEL: Record<Platform, string> = {
  reddit: "Active Subreddits", hackernews: "Topic Areas",
  x: "Top Hashtags", linkedin: "Active Communities",
  tiktok: "Top Hashtags", facebook: "Active Groups & Pages",
};

const COMMUNITY_LINK: Record<Platform, (c: string) => string | null> = {
  reddit:     c => `https://reddit.com/r/${c}`,
  hackernews: () => null,
  x:          c => `https://x.com/hashtag/${encodeURIComponent(c)}`,
  linkedin:   () => null,
  tiktok:     c => `https://tiktok.com/tag/${encodeURIComponent(c)}`,
  facebook:   () => null,
};

const POST_HEADER: Record<Platform, string> = {
  reddit: "Reddit Discussions", hackernews: "HackerNews Stories",
  x: "Conversations", linkedin: "Posts", tiktok: "Videos", facebook: "Posts",
};

const SENTIMENT_STYLES = {
  positive: "bg-green-50 text-green-700 border-green-200",
  neutral:  "bg-slate-100 text-slate-600 border-slate-200",
  negative: "bg-red-50 text-red-600 border-red-200",
};

const LEVEL_STYLES = {
  high:   { bar: "bg-[#6b21d6]", label: "bg-[#f3eef8] text-[#6b21d6]" },
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
  const bg = overall === "positive" ? "bg-green-50" : overall === "negative" ? "bg-red-50" : "bg-slate-100";
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
type ErrorMap = Partial<Record<Platform, boolean>>;

// Session-level caches
const socialCache = new Map<string, ResultsMap>();
const contentDiscoveryCache = new Map<string, ContentDiscovery>();

export default function SocialListeningView() {
  const [keyword, setKeyword] = useState("");
  const [activePlatform, setActivePlatform] = useState<Platform>("reddit");
  const [results, setResults] = useState<ResultsMap>({});
  const [loadingMap, setLoadingMap] = useState<LoadingMap>({});
  const [errorMap, setErrorMap] = useState<ErrorMap>({});
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [activeSection, setActiveSection] = useState<"social" | "content">("social");
  const [contentDiscovery, setContentDiscovery] = useState<ContentDiscovery | null>(null);
  const [contentDiscoveryLoading, setContentDiscoveryLoading] = useState(false);

  const anyLoading = ALL_PLATFORMS.some(p => loadingMap[p]);
  const doneCount = ALL_PLATFORMS.filter(p => results[p] && !loadingMap[p]).length;

  const fetchPlatform = async (platform: Platform, kw: string) => {
    setLoadingMap(prev => ({ ...prev, [platform]: true }));
    setErrorMap(prev => ({ ...prev, [platform]: false }));
    try {
      const res = await fetch("/api/social/listen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: kw, platform }),
      });
      const json = await res.json();
      if (json.error) {
        setErrorMap(prev => ({ ...prev, [platform]: true }));
      } else {
        setResults(prev => {
          const next = { ...prev, [platform]: json };
          // Keep cache up to date as each platform finishes
          socialCache.set(kw.toLowerCase(), next);
          return next;
        });
      }
    } catch {
      setErrorMap(prev => ({ ...prev, [platform]: true }));
    } finally {
      setLoadingMap(prev => ({ ...prev, [platform]: false }));
    }
  };

  const fetchContentDiscovery = async (kw: string) => {
    const cacheKey = kw.toLowerCase();
    const cached = contentDiscoveryCache.get(cacheKey);
    if (cached) { setContentDiscovery(cached); return; }
    setContentDiscoveryLoading(true);
    try {
      const res = await fetch("/api/social/content-discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: kw }),
      });
      const json = await res.json();
      if (!json.error) {
        contentDiscoveryCache.set(cacheKey, json);
        setContentDiscovery(json);
      }
    } catch { /* silently fail */ }
    finally { setContentDiscoveryLoading(false); }
  };

  const analyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    const kw = keyword.trim();
    const cacheKey = kw.toLowerCase();

    // Serve from cache instantly
    const cached = socialCache.get(cacheKey);
    if (cached) {
      setResults(cached);
      setErrorMap({});
      setHasAnalyzed(true);
      setFromCache(true);
      setShowAll(false);
      setActiveSection("social");
      setContentDiscovery(contentDiscoveryCache.get(cacheKey) ?? null);
      return;
    }

    setResults({});
    setErrorMap({});
    setError("");
    setShowAll(false);
    setActiveSection("social");
    setHasAnalyzed(true);
    setFromCache(false);
    setContentDiscovery(null);

    // Stagger starts by 400ms each — all run in parallel, avoids rate-limit spike
    await Promise.all(
      ALL_PLATFORMS.map((platform, i) =>
        new Promise<void>(resolve =>
          setTimeout(() => fetchPlatform(platform, kw).then(resolve), i * 400)
        )
      )
    );
  };

  const data = results[activePlatform] ?? null;
  const isActiveLoading = !!loadingMap[activePlatform];
  const totalPosts = data ? (data.sentiment_summary.positive + data.sentiment_summary.neutral + data.sentiment_summary.negative) : 0;
  const visiblePosts = data ? (showAll ? data.posts : data.posts.slice(0, 8)) : [];

  return (
    <div className="view-enter">
      <div className="mb-5">
        <h2 className="font-display text-[1.375rem] font-bold text-slate-900 tracking-tight">Social Listening & Content Discovery</h2>
        <p className="text-[0.875rem] text-slate-500 mt-1">Analyze all platforms at once — switch between results instantly.</p>
      </div>

      <form onSubmit={analyze} className="flex gap-2 mb-5">
        <div className="flex-1 relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <input
            type="text"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder='Enter brand name or keyword (e.g. "cold plunge", "nurses", "weight loss")'
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#6b21d6] focus:ring-1 focus:ring-[#6b21d6] bg-white"
          />
        </div>
        <button type="submit" disabled={anyLoading || !keyword.trim()}
          className="bg-[#6b21d6] hover:bg-[#5b17be] disabled:opacity-60 text-white font-semibold px-5 py-3 rounded-xl text-sm transition flex items-center gap-2 min-w-[120px] justify-center">
          {anyLoading
            ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{doneCount}/{ALL_PLATFORMS.length}</>
            : "Analyze All"}
        </button>
      </form>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>}

      {fromCache && hasAnalyzed && (
        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-500 mb-4">
          <span>Loaded from cache — results for <strong>{keyword.trim()}</strong></span>
          <button onClick={() => { const k = keyword.trim().toLowerCase(); socialCache.delete(k); contentDiscoveryCache.delete(k); setResults({}); setContentDiscovery(null); setHasAnalyzed(false); setFromCache(false); }}
            className="text-[#6b21d6] font-semibold hover:underline ml-3">Reload fresh</button>
        </div>
      )}

      {/* Platform tabs — visible once Analyze All has been clicked */}
      {hasAnalyzed && (
        <div className="mb-5">
          <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-2">Platform</p>
          <div className="flex gap-2 flex-wrap">
            {PLATFORMS.map(p => {
              const isLoading = !!loadingMap[p.key];
              const isDone = !!results[p.key];
              const isFailed = !!errorMap[p.key] && !isLoading;
              const isActive = activePlatform === p.key;
              const isClickable = isDone || isFailed;
              return (
                <button
                  key={p.key}
                  onClick={() => {
                    setActivePlatform(p.key);
                    setShowAll(false);
                    setActiveSection("social");
                    if (isFailed) fetchPlatform(p.key, keyword.trim());
                  }}
                  disabled={!isClickable && !isLoading}
                  title={isFailed ? "Failed — click to retry" : undefined}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition
                    ${isActive ? p.activePill : isFailed ? "bg-red-50 text-red-600 border-red-300" : p.pill}
                    ${!isClickable && !isLoading ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
                  `}
                >
                  {isLoading
                    ? <span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    : isFailed
                    ? <span className="text-red-500 text-[10px] font-bold">↺</span>
                    : isDone
                    ? <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                    : null
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
          <div className="w-8 h-8 border-4 border-[#f3eef8] border-t-[#6b21d6] rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Analyzing {PLATFORMS.find(p => p.key === activePlatform)?.label} conversations…</p>
        </div>
      )}

      {/* Initial loading state (nothing done yet) */}
      {anyLoading && doneCount === 0 && !isActiveLoading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-8 h-8 border-4 border-[#f3eef8] border-t-[#6b21d6] rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Analyzing all platforms in parallel…</p>
          <p className="text-xs text-slate-400">{doneCount} of {ALL_PLATFORMS.length} complete</p>
        </div>
      )}

      {data && !isActiveLoading && (
        <div className="flex flex-col gap-4 view-enter">

          {data.data_source === "ai" && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-700">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 flex-shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span><strong>AI-powered insights</strong> — Real-time {PLATFORMS.find(p => p.key === activePlatform)?.label} data is not available. Showing Claude-generated analysis based on typical discussions.</span>
            </div>
          )}

          {/* Section toggle */}
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
            <button onClick={() => setActiveSection("social")}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition
                ${activeSection === "social" ? "bg-white text-[#6b21d6] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Social Listening
            </button>
            <button onClick={() => setActiveSection("content")}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition
                ${activeSection === "content" ? "bg-white text-[#6b21d6] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              Content Discovery
            </button>
          </div>

          {/* ── SOCIAL LISTENING ── */}
          {activeSection === "social" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-4">Sentiment Overview</p>
                  <div className="flex items-center gap-3 mb-4">
                    <SentimentIcon overall={data.sentiment_summary.overall} />
                    <div>
                      <p className="font-bold text-slate-900 capitalize">{data.sentiment_summary.overall} overall</p>
                      <p className="text-xs text-slate-400">{totalPosts > 0 ? `${totalPosts} posts analyzed` : "AI-estimated sentiment"}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <SentimentBar label="Positive" count={data.sentiment_summary.positive} total={totalPosts || 100} color="bg-green-500" />
                    <SentimentBar label="Neutral"  count={data.sentiment_summary.neutral}  total={totalPosts || 100} color="bg-slate-400" />
                    <SentimentBar label="Negative" count={data.sentiment_summary.negative} total={totalPosts || 100} color="bg-red-500" />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex-1">
                    <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-3">Key Themes</p>
                    <div className="flex flex-wrap gap-1.5">
                      {data.key_themes.map((t, i) => (
                        <span key={i} className="text-xs font-semibold bg-[#f3eef8] text-[#6b21d6] px-2.5 py-1 rounded-full">{t}</span>
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
              </div>

              <div className="bg-[#faf8ff] border border-[#c4a8e8] rounded-2xl p-4">
                <p className="text-[0.6875rem] font-semibold text-[#6b21d6] uppercase tracking-[0.1em] mb-2">AI Summary</p>
                <p className="text-sm text-slate-700 leading-relaxed">{data.sentiment_summary.summary}</p>
              </div>

              {data.opportunities.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-3">Marketing Opportunities</p>
                  <ul className="space-y-2">
                    {data.opportunities.map((o, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="text-green-500 font-bold mt-0.5 flex-shrink-0">→</span>{o}
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
                              className="text-sm font-semibold text-slate-800 hover:text-[#6b21d6] hover:underline line-clamp-2 underline-offset-2">
                              {post.title}
                            </a>
                            {post.key_insight && (
                              <p className="text-xs text-slate-500 mt-1 italic">{post.key_insight}</p>
                            )}
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                              <span className={`font-semibold ${COMMUNITY_STYLE[activePlatform].split(" ")[1]}`}>
                                {activePlatform === "reddit" ? `r/${post.subreddit}` : activePlatform === "hackernews" ? `by ${post.subreddit}` : post.subreddit}
                              </span>
                              <span>↑ {post.score}</span>
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
                      <button onClick={() => setShowAll(true)} className="text-sm text-[#6b21d6] font-semibold hover:underline">
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
                <div className="w-8 h-8 border-4 border-[#f3eef8] border-t-[#6b21d6] rounded-full animate-spin" />
                <p className="text-sm text-slate-500">Generating content strategy…</p>
              </div>
            ) : contentDiscovery ? (
              <div className="flex flex-col gap-4">
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
                          <span className="w-1.5 h-1.5 rounded-full bg-[#6b21d6]" />{f}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-3">Best Content Angles</p>
                    <ul className="space-y-1.5">
                      {(contentDiscovery.best_angles ?? []).map((a, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                          <span className="text-[#6b21d6] font-bold flex-shrink-0">→</span>{a}
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
                        <span key={i} className="text-xs font-semibold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">{t}</span>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-3">Content Gaps (Opportunities)</p>
                    <ul className="space-y-1.5">
                      {(contentDiscovery.content_gaps ?? []).map((g, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                          <span className="text-green-500 font-bold flex-shrink-0">+</span>{g}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#f3eef8] flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#6b21d6" strokeWidth="2" className="w-7 h-7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">Generate Content Strategy</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">Discover what content formats and angles work best for <strong>{keyword.trim()}</strong> across all platforms.</p>
                </div>
                <button
                  onClick={() => fetchContentDiscovery(keyword.trim())}
                  className="bg-[#6b21d6] hover:bg-[#5b17be] text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition">
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
