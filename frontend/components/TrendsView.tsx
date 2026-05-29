"use client";
import { useState, useEffect, useCallback } from "react";
import type { Keyword } from "@/lib/types";

interface TrendResult {
  keyword: string;
  sparkline: number[];
  growth_pct: number;
  current_interest: number;
  rising_queries: string[];
}

const CATEGORIES = [
  { name: "Food & Beverage",         desc: "Recipes, ingredients & food trends" },
  { name: "Health & Wellness",        desc: "Fitness, supplements & mental health" },
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
];

// ── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ data, growth }: { data: number[]; growth: number }) {
  if (data.length < 2) return <span className="text-slate-300 text-sm">—</span>;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 90, H = 28;
  const pts = data.map((v, i) =>
    `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * (H - 4) - 2}`
  ).join(" ");
  const color = growth >= 0 ? "#6b21d6" : "#ef4444";
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle
        cx={W} cy={H - ((data[data.length - 1] - min) / range) * (H - 4) - 2}
        r="2.5" fill={color}
      />
    </svg>
  );
}

function GrowthBadge({ pct }: { pct: number }) {
  const up = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2.5 py-1 rounded-full ${up ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
      {up ? "▲" : "▼"} {Math.abs(pct)}%
    </span>
  );
}

function InterestBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-[#6b21d6] rounded-full transition-all" style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs text-slate-500 w-6 text-right tabular-nums">{value}</span>
    </div>
  );
}

