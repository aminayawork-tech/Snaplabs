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

function Sparkline({ data, growth }: { data: number[]; growth: number }) {
  if (data.length < 2) return <span className="text-slate-300 text-sm">—</span>;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 88, H = 30;
  const pts = data.map((v, i) =>
    `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * (H - 4) - 2}`
  ).join(" ");
  const color = growth >= 0 ? "#6b21d6" : "#ef4444";
  const fillId = `fill-${Math.random().toString(36).slice(2)}`;
  const firstPt = `0,${H - ((data[0] - min) / range) * (H - 4) - 2}`;
  const lastPt  = `${W},${H - ((data[data.length - 1] - min) / range) * (H - 4) - 2}`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`${firstPt} ${pts} ${lastPt} ${W},${H} 0,${H}`}
        fill={`url(#${fillId})`}
      />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle
        cx={(data.length - 1) / (data.length - 1) * W}
        cy={H - ((data[data.length - 1] - min) / range) * (H - 4) - 2}
        r="2.5" fill={color}
      />
    </svg>
  );
}

function InterestBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-[#6b21d6] rounded-full" style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs text-slate-500 w-7 text-right">{value}</span>
    </div>
  );
}

function GrowthBadge({ pct }: { pct: number }) {
  const up = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${up ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
      {up ? "▲" : "▼"} {Math.abs(pct)}%
    </span>
  );
}

interface Props {
  auditKeywords?: (string | Keyword)[];
  bizName?: string;
}

type SortKey = "keyword" | "growth_pct" | "current_interest";

