"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import type { Keyword } from "@/lib/types";

type VolumeTier = "high" | "medium" | "low";

interface TrendingTopic {
  title: string;
  traffic: string;
  picture: string;
  newsTitle: string;
  newsUrl: string;
  newsSource: string;
}

interface TopKeyword {
  keyword: string;
  category: string;
  monthly_volume: string;
  trend: "rising" | "stable" | "declining";
}

const COUNTRIES = [
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "KR", name: "South Korea", flag: "🇰🇷" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "DO", name: "Dominican Republic", flag: "🇩🇴" },
  { code: "CO", name: "Colombia", flag: "🇨🇴" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtVol(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return `${n}`;
}

// ── Large trend chart ─────────────────────────────────────────────────────────
interface TimePoint { date: string; value: number }

function LargeChart({ timeline, height = 220 }: { timeline: TimePoint[]; height?: number }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  if (!timeline.length) return (
    <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No data available</div>
  );

  const W = 800, H = height;
  const PAD = { top: 12, right: 16, bottom: 36, left: 50 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;

  const maxVal = Math.max(...timeline.map(d => d.value), 1);
  const xS = (i: number) => PAD.left + (i / Math.max(timeline.length - 1, 1)) * iW;
  const yS = (v: number) => PAD.top + iH - (Math.min(v, maxVal) / maxVal) * iH;

  const linePts = timeline.map((d, i) => `${xS(i)},${yS(d.value)}`).join(" ");
  const areaPts = `${xS(0)},${yS(0)} ${linePts} ${xS(timeline.length - 1)},${yS(0)}`;

  // Y-axis: 5 ticks scaled to real volume
  const yTicks = [0, 0.25, 0.5, 0.75, 1.0].map(f => Math.round(f * maxVal));

  // X-axis: 5 evenly spaced labels, no forced endpoints to avoid overlap
  const labelCount = Math.min(5, timeline.length);
  const xLabels = Array.from({ length: labelCount }, (_, j) => {
    const i = Math.round(j * (timeline.length - 1) / Math.max(labelCount - 1, 1));
    return { i, date: timeline[i].date };
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    const fraction = Math.max(0, Math.min(1, (svgX - PAD.left) / iW));
    setHoverIdx(Math.round(fraction * (timeline.length - 1)));
  };

  const hoveredPt = hoverIdx !== null ? timeline[hoverIdx] : null;

  return (
    <div ref={wrapRef} className="relative select-none" onMouseMove={handleMouseMove} onMouseLeave={() => setHoverIdx(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
        <defs>
          <linearGradient id="gt-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#275fe8" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#275fe8" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines + Y labels (real volume) */}
        {yTicks.map(v => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={yS(v)} y2={yS(v)} stroke="#e2e8f0" strokeWidth="1" />
            <text x={PAD.left - 6} y={yS(v) + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{fmtVol(v)}</text>
          </g>
        ))}

        {/* Area fill */}
        <polygon points={areaPts} fill="url(#gt-fill)" />

        {/* Line */}
        <polyline points={linePts} fill="none" stroke="#275fe8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Hover crosshair + dot */}
        {hoverIdx !== null && hoveredPt && (
          <g>
            <line
              x1={xS(hoverIdx)} x2={xS(hoverIdx)}
              y1={PAD.top} y2={yS(0)}
              stroke="#275fe8" strokeWidth="1" strokeDasharray="3,3" opacity="0.5"
            />
            <circle cx={xS(hoverIdx)} cy={yS(hoveredPt.value)} r="4.5" fill="white" stroke="#275fe8" strokeWidth="2" />
          </g>
        )}

        {/* X-axis labels */}
        {xLabels.map(({ i, date }) => (
          <text key={i} x={xS(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="#94a3b8">{date}</text>
        ))}

        {/* Baseline */}
        <line x1={PAD.left} x2={W - PAD.right} y1={yS(0)} y2={yS(0)} stroke="#cbd5e1" strokeWidth="1" />
      </svg>

      {/* Hover tooltip */}
      {hoverIdx !== null && hoveredPt && (() => {
        const xPct = (xS(hoverIdx) / W) * 100;
        const toLeft = xPct > 60;
        return (
          <div
            className="absolute top-1 pointer-events-none z-10"
            style={{
              left: `${xPct}%`,
              transform: toLeft ? "translateX(calc(-100% - 10px))" : "translateX(10px)",
            }}
          >
            <div className="bg-slate-800 text-white rounded-xl px-3 py-2.5 text-xs shadow-xl whitespace-nowrap border border-slate-700">
              <div className="text-slate-300 mb-1">{hoveredPt.date}</div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#275fe8] flex-shrink-0" />
                <span className="font-bold text-white text-sm">~{fmtVol(hoveredPt.value)}</span>
                <span className="text-slate-400 text-xs">searches/mo</span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Detail modal ──────────────────────────────────────────────────────────────
function TrendDetailModal({ keyword, geo, onClose, onDrillDown }: { keyword: string; geo: string; onClose: () => void; onDrillDown: (kw: string) => void }) {
  const [timeRange, setTimeRange] = useState<"6m" | "1y" | "5y">("1y");
  const [timeline, setTimeline]           = useState<TimePoint[]>([]);
  const [relatedQueries, setRelatedQueries] = useState<{ query: string; value: number }[]>([]);
  const [risingQueries, setRisingQueries]  = useState<string[]>([]);
  const [regions, setRegions]             = useState<{ region: string; value: number }[]>([]);
  const [currentMonthly, setCurrentMonthly] = useState(0);
  const [yoyGrowth, setYoyGrowth]         = useState(0);
  const [loading, setLoading]             = useState(true);
  const [socialMentions, setSocialMentions] = useState<{
    summary: string; themes: string[];
    posts: Array<{ title: string; url: string; score: number; num_comments: number }>;
    pos: number; neu: number; neg: number;
    opportunities: string[];
    communities: string[];
  } | null>(null);
  const [socialLoading, setSocialLoading] = useState(true);
  const [ytVideos, setYtVideos] = useState<Array<{ id: string; title: string; channel: string; thumbnail: string; url: string }>>([]);
  const [ytLoading, setYtLoading] = useState(true);
  const [ytNoKey, setYtNoKey] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/trends/detail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword, geo, timeRange }),
    })
      .then(r => r.json())
      .then(d => {
        if (!cancelled) {
          setTimeline(d.timeline ?? []);
          setRelatedQueries(d.related_queries ?? []);
          setRisingQueries(d.rising_queries ?? []);
          setRegions(d.regions ?? []);
          setCurrentMonthly(d.current_monthly ?? 0);
          setYoyGrowth(d.yoy_growth ?? 0);
          setLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [keyword, geo, timeRange]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setSocialLoading(true);
    setSocialMentions(null);
    fetch("/api/social/listen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword, platform: "hackernews" }),
    })
      .then(r => r.json())
      .then(d => {
        if (!cancelled) {
          setSocialMentions({
            summary: d.sentiment_summary?.summary ?? "",
            themes: d.key_themes ?? [],
            posts: (d.posts ?? []).slice(0, 4).map((p: { title: string; url: string; score: number; num_comments: number }) => ({
              title: p.title, url: p.url, score: p.score, num_comments: p.num_comments,
            })),
            pos: d.sentiment_summary?.positive ?? 33,
            neu: d.sentiment_summary?.neutral ?? 44,
            neg: d.sentiment_summary?.negative ?? 23,
            opportunities: d.opportunities ?? [],
            communities: d.top_communities ?? [],
          });
          setSocialLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setSocialLoading(false); });
    return () => { cancelled = true; };
  }, [keyword]);

  useEffect(() => {
    let cancelled = false;
    setYtLoading(true);
    setYtVideos([]);
    setYtNoKey(false);
    fetch("/api/trends/youtube-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword }),
    })
      .then(r => r.json())
      .then(d => {
        if (!cancelled) {
          setYtNoKey(!!d.no_key);
          setYtVideos(d.videos ?? []);
          setYtLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setYtLoading(false); });
    return () => { cancelled = true; };
  }, [keyword]);

  const maxRegionVal = Math.max(...regions.map(r => r.value), 1);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-md" onClick={onClose} />
      {/* Modal — always centered in viewport */}
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 pointer-events-none">
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto pointer-events-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <button
            onClick={() => onDrillDown(keyword)}
            className="flex items-center gap-2 bg-[#eff6ff] border border-[#bfdbfe] rounded-full px-4 py-1.5 hover:bg-[#ede5f6] transition group"
            title="Search this keyword in Trends"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#275fe8] flex-shrink-0" />
            <span className="text-sm font-bold text-[#275fe8]">{keyword}</span>
            {/* search icon */}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-[#275fe8] opacity-50 group-hover:opacity-100 transition"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </button>
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              {(["6m", "1y", "5y"] as const).map(r => (
                <button key={r} onClick={() => setTimeRange(r)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${timeRange === r ? "bg-white text-[#275fe8] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                  {r === "6m" ? "6 Months" : r === "1y" ? "1 Year" : "5 Years"}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        {/* Stats row */}
        {!loading && (
          <div className="flex items-center gap-6 px-6 pt-4 pb-2">
            {currentMonthly > 0 && (
              <div>
                <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em]">Monthly searches</p>
                <p className="text-2xl font-bold text-[#275fe8] mt-0.5">~{fmtVol(currentMonthly)}</p>
                <p className="text-xs text-slate-400">est. · {geo === "US" ? "United States" : geo || "Worldwide"}</p>
              </div>
            )}
            {yoyGrowth !== 0 && (
              <div>
                <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em]">YoY growth</p>
                <p className={`text-2xl font-bold mt-0.5 ${yoyGrowth >= 0 ? "text-[#275fe8]" : "text-red-500"}`}>
                  {yoyGrowth >= 0 ? "+" : ""}{yoyGrowth}%
                </p>
                <p className="text-xs text-slate-400">vs. prior year</p>
              </div>
            )}
            <div className="ml-auto text-right">
              <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em]">Period</p>
              <p className="text-sm font-semibold text-slate-700 mt-0.5">{timeRange === "6m" ? "Past 6 months" : timeRange === "1y" ? "Past year" : "Past 5 years"}</p>
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="px-6 pt-2 pb-4">
          <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-2">Monthly search volume over time</p>
          {loading ? (
            <div className="flex items-center justify-center h-56 gap-2">
              <div className="w-5 h-5 border-4 border-[#eff6ff] border-t-[#275fe8] rounded-full animate-spin" />
              <span className="text-sm text-slate-400">Loading trend data…</span>
            </div>
          ) : (
            <LargeChart timeline={timeline} height={260} />
          )}
        </div>

        {/* People Also Search + Interest by Region */}
        {!loading && (relatedQueries.length > 0 || regions.length > 0) && (
          <div className="grid grid-cols-2 gap-0 border-t border-slate-100">
            {/* People Also Search */}
            {relatedQueries.length > 0 && (
              <div className="px-6 py-5 border-r border-slate-100">
                <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-4">People Also Search</p>
                <div className="space-y-2.5">
                  {relatedQueries.slice(0, 10).map((q, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(q.query)}`}
                          target="_blank" rel="noopener noreferrer"
                          className="text-sm text-slate-700 hover:text-[#275fe8] hover:underline underline-offset-2 truncate max-w-[200px]"
                        >
                          {q.query}
                        </a>
                        <span className="text-xs text-slate-400 ml-2 flex-shrink-0">{q.value}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#275fe8] rounded-full" style={{ width: `${q.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Interest by Region */}
            {regions.length > 0 && (
              <div className="px-6 py-5">
                <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-4">Interest by Region</p>
                <div className="space-y-2.5">
                  {regions.map((r, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-300 w-4 text-right">{i + 1}</span>
                          <span className="text-sm text-slate-700">{r.region}</span>
                        </span>
                        <span className="text-xs text-slate-400 ml-2 flex-shrink-0">{r.value}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden ml-6">
                        <div className="h-full bg-[#275fe8] rounded-full" style={{ width: `${(r.value / maxRegionVal) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rising searches */}
        {!loading && risingQueries.length > 0 && (
          <div className="px-6 pb-6 pt-4 border-t border-slate-100">
            <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-3">Rising searches</p>
            <div className="flex flex-wrap gap-2">
              {risingQueries.map((q, i) => (
                <a key={i}
                  href={`https://www.google.com/search?q=${encodeURIComponent(q)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs font-semibold bg-[#eff6ff] text-[#275fe8] px-3 py-1.5 rounded-full hover:bg-[#dbeafe] transition flex items-center gap-1"
                >
                  <span className="text-[#275fe8]">↑</span> {q}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Social mentions + Content Opportunities */}
        <div className="border-t border-slate-100 px-6 py-5">
          <div className="flex items-center gap-2 mb-4">
            <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em]">Social Mentions</p>
            <span className="text-[0.6875rem] text-slate-300">· HackerNews</span>
          </div>
          {socialLoading ? (
            <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
              <div className="w-3.5 h-3.5 border-2 border-slate-200 border-t-[#275fe8] rounded-full animate-spin flex-shrink-0" />
              Loading social data…
            </div>
          ) : socialMentions ? (
            <div className="space-y-4">
              {/* Sentiment bar */}
              <div>
                <div className="flex h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#275fe8] transition-all" style={{ width: `${socialMentions.pos}%` }} />
                  <div className="bg-slate-200 transition-all" style={{ width: `${socialMentions.neu}%` }} />
                  <div className="bg-red-400 transition-all" style={{ width: `${socialMentions.neg}%` }} />
                </div>
                <div className="flex flex-wrap gap-4 mt-1.5 text-[0.6875rem] text-slate-400">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#275fe8] flex-shrink-0" />{socialMentions.pos}% positive</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-200 flex-shrink-0" />{socialMentions.neu}% neutral</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />{socialMentions.neg}% negative</span>
                </div>
              </div>
              {socialMentions.summary && (
                <p className="text-sm text-slate-600 leading-relaxed">{socialMentions.summary}</p>
              )}
              {socialMentions.themes.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {socialMentions.themes.map((t, i) => (
                    <span key={i} className="text-xs bg-[#eff6ff] text-[#275fe8] font-semibold px-2.5 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
              )}
              {socialMentions.posts.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[0.6875rem] text-slate-400 font-semibold">HackerNews discussions</p>
                  {socialMentions.posts.map((post, i) => (
                    <a key={i} href={post.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-100 hover:border-[#bfdbfe] hover:bg-[#f0f7ff] transition group">
                      <span className="text-orange-500 font-bold text-sm flex-shrink-0 mt-px">Y</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 group-hover:text-[#275fe8] line-clamp-2">{post.title}</p>
                        <div className="flex gap-3 mt-0.5 text-[0.6875rem] text-slate-400">
                          <span>▲ {post.score}</span>
                          <span>{post.num_comments} comments</span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}

              {/* Platform content */}
              <div className="border-t border-slate-100 pt-4 space-y-4">
                <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em]">Content Being Created</p>

                {/* Platform search buttons */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "TikTok", color: "bg-black text-white", url: `https://www.tiktok.com/search?q=${encodeURIComponent(keyword)}`, icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.2 8.2 0 0 0 4.79 1.52V6.78a4.85 4.85 0 0 1-1.02-.09z"/></svg> },
                    { label: "Instagram", color: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 text-white", url: `https://www.instagram.com/explore/search/keyword/${encodeURIComponent(keyword)}/`, icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/></svg> },
                    { label: "LinkedIn", color: "bg-[#0077b5] text-white", url: `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(keyword)}`, icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg> },
                    { label: "YouTube", color: "bg-red-600 text-white", url: `https://www.youtube.com/results?search_query=${encodeURIComponent(keyword)}`, icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/></svg> },
                  ].map(p => (
                    <a key={p.label} href={p.url} target="_blank" rel="noopener noreferrer"
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl font-semibold text-xs transition opacity-90 hover:opacity-100 ${p.color}`}>
                      {p.icon}
                      Search &quot;{keyword.length > 20 ? keyword.slice(0, 20) + "…" : keyword}&quot; on {p.label}
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3 ml-auto flex-shrink-0"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    </a>
                  ))}
                </div>

                {/* YouTube videos */}
                {ytLoading ? (
                  <div className="flex items-center gap-2 text-slate-400 text-xs py-1">
                    <div className="w-3 h-3 border-2 border-slate-200 border-t-red-500 rounded-full animate-spin flex-shrink-0" />
                    Loading YouTube videos…
                  </div>
                ) : !ytNoKey && ytVideos.length > 0 ? (
                  <div>
                    <p className="text-[0.6875rem] text-slate-400 font-semibold mb-2">Top YouTube videos</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {ytVideos.map(v => (
                        <a key={v.id} href={v.url} target="_blank" rel="noopener noreferrer"
                          className="group rounded-xl overflow-hidden border border-slate-100 hover:border-red-200 hover:shadow-md transition">
                          <div className="relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={v.thumbnail || `https://img.youtube.com/vi/${v.id}/mqdefault.jpg`} alt={v.title} className="w-full aspect-video object-cover" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition flex items-center justify-center">
                              <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-lg">
                                <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4 ml-0.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                              </div>
                            </div>
                          </div>
                          <div className="p-2">
                            <p className="text-xs font-semibold text-slate-800 line-clamp-2 group-hover:text-red-600 transition leading-tight">{v.title}</p>
                            <p className="text-[0.625rem] text-slate-400 mt-0.5 truncate">{v.channel}</p>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                ) : ytNoKey ? (
                  <p className="text-[0.6875rem] text-slate-400">Add <code className="bg-slate-100 px-1 rounded">YOUTUBE_API_KEY</code> to env vars to show real YouTube videos here.</p>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">No social data available.</p>
          )}
        </div>
      </div>
      </div>
    </>
  );
}
type TrendDir   = "rising" | "stable" | "declining";

interface AIKeyword {
  keyword: string;
  trend: TrendDir;
  growth: number;
  volume: VolumeTier;
}

interface RealTrend {
  keyword: string;
  sparkline: number[];
  growth_pct: number;
  current_interest: number;
  rising_queries: string[];
}

interface Row extends AIKeyword {
  real?: RealTrend;
}

const CATEGORIES = [
  { name: "Food & Beverage",          desc: "Recipes, ingredients & food trends" },
  { name: "Health & Wellness",        desc: "Fitness, supplements & longevity" },
  { name: "Technology & AI",          desc: "Software, AI tools & digital trends" },
  { name: "Fashion & Apparel",        desc: "Clothing, accessories & style" },
  { name: "Home & Garden",            desc: "Interior design, renovation & plants" },
  { name: "Beauty & Skincare",        desc: "Skincare, makeup & hair care" },
  { name: "Finance & Investing",      desc: "Investing, budgeting & fintech" },
  { name: "Education & Courses",      desc: "Online learning, skills & training" },
  { name: "Sports & Fitness",         desc: "Workouts, gear & athletics" },
  { name: "Travel & Hospitality",     desc: "Destinations, experiences & tourism" },
  { name: "Marketing & Growth",       desc: "SEO, social media & brand building" },
  { name: "Real Estate",              desc: "Buying, selling & property trends" },
  { name: "E-commerce & Retail",      desc: "Shopping, products & consumer trends" },
  { name: "Parenting & Family",       desc: "Childcare, education & family life" },
  { name: "Legal & Professional",     desc: "Law, consulting & B2B services" },
  { name: "Automotive",               desc: "Cars, EVs & maintenance trends" },
  { name: "Gaming & Esports",         desc: "Video games, streaming & tournaments" },
  { name: "Mental Health",            desc: "Therapy, mindfulness & self-care" },
  { name: "Sustainability & Eco",     desc: "Green living, climate & clean energy" },
  { name: "Business & Entrepreneurship", desc: "Startups, SaaS & business strategy" },
  { name: "Pets & Animals",           desc: "Pet care, training & accessories" },
  { name: "Music & Entertainment",    desc: "Artists, streaming & live events" },
  { name: "DIY & Crafts",             desc: "Maker culture, crafting & hobbies" },
  { name: "Art & Design",             desc: "Visual art, UX/UI & creative tools" },
  { name: "Crypto & Web3",            desc: "Bitcoin, DeFi & blockchain trends" },
  { name: "Food Delivery & Dining",   desc: "Restaurants, delivery & food tech" },
];

const PAGE_SIZE = 20;

// ── Micro components ──────────────────────────────────────────────────────────
function Sparkline({ data, growth }: { data: number[]; growth: number }) {
  if (data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const W = 90, H = 28;
  const pts = data.map((v, i) =>
    `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * (H - 4) - 2}`
  ).join(" ");
  const color = growth >= 0 ? "#10b981" : "#ef4444";
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={W} cy={H - ((data[data.length - 1] - min) / range) * (H - 4) - 2} r="2.5" fill={color} />
    </svg>
  );
}

function TrendArrow({ trend }: { trend: TrendDir }) {
  if (trend === "rising")   return <span className="text-emerald-500 font-bold text-base">↑</span>;
  if (trend === "declining")return <span className="text-red-500 font-bold text-base">↓</span>;
  return <span className="text-slate-400 font-bold text-base">→</span>;
}

function GrowthBadge({ pct, estimated }: { pct: number; estimated?: boolean }) {
  const up = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2.5 py-1 rounded-full ${up ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"} ${estimated ? "opacity-70" : ""}`}>
      {up ? "▲" : "▼"} {Math.abs(pct)}%{estimated ? <span className="font-normal opacity-70 ml-0.5">est</span> : null}
    </span>
  );
}

function VolumeBadge({ tier }: { tier: VolumeTier }) {
  const map = { high: "bg-blue-100 text-blue-700", medium: "bg-blue-50 text-blue-700", low: "bg-slate-100 text-slate-500" };
  return <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${map[tier]}`}>{tier}</span>;
}

function SparklineSkeleton() {
  return <div className="w-[90px] h-[28px] bg-slate-100 rounded animate-pulse" />;
}

const SELECT_STYLE = {
  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2394a3b8'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat" as const,
  backgroundPosition: "right 8px center",
};

function CardSkeleton() {
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-3 animate-pulse h-[76px]">
      <div className="w-16 h-2.5 bg-slate-100 rounded mb-2.5" />
      <div className="w-3/4 h-3.5 bg-slate-100 rounded mb-1.5" />
      <div className="w-1/3 h-2.5 bg-slate-100 rounded" />
    </div>
  );
}

// ── Category home ─────────────────────────────────────────────────────────────
function CategoryHome({
  onSelect,
  onSearch,
  geo,
  onGeoChange,
}: {
  onSelect: (c: string) => void;
  onSearch: (q: string) => void;
  geo: string;
  onGeoChange: (g: string) => void;
}) {
  const [q, setQ] = useState("");
  const [topTab, setTopTab] = useState<"trending" | "volume">("trending");

  const [trending, setTrending] = useState<TrendingTopic[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [trendingError, setTrendingError] = useState(false);

  const [topKeywords, setTopKeywords] = useState<TopKeyword[]>([]);
  const [volumeLoading, setVolumeLoading] = useState(false);
  const [volumeTimeframe, setVolumeTimeframe] = useState<"1m" | "6m" | "1y">("1m");
  const [volumeCacheKey, setVolumeCacheKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setTrendingLoading(true);
    setTrendingError(false);
    fetch(`/api/trends/trending-now?geo=${geo}`)
      .then(r => r.json())
      .then(d => {
        if (!cancelled) {
          setTrending(d.topics ?? []);
          setTrendingError(!d.topics?.length);
          setTrendingLoading(false);
        }
      })
      .catch(() => { if (!cancelled) { setTrendingError(true); setTrendingLoading(false); } });
    return () => { cancelled = true; };
  }, [geo]);

  useEffect(() => {
    if (topTab !== "volume") return;
    const key = `${geo}-${volumeTimeframe}`;
    if (volumeCacheKey === key) return;
    let cancelled = false;
    setVolumeLoading(true);
    setTopKeywords([]);
    fetch(`/api/trends/top-keywords?geo=${geo}&timeframe=${volumeTimeframe}`)
      .then(r => r.json())
      .then(d => {
        if (!cancelled) {
          setTopKeywords(d.keywords ?? []);
          setVolumeCacheKey(key);
          setVolumeLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setVolumeLoading(false); });
    return () => { cancelled = true; };
  }, [topTab, geo, volumeTimeframe, volumeCacheKey]);

  const currentCountry = COUNTRIES.find(c => c.code === geo);

  return (
    <div>
      {/* Search bar */}
      <form onSubmit={e => { e.preventDefault(); if (q.trim()) onSearch(q.trim()); }} className="flex gap-2 mb-8">
        <div className="flex-1 relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder='Explore any keyword (e.g. "mushroom coffee", "cold plunge")'
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#275fe8] focus:ring-1 focus:ring-[#275fe8] bg-white"
          />
        </div>
        <button type="submit" className="bg-[#275fe8] hover:bg-[#1a4fd0] text-white font-semibold px-5 py-3 rounded-xl text-sm transition">
          Explore
        </button>
      </form>

      {/* Top Keywords section */}
      <div className="mb-10">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Tab toggle */}
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => setTopTab("trending")}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${topTab === "trending" ? "bg-white text-[#275fe8] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                Trending Today
              </button>
              <button
                onClick={() => setTopTab("volume")}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${topTab === "volume" ? "bg-white text-[#275fe8] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                Highest Volume
              </button>
            </div>

            {/* Timeframe toggle — only for volume tab */}
            {topTab === "volume" && (
              <div className="flex bg-slate-100 rounded-lg p-0.5">
                {(["1m", "6m", "1y"] as const).map(tf => (
                  <button
                    key={tf}
                    onClick={() => setVolumeTimeframe(tf)}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition ${volumeTimeframe === tf ? "bg-white text-[#275fe8] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    {tf === "1m" ? "This Month" : tf === "6m" ? "6 Months" : "This Year"}
                  </button>
                ))}
              </div>
            )}

            {/* Country selector */}
            <select
              value={geo}
              onChange={e => { onGeoChange(e.target.value); setVolumeCacheKey(null); }}
              className="text-xs font-semibold bg-white border border-slate-200 rounded-lg pl-2 pr-7 py-1.5 text-slate-700 focus:outline-none focus:border-[#275fe8] cursor-pointer appearance-none"
              style={SELECT_STYLE}
            >
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
              ))}
            </select>
          </div>

          {topTab === "trending" ? (
            <span className="text-[0.6875rem] text-slate-400 flex items-center gap-1">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              Google Trends · refreshes every 5 min
            </span>
          ) : (
            <span className="text-[0.6875rem] text-slate-400 flex items-center gap-1">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              AI estimates · cached 1 hr
            </span>
          )}
        </div>

        {/* Trending Today grid */}
        {topTab === "trending" && (
          trendingLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {Array.from({ length: 10 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : trendingError ? (
            <div className="text-sm text-slate-400 bg-white border border-slate-100 rounded-xl px-4 py-3">
              Could not load trending topics for {currentCountry?.name ?? geo}. Try a different country or search above.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {trending.map((t, i) => (
                <button
                  key={i}
                  onClick={() => onSearch(t.title)}
                  className="group text-left bg-white border border-slate-100 rounded-xl p-3 hover:border-[#275fe8] hover:bg-[#f0f7ff] transition-all duration-150 hover:shadow-sm"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-[1rem] font-black text-slate-200 leading-none w-5 text-right flex-shrink-0 group-hover:text-[#bfdbfe] transition-colors">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-800 text-xs leading-snug group-hover:text-[#275fe8] transition-colors line-clamp-2">{t.title}</p>
                      {t.traffic && (
                        <p className="text-[0.625rem] text-slate-400 mt-0.5 font-medium">{t.traffic} searches</p>
                      )}
                      {t.newsTitle && (
                        <p className="text-[0.625rem] text-slate-500 mt-1 leading-tight line-clamp-1 hidden sm:block">{t.newsTitle}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )
        )}

        {/* Highest Volume grid */}
        {topTab === "volume" && (
          volumeLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {Array.from({ length: 12 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : topKeywords.length === 0 ? (
            <div className="text-sm text-slate-400 bg-white border border-slate-100 rounded-xl px-4 py-3">
              Could not load keyword data. Try again or search above.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {topKeywords.map((kw, i) => {
                const trendIcon = kw.trend === "rising" ? "↑" : kw.trend === "declining" ? "↓" : "→";
                const trendColor = kw.trend === "rising" ? "text-emerald-500" : kw.trend === "declining" ? "text-red-500" : "text-slate-400";
                return (
                  <button
                    key={i}
                    onClick={() => onSearch(kw.keyword)}
                    className="group text-left bg-white border border-slate-100 rounded-xl p-3.5 hover:border-[#275fe8] hover:bg-[#f0f7ff] transition-all duration-150 hover:shadow-sm"
                  >
                    <p className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-[0.1em] mb-1.5 truncate">{kw.category}</p>
                    <div className="flex items-start justify-between gap-1">
                      <p className="font-bold text-slate-800 text-xs leading-snug group-hover:text-[#275fe8] transition-colors line-clamp-2 flex-1">{kw.keyword}</p>
                      <span className={`text-xs font-bold flex-shrink-0 ml-1 ${trendColor}`}>{trendIcon}</span>
                    </div>
                    {kw.monthly_volume && (
                      <p className="text-[0.625rem] text-slate-400 mt-1 font-medium">{kw.monthly_volume}/mo</p>
                    )}
                  </button>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Categories */}
      <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.12em] mb-4">Browse by category</p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {CATEGORIES.map(cat => (
          <button key={cat.name} onClick={() => onSelect(cat.name)}
            className="text-left border border-slate-200 rounded-xl p-4 bg-white hover:border-[#275fe8] hover:bg-[#f0f7ff] transition-all duration-150 hover:shadow-sm group">
            <p className="font-bold text-slate-800 text-sm group-hover:text-[#275fe8] transition-colors leading-snug">{cat.name}</p>
            <p className="text-xs text-slate-400 mt-1 leading-snug">{cat.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Keyword AI Insights Modal ─────────────────────────────────────────────────
interface KeywordInsightsData {
  summary?: string;
  rising_trends?: string[];
  audience_intent?: string;
  content_opportunities?: string[];
  key_takeaways?: string[];
  suggestions?: string[];
}

function KeywordInsightsModal({ keyword, onClose }: { keyword: string; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<KeywordInsightsData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch("/api/trends/ai-insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword }),
    })
      .then(r => r.json())
      .then(d => {
        if (!cancelled) {
          if (d.error) setError(d.error);
          else setData(d);
          setLoading(false);
        }
      })
      .catch(() => { if (!cancelled) { setError("Failed to load insights."); setLoading(false); } });
    return () => { cancelled = true; };
  }, [keyword]);

  return (
    <>
      <div className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-md" onClick={onClose} />
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] overflow-y-auto pointer-events-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[#275fe8] flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="white" className="w-3.5 h-3.5"><path d="M12 2l2.4 7.4L22 12l-7.6 2.6L12 22l-2.4-7.4L2 12l7.6-2.6z"/></svg>
              </div>
              <div className="min-w-0">
                <p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-slate-400 mb-0.5">AI Insights</p>
                <p className="font-bold text-slate-900 text-sm leading-tight truncate">{keyword}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 transition ml-4 flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-5 space-y-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-7 h-7 border-4 border-[#eff6ff] border-t-[#275fe8] rounded-full animate-spin" />
                <p className="text-sm text-slate-400">Analyzing real search patterns…</p>
              </div>
            ) : error ? (
              <p className="text-sm text-red-500 py-8 text-center">{error}</p>
            ) : data ? (
              <>
                {/* Summary */}
                {data.summary && (
                  <div>
                    <p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-slate-400 mb-2">What&apos;s Happening Now</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{data.summary}</p>
                  </div>
                )}

                {/* Rising Trends */}
                {data.rising_trends && data.rising_trends.length > 0 && (
                  <div>
                    <p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-slate-400 mb-3">Rising Trends</p>
                    <div className="flex flex-wrap gap-2">
                      {data.rising_trends.map((t, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1.5 rounded-full">
                          <span className="text-emerald-500">↑</span> {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Real search signals */}
                {data.suggestions && data.suggestions.length > 0 && (
                  <div>
                    <p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-slate-400 mb-3">Real Search Signals <span className="normal-case font-normal tracking-normal text-slate-300">· Google Autocomplete</span></p>
                    <div className="flex flex-wrap gap-1.5">
                      {data.suggestions.map((s, i) => (
                        <span key={i} className="text-xs text-slate-600 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Audience Intent */}
                {data.audience_intent && (
                  <div className="bg-[#f0f7ff] border border-[#bfdbfe] rounded-xl px-4 py-3.5">
                    <p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-[#275fe8] mb-1.5">Audience Intent</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{data.audience_intent}</p>
                  </div>
                )}

                {/* Content Opportunities */}
                {data.content_opportunities && data.content_opportunities.length > 0 && (
                  <div>
                    <p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-slate-400 mb-3">Content Opportunities</p>
                    <div className="space-y-2">
                      {data.content_opportunities.map((o, i) => (
                        <div key={i} className="flex items-start gap-2.5 bg-white border border-slate-100 rounded-xl px-4 py-3 hover:border-slate-200 transition">
                          <div className="w-5 h-5 rounded-md bg-[#eff6ff] flex items-center justify-center flex-shrink-0 mt-0.5">
                            <svg viewBox="0 0 24 24" fill="none" stroke="#275fe8" strokeWidth="2.5" className="w-3 h-3"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                          </div>
                          <p className="text-sm text-slate-700 leading-snug">{o}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Key Takeaways */}
                {data.key_takeaways && data.key_takeaways.length > 0 && (
                  <div className="border-t border-slate-100 pt-5">
                    <p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-slate-400 mb-3">Key Takeaways</p>
                    <div className="space-y-2">
                      {data.key_takeaways.map((t, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <span className="text-[#275fe8] font-black text-base leading-none mt-0.5 flex-shrink-0">→</span>
                          <p className="text-sm font-medium text-slate-800 leading-snug">{t}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}

function exportCSV(rows: Row[], context: string) {
  const headers = ["Keyword", "Trend", "Growth %", "Volume", "Rising Queries"];
  const data = rows.map(r => [
    `"${r.keyword.replace(/"/g, '""')}"`,
    r.trend,
    r.real ? r.real.growth_pct : r.growth,
    r.volume,
    `"${(r.real?.rising_queries ?? []).join(", ").replace(/"/g, '""')}"`,
  ]);
  const csv = [headers.join(","), ...data.map(row => row.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `trends-${context.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Results view ──────────────────────────────────────────────────────────────
type SortKey = "growth" | "keyword" | "volume";
type TrendsTimeRange = "24h" | "6m" | "1y";

function ResultsPage({
  context,
  rows,
  loadingAI,
  loadingReal,
  realFetchedCount,
  totalReal,
  geo,
  trendsTimeRange,
  onTimeRangeChange,
  onBack,
  onDrillDown,
  onDetail,
}: {
  context: string;
  rows: Row[];
  loadingAI: boolean;
  loadingReal: boolean;
  realFetchedCount: number;
  totalReal: number;
  geo: string;
  trendsTimeRange: TrendsTimeRange;
  onTimeRangeChange: (t: TrendsTimeRange) => void;
  onBack: () => void;
  onDrillDown: (kw: string) => void;
  onDetail: (kw: string) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("growth");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [filter, setFilter] = useState<"all" | "rising" | "stable" | "declining">("all");
  const [page, setPage] = useState(1);
  const [insightsKeyword, setInsightsKeyword] = useState<string | null>(null);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir(d => d === 1 ? -1 : 1);
    else { setSortKey(k); setSortDir(-1); }
  }

  const filtered = rows.filter(r => filter === "all" || r.trend === filter);
  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === "keyword") return sortDir * a.keyword.localeCompare(b.keyword);
    if (sortKey === "volume") {
      const order = { high: 3, medium: 2, low: 1 };
      return sortDir * ((order[a.volume] ?? 0) - (order[b.volume] ?? 0));
    }
    // growth — prefer real data
    const ag = a.real ? a.real.growth_pct : a.growth;
    const bg = b.real ? b.real.growth_pct : b.growth;
    return sortDir * (ag - bg);
  });

  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const visible = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const risingQueries = rows
    .flatMap(r => (r.real?.rising_queries ?? []).map(q => ({ query: q })))
    .filter((v, i, a) => a.findIndex(x => x.query === v.query) === i)
    .slice(0, 12);

  const Arrow = ({ k }: { k: SortKey }) => sortKey === k
    ? <span className="text-[#275fe8] ml-0.5 text-[10px]">{sortDir === -1 ? "↓" : "↑"}</span> : null;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-5 justify-between flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-semibold text-[#275fe8] hover:underline">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><polyline points="15 18 9 12 15 6"/></svg>
            Back to categories
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-sm font-bold text-slate-700 truncate max-w-xs">{context}</span>
          {loadingAI && <span className="text-xs text-slate-400 animate-pulse">generating keywords…</span>}
          {!loadingAI && loadingReal && (
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <span className="w-3 h-3 border-2 border-slate-300 border-t-[#275fe8] rounded-full animate-spin inline-block" />
              fetching trends ({realFetchedCount}/{totalReal})…
            </span>
          )}
        </div>
        {!loadingAI && rows.length > 0 && (
          <button
            onClick={() => exportCSV(rows, context)}
            className="flex items-center gap-1.5 text-xs font-semibold border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg hover:border-[#275fe8] hover:text-[#275fe8] transition"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </button>
        )}
      </div>

      {/* Rising from real data */}
      {risingQueries.length > 0 && (
        <div className="mb-4 bg-[#f0f7ff] border border-[#bfdbfe] rounded-2xl p-4">
          <p className="text-[0.6875rem] font-semibold text-[#275fe8] uppercase tracking-[0.1em] mb-3">Rising Opportunities</p>
          <div className="flex flex-wrap gap-2">
            {risingQueries.map((r, i) => (
              <button key={i} onClick={() => onDrillDown(r.query)}
                className="bg-white border border-[#bfdbfe] hover:bg-[#eff6ff] text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-full transition flex items-center gap-1">
                <span className="text-[#275fe8] font-bold">↑</span> {r.query}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter chips + time range toggle */}
      {!loadingAI && rows.length > 0 && (
        <div className="flex items-center gap-2 mb-3 flex-wrap justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {(["all", "rising", "stable", "declining"] as const).map(f => (
              <button key={f} onClick={() => { setFilter(f); setPage(1); }}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full transition capitalize ${filter === f ? "bg-[#275fe8] text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-[#275fe8]"}`}>
                {f === "all" ? `All (${rows.length})` : f === "rising" ? `↑ Rising (${rows.filter(r => r.trend === "rising").length})` : f === "stable" ? `→ Stable (${rows.filter(r => r.trend === "stable").length})` : `↓ Declining (${rows.filter(r => r.trend === "declining").length})`}
              </button>
            ))}
          </div>
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            {(["24h", "6m", "1y"] as const).map(t => (
              <button key={t} onClick={() => onTimeRangeChange(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${trendsTimeRange === t ? "bg-white text-[#275fe8] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                {t === "24h" ? "24 Hours" : t === "6m" ? "6 Months" : "1 Year"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading AI */}
      {loadingAI && (
        <div className="flex items-center justify-center py-20 gap-3 flex-col">
          <div className="w-7 h-7 border-4 border-[#eff6ff] border-t-[#275fe8] rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Discovering trending keywords…</p>
        </div>
      )}

      {/* Table */}
      {!loadingAI && visible.length > 0 && (
        <>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[2fr_100px_96px_72px_1fr] items-center gap-2 sm:gap-4 px-4 sm:px-5 py-3 border-b border-slate-100 bg-slate-50 text-[0.6875rem] font-bold text-slate-900 uppercase tracking-[0.1em]">
              <button className="text-left flex items-center" onClick={() => toggleSort("keyword")}>Keyword <Arrow k="keyword" /></button>
              <span className="hidden sm:block text-center">{trendsTimeRange === "24h" ? "Trend — 24h" : trendsTimeRange === "6m" ? "Trend — 6m" : "Trend — 1yr"}</span>
              <button className="flex items-center" onClick={() => toggleSort("growth")}>Growth <Arrow k="growth" /></button>
              <button className="hidden sm:flex items-center" onClick={() => toggleSort("volume")}>Volume <Arrow k="volume" /></button>
              <span className="hidden sm:block">Rising queries</span>
            </div>
            {visible.map((r, i) => {
              const growth = r.real ? r.real.growth_pct : r.growth;
              const isReal = Boolean(r.real && r.real.sparkline.length > 1);
              const isFetching = !r.real && loadingReal && i < totalReal;
              return (
                <div key={i} className="grid grid-cols-[1fr_auto] sm:grid-cols-[2fr_100px_96px_72px_1fr] items-center gap-2 sm:gap-4 px-4 sm:px-5 py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition">
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(r.keyword)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-sm font-semibold text-slate-800 hover:text-[#275fe8] hover:underline underline-offset-2 flex items-center gap-1.5 group min-w-0"
                  >
                    <span className="truncate">{r.keyword}</span>
                    <span className="sm:hidden flex-shrink-0"><TrendArrow trend={r.trend} /></span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 opacity-0 group-hover:opacity-40 flex-shrink-0 transition hidden sm:block"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  </a>
                  <button
                    onClick={() => onDetail(r.keyword)}
                    className="hidden sm:flex group/spark items-center justify-center w-full hover:opacity-80 transition cursor-pointer relative"
                    title="Click to expand trend"
                  >
                    {isFetching ? <SparklineSkeleton /> : isReal ? <Sparkline data={r.real!.sparkline} growth={growth} /> : <TrendArrow trend={r.trend} />}
                    {(isReal || !isFetching) && (
                      <span className="absolute inset-0 rounded-lg border-2 border-transparent group-hover/spark:border-[#275fe8] transition pointer-events-none" />
                    )}
                  </button>
                  <div>
                    <GrowthBadge pct={growth} estimated={!isReal} />
                  </div>
                  <div className="hidden sm:block">
                    <VolumeBadge tier={r.volume} />
                  </div>
                  <div className="hidden sm:flex flex-wrap gap-1 items-center">
                    {(r.real?.rising_queries ?? []).slice(0, 2).map((q, qi) => (
                      <button key={qi} onClick={() => onDrillDown(q)}
                        className="text-xs bg-[#eff6ff] text-[#275fe8] font-semibold px-2.5 py-0.5 rounded-full hover:bg-[#dbeafe] transition">
                        {q}
                      </button>
                    ))}
                    <button
                      onClick={() => setInsightsKeyword(r.keyword)}
                      className="flex items-center gap-1 text-[0.625rem] font-bold text-[#275fe8] bg-[#eff6ff] hover:bg-[#dbeafe] px-2 py-0.5 rounded-full transition flex-shrink-0"
                      title="AI Insights"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5"><path d="M12 2l2.4 7.4L22 12l-7.6 2.6L12 22l-2.4-7.4L2 12l7.6-2.6z"/></svg>
                      AI Insights
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:border-[#275fe8] disabled:opacity-30 disabled:cursor-not-allowed transition">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <span className="text-sm text-slate-600 font-medium">Page {page} of {pages}</span>
              <button disabled={page === pages} onClick={() => setPage(p => p + 1)}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:border-[#275fe8] disabled:opacity-30 disabled:cursor-not-allowed transition">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          )}
          <p className="text-xs text-slate-400 mt-3 text-center">
            {rows.filter(r => r.real).length} keywords with real Google Trends data · rest are AI estimates · Growth = last 6 months vs prior 6 months
          </p>
        </>
      )}
      {insightsKeyword && (
        <KeywordInsightsModal keyword={insightsKeyword} onClose={() => setInsightsKeyword(null)} />
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
interface Props {
  auditKeywords?: (string | Keyword)[];
  bizName?: string;
  initialCategory?: string;
}

const REAL_FETCH_LIMIT = 10;

export default function TrendsView({ auditKeywords = [], bizName, initialCategory }: Props) {
  const [page, setPage] = useState<"home" | "results">("home");
  const [context, setContext] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [loadingReal, setLoadingReal] = useState(false);
  const [realFetchedCount, setRealFetchedCount] = useState(0);
  const [geo, setGeo] = useState("US");
  const [trendsTimeRange, setTrendsTimeRange] = useState<TrendsTimeRange>("1y");
  const [detailKeyword, setDetailKeyword] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchRealTrends = useCallback(async (aiRows: Row[], timeRange: TrendsTimeRange = "1y", geoCode = "US") => {
    const topKws = aiRows.slice(0, REAL_FETCH_LIMIT).map(r => r.keyword);
    if (!topKws.length) return;
    setLoadingReal(true);
    setRealFetchedCount(0);
    try {
      const res = await fetch("/api/trends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: topKws, geo: geoCode, timeRange }),
      });
      const data = await res.json();
      const realMap: Record<string, RealTrend> = {};
      for (const r of (data.results ?? [])) realMap[r.keyword] = r;
      setRealFetchedCount(Object.keys(realMap).length);
      setRows(prev => prev.map(r => realMap[r.keyword] ? { ...r, real: realMap[r.keyword] } : r));
    } finally {
      setLoadingReal(false);
    }
  }, []);

  const handleTimeRangeChange = useCallback((t: TrendsTimeRange) => {
    setTrendsTimeRange(t);
    const stripped = rows.map(({ keyword, trend, growth, volume }) => ({ keyword, trend, growth, volume }));
    setRows(stripped);
    fetchRealTrends(stripped, t, geo);
  }, [fetchRealTrends, rows, geo]);

  const run = useCallback(async (ctx: string, body: object) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setContext(ctx);
    setPage("results");
    setRows([]);
    setLoadingAI(true);
    setLoadingReal(false);
    setRealFetchedCount(0);
    try {
      const res = await fetch("/api/trends/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: abortRef.current.signal,
      });
      const { keywords } = await res.json();
      const aiRows: Row[] = (keywords ?? []).map((k: AIKeyword) => ({
        keyword: k.keyword, trend: k.trend ?? "stable",
        growth: k.growth ?? 0, volume: k.volume ?? "medium",
      }));
      setRows(aiRows);
      setLoadingAI(false);
      if (aiRows.length) fetchRealTrends(aiRows, trendsTimeRange, geo);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setLoadingAI(false);
    }
  }, [fetchRealTrends, trendsTimeRange, geo]);

  const runAuditKeywords = useCallback(() => {
    const kws = auditKeywords.slice(0, 8).map(k => typeof k === "string" ? k : k.keyword).filter(Boolean);
    if (!kws.length) return;
    const aiRows: Row[] = kws.map(k => ({ keyword: k, trend: "stable", growth: 0, volume: "medium" }));
    setContext(bizName ? `${bizName} — audit keywords` : "Audit keywords");
    setPage("results");
    setRows(aiRows);
    setLoadingAI(false);
    fetchRealTrends(aiRows, trendsTimeRange, geo);
  }, [auditKeywords, bizName, fetchRealTrends, trendsTimeRange, geo]);

  useEffect(() => {
    if (initialCategory) run(initialCategory, { category: initialCategory });
    else if (auditKeywords.length > 0) runAuditKeywords();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="view-enter">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-[1.375rem] font-bold text-slate-900 tracking-tight">Discover Trends</h1>
          <p className="text-[0.875rem] text-slate-500 mt-1 font-normal">Spot growing keywords before your competitors do.</p>
        </div>
        {auditKeywords.length > 0 && page === "home" && (
          <button onClick={runAuditKeywords}
            className="flex items-center gap-2 bg-[#eff6ff] border border-[#bfdbfe] text-[#275fe8] text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-[#ede5f6] transition">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
            {bizName ? `${bizName} trends` : "My audit keywords"}
          </button>
        )}
      </div>

      {page === "home" && (
        <CategoryHome
          onSelect={cat => run(cat, { category: cat })}
          onSearch={q => run(`"${q}"`, { keyword: q })}
          geo={geo}
          onGeoChange={setGeo}
        />
      )}

      {page === "results" && (
        <ResultsPage
          context={context}
          rows={rows}
          loadingAI={loadingAI}
          loadingReal={loadingReal}
          realFetchedCount={realFetchedCount}
          totalReal={REAL_FETCH_LIMIT}
          geo={geo}
          trendsTimeRange={trendsTimeRange}
          onTimeRangeChange={handleTimeRangeChange}
          onBack={() => { abortRef.current?.abort(); setPage("home"); setRows([]); }}
          onDrillDown={kw => run(`"${kw}"`, { keyword: kw })}
          onDetail={kw => setDetailKeyword(kw)}
        />
      )}

      {detailKeyword && (
        <TrendDetailModal
          key={detailKeyword}
          keyword={detailKeyword}
          geo={geo}
          onClose={() => setDetailKeyword(null)}
          onDrillDown={kw => { setDetailKeyword(null); run(`"${kw}"`, { keyword: kw }); }}
        />
      )}
    </div>
  );
}