// ── Category browser (home) ───────────────────────────────────────────────────
function CategoryHome({
  onSelect,
  onSearch,
}: {
  onSelect: (cat: string) => void;
  onSearch: (q: string) => void;
}) {
  const [q, setQ] = useState("");
  return (
    <div>
      <form
        onSubmit={e => { e.preventDefault(); if (q.trim()) onSearch(q.trim()); }}
        className="flex gap-2 mb-8"
      >
        <div className="flex-1 relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search any keyword or topic (e.g. &quot;gut health&quot;, &quot;AI tools&quot;)"
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#6b21d6] focus:ring-1 focus:ring-[#6b21d6] bg-white"
          />
        </div>
        <button
          type="submit"
          className="bg-[#6b21d6] hover:bg-[#5b17be] text-white font-semibold px-5 py-3 rounded-xl text-sm transition"
        >
          Search
        </button>
      </form>

      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Browse by category</p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {CATEGORIES.map(cat => (
          <button
            key={cat.name}
            onClick={() => onSelect(cat.name)}
            className="text-left border border-slate-200 rounded-xl p-4 bg-white hover:border-[#6b21d6] hover:bg-[#faf8ff] transition group"
          >
            <p className="font-bold text-slate-800 text-sm group-hover:text-[#6b21d6] transition leading-snug">{cat.name}</p>
            <p className="text-xs text-slate-400 mt-1 leading-snug">{cat.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Results table ─────────────────────────────────────────────────────────────
type SortKey = "keyword" | "growth_pct" | "current_interest";

function ResultsTable({
  context,
  results,
  loading,
  loadingMsg,
  onBack,
  onDrillDown,
}: {
  context: string;
  results: TrendResult[];
  loading: boolean;
  loadingMsg: string;
  onBack: () => void;
  onDrillDown: (kw: string) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("growth_pct");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir(d => (d === 1 ? -1 : 1));
    else { setSortKey(k); setSortDir(-1); }
  }

  const sorted = [...results].sort((a, b) => {
    const av = a[sortKey] as string | number;
    const bv = b[sortKey] as string | number;
    if (typeof av === "string") return sortDir * av.localeCompare(bv as string);
    return sortDir * ((av as number) - (bv as number));
  });

  const rising = results
    .flatMap(r => r.rising_queries.map(q => ({ query: q, growth: r.growth_pct })))
    .filter((v, i, arr) => arr.findIndex(x => x.query === v.query) === i)
    .slice(0, 10);

  const Arrow = ({ k }: { k: SortKey }) =>
    sortKey === k ? <span className="text-[#6b21d6] ml-0.5">{sortDir === -1 ? "↓" : "↑"}</span> : null;

  return (
    <div>
      {/* Breadcrumb / back */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-semibold text-[#6b21d6] hover:underline"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><polyline points="15 18 9 12 15 6"/></svg>
          Back to categories
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-bold text-slate-700">{context}</span>
      </div>

      {/* Rising opportunities */}
      {rising.length > 0 && (
        <div className="mb-5 bg-[#faf8ff] border border-[#c4a8e8] rounded-2xl p-4">
          <p className="text-xs font-extrabold text-[#6b21d6] uppercase tracking-wide mb-3">Rising Opportunities</p>
          <div className="flex flex-wrap gap-2">
            {rising.map((r, i) => (
              <button
                key={i}
                onClick={() => onDrillDown(r.query)}
                className="bg-white border border-[#c4a8e8] hover:bg-[#f3eef8] text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-full transition flex items-center gap-1"
              >
                <span className="text-green-500 font-bold">↑</span> {r.query}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 gap-3 flex-col">
          <div className="w-7 h-7 border-4 border-[#f3eef8] border-t-[#6b21d6] rounded-full animate-spin" />
          <p className="text-sm text-slate-500">{loadingMsg}</p>
        </div>
      )}

      {/* Table */}
      {!loading && results.length > 0 && (
        <>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-[2fr_96px_96px_110px_1fr] items-center gap-4 px-5 py-3 border-b border-slate-100 bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              <button className="text-left flex items-center" onClick={() => toggleSort("keyword")}>Keyword <Arrow k="keyword" /></button>
              <span>Trend — 1yr</span>
              <button className="flex items-center" onClick={() => toggleSort("growth_pct")}>Growth <Arrow k="growth_pct" /></button>
              <button className="flex items-center" onClick={() => toggleSort("current_interest")}>Interest <Arrow k="current_interest" /></button>
              <span>Rising queries</span>
            </div>
            {sorted.map((r, i) => (
              <div
                key={i}
                className="grid grid-cols-[2fr_96px_96px_110px_1fr] items-center gap-4 px-5 py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition"
              >
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(r.keyword)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-slate-800 hover:text-[#6b21d6] hover:underline underline-offset-2 truncate flex items-center gap-1.5 group"
                >
                  {r.keyword}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 opacity-0 group-hover:opacity-50 flex-shrink-0 transition"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
                <Sparkline data={r.sparkline} growth={r.growth_pct} />
                <div>{r.sparkline.length > 0 ? <GrowthBadge pct={r.growth_pct} /> : <span className="text-slate-300">—</span>}</div>
                <div>{r.sparkline.length > 0 ? <InterestBar value={r.current_interest} /> : <span className="text-slate-300">—</span>}</div>
                <div className="flex flex-wrap gap-1">
                  {r.rising_queries.slice(0, 3).map((q, qi) => (
                    <button
                      key={qi}
                      onClick={() => onDrillDown(q)}
                      className="text-[11px] bg-[#f3eef8] text-[#6b21d6] font-semibold px-2 py-0.5 rounded-full hover:bg-[#e9e0f6] transition"
                    >
                      {q}
                    </button>
                  ))}
                  {r.rising_queries.length === 0 && <span className="text-slate-300 text-xs">—</span>}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3 text-center">
            Google Trends data · Interest normalized 0–100 · Growth = last 6 months vs prior 6 months
          </p>
        </>
      )}

      {!loading && results.length === 0 && (
        <div className="text-center py-16 text-slate-400 text-sm">No trend data available for these keywords.</div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
interface Props {
  auditKeywords?: (string | Keyword)[];
  bizName?: string;
  initialCategory?: string;
}

export default function TrendsView({ auditKeywords = [], bizName, initialCategory }: Props) {
  const [page, setPage] = useState<"home" | "results">("home");
  const [context, setContext] = useState("");
  const [results, setResults] = useState<TrendResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("Discovering trending keywords…");
  const [geo] = useState("US");

  const fetchTrends = useCallback(async (keywords: string[]) => {
    if (!keywords.length) return;
    setLoadingMsg("Fetching Google Trends data…");
    const res = await fetch("/api/trends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keywords, geo }),
    });
    const data = await res.json();
    setResults(data.results ?? []);
  }, [geo]);

  const runCategory = useCallback(async (cat: string) => {
    setContext(cat);
    setPage("results");
    setResults([]);
    setLoading(true);
    setLoadingMsg("Discovering trending keywords…");
    try {
      const res = await fetch("/api/trends/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: cat }),
      });
      const { keywords } = await res.json();
      if (keywords?.length) await fetchTrends(keywords);
    } finally {
      setLoading(false);
    }
  }, [fetchTrends]);

  const runSearch = useCallback(async (q: string) => {
    const keywords = q.split(",").map((s: string) => s.trim()).filter(Boolean).slice(0, 8);
    setContext(`Search: "${q}"`);
    setPage("results");
    setResults([]);
    setLoading(true);
    setLoadingMsg("Fetching Google Trends data…");
    try {
      await fetchTrends(keywords);
    } finally {
      setLoading(false);
    }
  }, [fetchTrends]);

  const runAuditKeywords = useCallback(async () => {
    const kws = auditKeywords.slice(0, 8).map(k => typeof k === "string" ? k : k.keyword).filter(Boolean);
    if (!kws.length) return;
    setContext(bizName ? `${bizName} — audit keywords` : "Audit keywords");
    setPage("results");
    setResults([]);
    setLoading(true);
    setLoadingMsg("Fetching Google Trends data…");
    try {
      await fetchTrends(kws);
    } finally {
      setLoading(false);
    }
  }, [auditKeywords, bizName, fetchTrends]);

  // Auto-load if arriving from audit with initialCategory or audit keywords
  useEffect(() => {
    if (initialCategory) {
      runCategory(initialCategory);
    } else if (auditKeywords.length > 0) {
      runAuditKeywords();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="view-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800">Discover Trends</h1>
          <p className="text-sm text-slate-500 mt-0.5">Spot growing keywords before your competitors do.</p>
        </div>
        {/* Audit shortcut */}
        {auditKeywords.length > 0 && page === "home" && (
          <button
            onClick={runAuditKeywords}
            className="flex items-center gap-2 bg-[#f3eef8] border border-[#c4a8e8] text-[#6b21d6] text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-[#ede5f6] transition"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
            {bizName ? `${bizName} trends` : "My audit keywords"}
          </button>
        )}
      </div>

      {page === "home" && (
        <CategoryHome onSelect={runCategory} onSearch={runSearch} />
      )}

      {page === "results" && (
        <ResultsTable
          context={context}
          results={results}
          loading={loading}
          loadingMsg={loadingMsg}
          onBack={() => { setPage("home"); setResults([]); }}
          onDrillDown={(kw) => runSearch(kw)}
        />
      )}
    </div>
  );
}
