"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import type { Keyword } from "@/lib/types";

type VolumeTier = "high" | "medium" | "low";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtVol(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return `${n}`;
}

// ── Large trend chart ─────────────────────────────────────────────────────────
interface TimePoint { date: string; value: number }

function LargeChart({ timeline }: { timeline: TimePoint[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  if (!timeline.length) return (
    <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No data available</div>
  );

  const W = 800, H = 200;
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
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 200 }}>
        <defs>
          <linearGradient id="gt-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6b21d6" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#6b21d6" stopOpacity="0" />
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
        <polyline points={linePts} fill="none" stroke="#6b21d6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Hover crosshair + dot */}
        {hoverIdx !== null && hoveredPt && (
          <g>
            <line
              x1={xS(hoverIdx)} x2={xS(hoverIdx)}
              y1={PAD.top} y2={yS(0)}
              stroke="#6b21d6" strokeWidth="1" strokeDasharray="3,3" opacity="0.5"
            />
            <circle cx={xS(hoverIdx)} cy={yS(hoveredPt.value)} r="4.5" fill="white" stroke="#6b21d6" strokeWidth="2" />
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
                <span className="w-2.5 h-2.5 rounded-full bg-[#6b21d6] flex-shrink-0" />
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
function TrendDetailModal({ keyword, geo, onClose }: { keyword: string; geo: string; onClose: () => void }) {
  const [timeRange, setTimeRange] = useState<"6m" | "1y" | "5y">("1y");
  const [timeline, setTimeline] = useState<TimePoint[]>([]);
  const [rising, setRising] = useState<string[]>([]);
  const [currentMonthly, setCurrentMonthly] = useState<number>(0);
  const [loading, setLoading] = useState(true);

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
          setRising(d.rising_queries ?? []);
          setCurrentMonthly(d.current_monthly ?? 0);
          setLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [keyword, geo, timeRange]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {/* Keyword chip like Google Trends */}
            <div className="flex items-center gap-2 bg-[#f3eef8] border border-[#c4a8e8] rounded-full px-4 py-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#6b21d6] flex-shrink-0" />
              <span className="text-sm font-bold text-[#6b21d6]">{keyword}</span>
              <a
                href={`https://trends.google.com/trends/explore?q=${encodeURIComponent(keyword)}&geo=${geo}`}
                target="_blank" rel="noopener noreferrer"
                className="opacity-50 hover:opacity-100 transition"
                title="Open in Google Trends"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-[#6b21d6]"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Time range toggle */}
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              {(["6m", "1y", "5y"] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${timeRange === r ? "bg-white text-[#6b21d6] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  {r === "6m" ? "6 Months" : r === "1y" ? "1 Year" : "5 Years"}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        {/* Chart area */}
        <div className="px-6 pt-4">
          <div className="flex items-baseline justify-between mb-1">
            <div className="flex items-baseline gap-3">
              <p className="font-display text-sm font-semibold text-slate-800 tracking-tight">Monthly search volume</p>
              {!loading && currentMonthly > 0 && (
                <span className="text-lg font-bold text-[#6b21d6]">~{fmtVol(currentMonthly)}<span className="text-xs font-normal text-slate-400 ml-1">searches/mo est.</span></span>
              )}
            </div>
            <p className="text-xs text-slate-400">{geo === "US" ? "United States" : geo || "Worldwide"} · {timeRange === "6m" ? "Past 6 months" : timeRange === "1y" ? "Past year" : "Past 5 years"}</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48 gap-2">
              <div className="w-5 h-5 border-4 border-[#f3eef8] border-t-[#6b21d6] rounded-full animate-spin" />
              <span className="text-sm text-slate-400">Loading trend data…</span>
            </div>
          ) : (
            <LargeChart timeline={timeline} />
          )}
        </div>

        {/* Rising queries */}
        {rising.length > 0 && (
          <div className="px-6 pb-5 mt-2">
            <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-3">Rising related searches</p>
            <div className="flex flex-wrap gap-2">
              {rising.map((q, i) => (
                <a
                  key={i}
                  href={`https://www.google.com/search?q=${encodeURIComponent(q)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs font-semibold bg-[#f3eef8] text-[#6b21d6] px-3 py-1.5 rounded-full hover:bg-[#e9e0f6] transition flex items-center gap-1"
                >
                  <span className="text-green-500">↑</span> {q}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
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
  { name: "Food & Beverage",     desc: "Recipes, ingredients & food trends" },
  { name: "Health & Wellness",   desc: "Fitness, supplements & mental health" },
  { name: "Technology & AI",     desc: "Software, AI tools & digital trends" },
  { name: "Fashion & Apparel",   desc: "Clothing, accessories & style" },
  { name: "Home & Garden",       desc: "Interior design, renovation & plants" },
  { name: "Beauty & Skincare",   desc: "Skincare, makeup & hair care" },
  { name: "Finance & Investing", desc: "Investing, budgeting & fintech" },
  { name: "Education & Courses", desc: "Online learning, skills & training" },
  { name: "Sports & Fitness",    desc: "Workouts, gear & athletics" },
  { name: "Travel & Hospitality",desc: "Destinations, experiences & tourism" },
  { name: "Marketing & Growth",  desc: "SEO, social media & brand building" },
  { name: "Real Estate",         desc: "Buying, selling & property trends" },
  { name: "E-commerce & Retail", desc: "Shopping, products & consumer trends" },
  { name: "Parenting & Family",  desc: "Childcare, education & family life" },
  { name: "Legal & Professional",desc: "Law, consulting & B2B services" },
  { name: "Automotive",          desc: "Cars, EVs & maintenance trends" },
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
  const color = growth >= 0 ? "#6b21d6" : "#ef4444";
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={W} cy={H - ((data[data.length - 1] - min) / range) * (H - 4) - 2} r="2.5" fill={color} />
    </svg>
  );
}

function TrendArrow({ trend }: { trend: TrendDir }) {
  if (trend === "rising")   return <span className="text-green-500 font-bold text-base">↑</span>;
  if (trend === "declining")return <span className="text-red-500 font-bold text-base">↓</span>;
  return <span className="text-slate-400 font-bold text-base">→</span>;
}

function GrowthBadge({ pct, estimated }: { pct: number; estimated?: boolean }) {
  const up = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2.5 py-1 rounded-full ${up ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"} ${estimated ? "opacity-70" : ""}`}>
      {up ? "▲" : "▼"} {Math.abs(pct)}%{estimated ? <span className="font-normal opacity-70 ml-0.5">est</span> : null}
    </span>
  );
}

function VolumeBadge({ tier }: { tier: VolumeTier }) {
  const map = { high: "bg-purple-100 text-purple-700", medium: "bg-blue-50 text-blue-700", low: "bg-slate-100 text-slate-500" };
  return <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${map[tier]}`}>{tier}</span>;
}

function SparklineSkeleton() {
  return <div className="w-[90px] h-[28px] bg-slate-100 rounded animate-pulse" />;
}

// ── Category home ─────────────────────────────────────────────────────────────
function CategoryHome({ onSelect, onSearch }: { onSelect: (c: string) => void; onSearch: (q: string) => void }) {
  const [q, setQ] = useState("");
  return (
    <div>
      <form onSubmit={e => { e.preventDefault(); if (q.trim()) onSearch(q.trim()); }} className="flex gap-2 mb-8">
        <div className="flex-1 relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder='Enter any keyword to expand (e.g. "mushroom coffee", "cold plunge")'
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#6b21d6] focus:ring-1 focus:ring-[#6b21d6] bg-white"
          />
        </div>
        <button type="submit" className="bg-[#6b21d6] hover:bg-[#5b17be] text-white font-semibold px-5 py-3 rounded-xl text-sm transition">
          Expand
        </button>
      </form>
      <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.12em] mb-4">Browse by category</p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {CATEGORIES.map(cat => (
          <button key={cat.name} onClick={() => onSelect(cat.name)}
            className="text-left border border-slate-200 rounded-xl p-4 bg-white hover:border-[#6b21d6] hover:bg-[#faf8ff] transition group">
            <p className="font-bold text-slate-800 text-sm group-hover:text-[#6b21d6] transition leading-snug">{cat.name}</p>
            <p className="text-xs text-slate-400 mt-1 leading-snug">{cat.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Results view ──────────────────────────────────────────────────────────────
type SortKey = "growth" | "keyword" | "volume";

function ResultsPage({
  context,
  rows,
  loadingAI,
  loadingReal,
  realFetchedCount,
  totalReal,
  geo,
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
  onBack: () => void;
  onDrillDown: (kw: string) => void;
  onDetail: (kw: string) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("growth");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [filter, setFilter] = useState<"all" | "rising" | "stable" | "declining">("all");
  const [page, setPage] = useState(1);

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
    ? <span className="text-[#6b21d6] ml-0.5 text-[10px]">{sortDir === -1 ? "↓" : "↑"}</span> : null;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-semibold text-[#6b21d6] hover:underline">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><polyline points="15 18 9 12 15 6"/></svg>
          Back to categories
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-bold text-slate-700 truncate max-w-xs">{context}</span>
        {loadingAI && <span className="text-xs text-slate-400 animate-pulse">generating keywords…</span>}
        {!loadingAI && loadingReal && (
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <span className="w-3 h-3 border-2 border-slate-300 border-t-[#6b21d6] rounded-full animate-spin inline-block" />
            fetching trends ({realFetchedCount}/{totalReal})…
          </span>
        )}
      </div>

      {/* Rising from real data */}
      {risingQueries.length > 0 && (
        <div className="mb-4 bg-[#faf8ff] border border-[#c4a8e8] rounded-2xl p-4">
          <p className="text-[0.6875rem] font-semibold text-[#6b21d6] uppercase tracking-[0.1em] mb-3">Rising Opportunities</p>
          <div className="flex flex-wrap gap-2">
            {risingQueries.map((r, i) => (
              <button key={i} onClick={() => onDrillDown(r.query)}
                className="bg-white border border-[#c4a8e8] hover:bg-[#f3eef8] text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-full transition flex items-center gap-1">
                <span className="text-green-500 font-bold">↑</span> {r.query}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter chips */}
      {!loadingAI && rows.length > 0 && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {(["all", "rising", "stable", "declining"] as const).map(f => (
            <button key={f} onClick={() => { setFilter(f); setPage(1); }}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full transition capitalize ${filter === f ? "bg-[#6b21d6] text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-[#6b21d6]"}`}>
              {f === "all" ? `All (${rows.length})` : f === "rising" ? `↑ Rising (${rows.filter(r => r.trend === "rising").length})` : f === "stable" ? `→ Stable (${rows.filter(r => r.trend === "stable").length})` : `↓ Declining (${rows.filter(r => r.trend === "declining").length})`}
            </button>
          ))}
        </div>
      )}

      {/* Loading AI */}
      {loadingAI && (
        <div className="flex items-center justify-center py-20 gap-3 flex-col">
          <div className="w-7 h-7 border-4 border-[#f3eef8] border-t-[#6b21d6] rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Discovering trending keywords…</p>
        </div>
      )}

      {/* Table */}
      {!loadingAI && visible.length > 0 && (
        <>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-[2fr_100px_96px_72px_1fr] items-center gap-4 px-5 py-3 border-b border-slate-100 bg-slate-50 text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em]">
              <button className="text-left flex items-center" onClick={() => toggleSort("keyword")}>Keyword <Arrow k="keyword" /></button>
              <span>Trend — 1yr</span>
              <button className="flex items-center" onClick={() => toggleSort("growth")}>Growth <Arrow k="growth" /></button>
              <button className="flex items-center" onClick={() => toggleSort("volume")}>Volume <Arrow k="volume" /></button>
              <span>Rising queries</span>
            </div>
            {visible.map((r, i) => {
              const growth = r.real ? r.real.growth_pct : r.growth;
              const isReal = Boolean(r.real && r.real.sparkline.length > 1);
              const isFetching = !r.real && loadingReal && i < totalReal;
              return (
                <div key={i} className="grid grid-cols-[2fr_100px_96px_72px_1fr] items-center gap-4 px-5 py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition">
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(r.keyword)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-sm font-semibold text-slate-800 hover:text-[#6b21d6] hover:underline underline-offset-2 truncate flex items-center gap-1.5 group"
                  >
                    {r.keyword}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 opacity-0 group-hover:opacity-40 flex-shrink-0 transition"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  </a>
                  <button
                    onClick={() => onDetail(r.keyword)}
                    className="group/spark flex items-center hover:opacity-80 transition cursor-pointer relative"
                    title="Click to expand trend"
                  >
                    {isFetching ? <SparklineSkeleton /> : isReal ? <Sparkline data={r.real!.sparkline} growth={growth} /> : <TrendArrow trend={r.trend} />}
                    {(isReal || !isFetching) && (
                      <span className="absolute inset-0 rounded-lg border-2 border-transparent group-hover/spark:border-[#6b21d6] transition pointer-events-none" />
                    )}
                  </button>
                  <div>
                    <GrowthBadge pct={growth} estimated={!isReal} />
                  </div>
                  <div>
                    <VolumeBadge tier={r.volume} />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(r.real?.rising_queries ?? []).slice(0, 3).map((q, qi) => (
                      <button key={qi} onClick={() => onDrillDown(q)}
                        className="text-xs bg-[#f3eef8] text-[#6b21d6] font-semibold px-2.5 py-0.5 rounded-full hover:bg-[#e9e0f6] transition">
                        {q}
                      </button>
                    ))}
                    {(!r.real || r.real.rising_queries.length === 0) && <span className="text-slate-300 text-sm">—</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:border-[#6b21d6] disabled:opacity-30 disabled:cursor-not-allowed transition">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <span className="text-sm text-slate-600 font-medium">Page {page} of {pages}</span>
              <button disabled={page === pages} onClick={() => setPage(p => p + 1)}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:border-[#6b21d6] disabled:opacity-30 disabled:cursor-not-allowed transition">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          )}
          <p className="text-xs text-slate-400 mt-3 text-center">
            {rows.filter(r => r.real).length} keywords with real Google Trends data · rest are AI estimates · Growth = last 6 months vs prior 6 months
          </p>
        </>
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
  const [geo] = useState("US");
  const [detailKeyword, setDetailKeyword] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchRealTrends = useCallback(async (aiRows: Row[]) => {
    const topKws = aiRows.slice(0, REAL_FETCH_LIMIT).map(r => r.keyword);
    if (!topKws.length) return;
    setLoadingReal(true);
    setRealFetchedCount(0);
    try {
      const res = await fetch("/api/trends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: topKws, geo: "US" }),
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
      if (aiRows.length) fetchRealTrends(aiRows);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setLoadingAI(false);
    }
  }, [fetchRealTrends]);

  const runAuditKeywords = useCallback(() => {
    const kws = auditKeywords.slice(0, 8).map(k => typeof k === "string" ? k : k.keyword).filter(Boolean);
    if (!kws.length) return;
    const aiRows: Row[] = kws.map(k => ({ keyword: k, trend: "stable", growth: 0, volume: "medium" }));
    setContext(bizName ? `${bizName} — audit keywords` : "Audit keywords");
    setPage("results");
    setRows(aiRows);
    setLoadingAI(false);
    fetchRealTrends(aiRows);
  }, [auditKeywords, bizName, fetchRealTrends]);

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
            className="flex items-center gap-2 bg-[#f3eef8] border border-[#c4a8e8] text-[#6b21d6] text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-[#ede5f6] transition">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
            {bizName ? `${bizName} trends` : "My audit keywords"}
          </button>
        )}
      </div>

      {page === "home" && (
        <CategoryHome
          onSelect={cat => run(cat, { category: cat })}
          onSearch={q => run(`"${q}"`, { keyword: q })}
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
          onBack={() => { abortRef.current?.abort(); setPage("home"); setRows([]); }}
          onDrillDown={kw => run(`"${kw}"`, { keyword: kw })}
          onDetail={kw => setDetailKeyword(kw)}
        />
      )}

      {detailKeyword && (
        <TrendDetailModal
          keyword={detailKeyword}
          geo={geo}
          onClose={() => setDetailKeyword(null)}
        />
      )}
    </div>
  );
}