export default function TrendsView({ auditKeywords = [], bizName }: Props) {
  const [query, setQuery] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [results, setResults] = useState<TrendResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("growth_pct");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [tab, setTab] = useState<"audit" | "search">(auditKeywords.length > 0 ? "audit" : "search");
  const [geo, setGeo] = useState("US");

  const fetchTrends = useCallback(async (kws: string[]) => {
    if (!kws.length) return;
    setLoading(true);
    setError("");
    setResults([]);
    try {
      const res = await fetch("/api/trends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: kws, geo }),
      });
      const data = await res.json();
      setResults(data.results ?? []);
    } catch {
      setError("Could not fetch trend data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [geo]);

  // Auto-load audit keywords
  useEffect(() => {
    if (tab === "audit" && auditKeywords.length > 0) {
      const kws = auditKeywords.slice(0, 8).map(k => typeof k === "string" ? k : k.keyword).filter(Boolean);
      fetchTrends(kws);
    }
  }, [tab, auditKeywords, fetchTrends]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!inputValue.trim()) return;
    const kws = inputValue.split(",").map(s => s.trim()).filter(Boolean).slice(0, 5);
    setQuery(inputValue);
    fetchTrends(kws);
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => (d === 1 ? -1 : 1));
    else { setSortKey(key); setSortDir(-1); }
  }

  const sorted = [...results].sort((a, b) => {
    const av = a[sortKey] as string | number;
    const bv = b[sortKey] as string | number;
    if (typeof av === "string") return sortDir * av.localeCompare(bv as string);
    return sortDir * ((av as number) - (bv as number));
  });

  const rising = results
    .flatMap(r => r.rising_queries.map(q => ({ query: q, kw: r.keyword, growth: r.growth_pct })))
    .filter((v, i, arr) => arr.findIndex(x => x.query === v.query) === i)
    .slice(0, 12);

  const SortArrow = ({ k }: { k: SortKey }) =>
    sortKey === k ? <span className="ml-0.5 text-[#6b21d6]">{sortDir === -1 ? "↓" : "↑"}</span> : null;

  return (
    <div className="view-enter">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-extrabold text-slate-800">Discover Trends</h1>
        <p className="text-sm text-slate-500 mt-0.5">Real Google Trends data — spot growing keywords before competitors do.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {auditKeywords.length > 0 && (
          <button
            onClick={() => setTab("audit")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${tab === "audit" ? "bg-[#6b21d6] text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-[#c4a8e8]"}`}
          >
            {bizName ? `${bizName} Keywords` : "Audit Keywords"}
          </button>
        )}
        <button
          onClick={() => setTab("search")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${tab === "search" ? "bg-[#6b21d6] text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-[#c4a8e8]"}`}
        >
          Search Keywords
        </button>
      </div>

      {/* Search bar (search tab) */}
      {tab === "search" && (
        <form onSubmit={handleSearch} className="flex gap-2 mb-5">
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="Enter keywords, comma-separated (e.g. gut health, mushroom coffee)"
            className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#6b21d6] focus:ring-1 focus:ring-[#6b21d6]"
          />
          <select
            value={geo}
            onChange={e => setGeo(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#6b21d6] bg-white"
          >
            <option value="US">🇺🇸 US</option>
            <option value="GB">🇬🇧 UK</option>
            <option value="CA">🇨🇦 Canada</option>
            <option value="AU">🇦🇺 Australia</option>
            <option value="">🌍 Worldwide</option>
          </select>
          <button
            type="submit"
            disabled={loading}
            className="bg-[#6b21d6] hover:bg-[#5b17be] text-white font-semibold px-5 py-2.5 rounded-xl text-sm disabled:opacity-50 transition"
          >
            {loading ? "Loading…" : "Search"}
          </button>
        </form>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-8 h-8 border-4 border-[#f3eef8] border-t-[#6b21d6] rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Fetching Google Trends data…</p>
          <p className="text-xs text-slate-400">Analyzing up to {tab === "audit" ? auditKeywords.length : "5"} keywords</p>
        </div>
      )}

      {/* Error */}
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 mb-4">{error}</p>}

      {/* Empty state */}
      {!loading && !error && results.length === 0 && tab === "search" && !query && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#f3eef8] flex items-center justify-center text-2xl">📈</div>
          <p className="font-semibold text-slate-700">Enter keywords to see trends</p>
          <p className="text-sm text-slate-400 max-w-xs">Paste up to 5 keywords separated by commas to see Google Trends data, growth rates, and rising opportunities.</p>
        </div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <>
          {/* Rising opportunities */}
          {rising.length > 0 && (
            <div className="mb-5 bg-gradient-to-br from-[#f3eef8] to-white border border-[#c4a8e8] rounded-2xl p-4">
              <p className="text-sm font-extrabold text-[#6b21d6] uppercase tracking-wide mb-3">
                🚀 Rising Opportunities
              </p>
              <div className="flex flex-wrap gap-2">
                {rising.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setTab("search");
                      setInputValue(r.query);
                      fetchTrends([r.query]);
                    }}
                    className="bg-white border border-[#c4a8e8] hover:bg-[#f3eef8] text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-full transition flex items-center gap-1"
                  >
                    <span className="text-green-500">↑</span> {r.query}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[2fr_100px_90px_100px_1fr] items-center gap-4 px-4 py-3 border-b border-slate-100 bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wide">
              <button className="text-left flex items-center" onClick={() => toggleSort("keyword")}>
                Keyword <SortArrow k="keyword" />
              </button>
              <span>Trend — 1yr</span>
              <button className="flex items-center" onClick={() => toggleSort("growth_pct")}>
                Growth <SortArrow k="growth_pct" />
              </button>
              <button className="flex items-center" onClick={() => toggleSort("current_interest")}>
                Interest <SortArrow k="current_interest" />
              </button>
              <span>Rising queries</span>
            </div>

            {sorted.map((r, i) => (
              <div
                key={i}
                className="grid grid-cols-[2fr_100px_90px_100px_1fr] items-center gap-4 px-4 py-3.5 border-b border-slate-50 hover:bg-slate-50 transition"
              >
                <span className="text-sm font-semibold text-slate-800 truncate">{r.keyword}</span>
                <div>
                  <Sparkline data={r.sparkline} growth={r.growth_pct} />
                </div>
                <div>
                  {r.sparkline.length > 0 ? (
                    <GrowthBadge pct={r.growth_pct} />
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </div>
                <div>
                  {r.sparkline.length > 0 ? (
                    <InterestBar value={r.current_interest} />
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {r.rising_queries.slice(0, 3).map((q, qi) => (
                    <button
                      key={qi}
                      onClick={() => { setTab("search"); setInputValue(q); fetchTrends([q]); }}
                      className="text-[11px] bg-[#f3eef8] text-[#6b21d6] font-semibold px-2 py-0.5 rounded-full hover:bg-[#e9e0f6] transition"
                    >
                      {q}
                    </button>
                  ))}
                  {r.rising_queries.length === 0 && <span className="text-xs text-slate-400">—</span>}
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-400 mt-3 text-center">
            Data from Google Trends · Interest scores normalized 0–100 · Growth = last 6 months vs prior 6 months
          </p>
        </>
      )}
    </div>
  );
}
