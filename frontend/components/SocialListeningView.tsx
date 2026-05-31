"use client";
import { useState } from "react";

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

interface ListenData {
  posts: Post[];
  sentiment_summary: SentimentSummary;
  top_subreddits: string[];
  key_themes: string[];
  opportunities: string[];
}

const SENTIMENT_STYLES = {
  positive: "bg-green-50 text-green-700 border-green-200",
  neutral:  "bg-slate-100 text-slate-600 border-slate-200",
  negative: "bg-red-50 text-red-600 border-red-200",
};

const SENTIMENT_DOT = {
  positive: "bg-green-500",
  neutral:  "bg-slate-400",
  negative: "bg-red-500",
};

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

export default function SocialListeningView() {
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ListenData | null>(null);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);

  const listen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    setLoading(true);
    setError("");
    setData(null);
    setShowAll(false);
    try {
      const res = await fetch("/api/social/listen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim() }),
      });
      const json = await res.json();
      if (json.error) setError(json.error);
      else setData(json);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const totalPosts = data ? (data.sentiment_summary.positive + data.sentiment_summary.neutral + data.sentiment_summary.negative) : 0;
  const visiblePosts = data ? (showAll ? data.posts : data.posts.slice(0, 8)) : [];

  return (
    <div className="view-enter">
      <div className="mb-6">
        <h2 className="font-display text-[1.375rem] font-bold text-slate-900 tracking-tight">Social Listening</h2>
        <p className="text-[0.875rem] text-slate-500 mt-1">Monitor Reddit conversations — sentiment, themes, and marketing opportunities around any keyword.</p>
      </div>

      <form onSubmit={listen} className="flex gap-2 mb-6">
        <div className="flex-1 relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <input
            type="text"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder='Enter brand name or keyword (e.g. "cold plunge", "Hims")'
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#6b21d6] focus:ring-1 focus:ring-[#6b21d6] bg-white"
          />
        </div>
        <button type="submit" disabled={loading || !keyword.trim()}
          className="bg-[#6b21d6] hover:bg-[#5b17be] disabled:opacity-50 text-white font-semibold px-5 py-3 rounded-xl text-sm transition flex items-center gap-2">
          {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
          {loading ? "Listening…" : "Listen"}
        </button>
      </form>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>}

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-4 border-[#f3eef8] border-t-[#6b21d6] rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Scanning Reddit and analyzing sentiment…</p>
        </div>
      )}

      {data && !loading && (
        <div className="flex flex-col gap-4 view-enter">
          {/* Sentiment Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-4">Sentiment Overview</p>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${data.sentiment_summary.overall === "positive" ? "bg-green-50" : data.sentiment_summary.overall === "negative" ? "bg-red-50" : "bg-slate-100"}`}>
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className={`w-7 h-7 ${data.sentiment_summary.overall === "positive" ? "stroke-green-500" : data.sentiment_summary.overall === "negative" ? "stroke-red-500" : "stroke-slate-400"}`}>
                    {data.sentiment_summary.overall === "positive"
                      ? <><circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></>
                      : data.sentiment_summary.overall === "negative"
                      ? <><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></>
                      : <><circle cx="12" cy="12" r="10"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></>
                    }
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-slate-900 capitalize">{data.sentiment_summary.overall} overall</p>
                  <p className="text-xs text-slate-400">{totalPosts} posts analyzed</p>
                </div>
              </div>
              <div className="space-y-2">
                <SentimentBar label="Positive" count={data.sentiment_summary.positive} total={totalPosts} color="bg-green-500" />
                <SentimentBar label="Neutral"  count={data.sentiment_summary.neutral}  total={totalPosts} color="bg-slate-400" />
                <SentimentBar label="Negative" count={data.sentiment_summary.negative} total={totalPosts} color="bg-red-500" />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {/* Key Themes */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex-1">
                <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-3">Key Themes</p>
                <div className="flex flex-wrap gap-1.5">
                  {data.key_themes.map((t, i) => (
                    <span key={i} className="text-xs font-semibold bg-[#f3eef8] text-[#6b21d6] px-2.5 py-1 rounded-full">{t}</span>
                  ))}
                </div>
              </div>
              {/* Top Subreddits */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-3">Top Subreddits</p>
                <div className="flex flex-wrap gap-1.5">
                  {data.top_subreddits.map((s, i) => (
                    <a key={i} href={`https://reddit.com/r/${s}`} target="_blank" rel="noopener noreferrer"
                      className="text-xs font-semibold bg-orange-50 text-orange-700 px-2.5 py-1 rounded-full hover:bg-orange-100 transition">
                      r/{s}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-[#faf8ff] border border-[#c4a8e8] rounded-2xl p-4">
            <p className="text-[0.6875rem] font-semibold text-[#6b21d6] uppercase tracking-[0.1em] mb-2">AI Summary</p>
            <p className="text-sm text-slate-700 leading-relaxed">{data.sentiment_summary.summary}</p>
          </div>

          {/* Opportunities */}
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

          {/* Posts */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
              <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em]">Recent Discussions ({data.posts.length})</p>
            </div>
            <div className="divide-y divide-slate-50">
              {visiblePosts.map((post, i) => (
                <div key={i} className="px-5 py-4 hover:bg-slate-50 transition">
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-bold border ${SENTIMENT_STYLES[post.sentiment]}`}>
                      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${SENTIMENT_DOT[post.sentiment]}`} />
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
                        <span className="text-orange-600 font-semibold">r/{post.subreddit}</span>
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
        </div>
      )}
    </div>
  );
}
