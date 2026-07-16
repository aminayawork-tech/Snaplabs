"use client";
import { useState, useEffect } from "react";

interface BriefingTopic {
  name: string;
  category: string;
  summary: string;
  what_next: string;
  related: string[];
  momentum: "exploding" | "rising" | "steady";
}

interface Briefing {
  date: string;
  generatedAt: string;
  topics: BriefingTopic[];
}

const MOMENTUM_CONFIG = {
  exploding: { label: "Exploding", bg: "bg-red-50", text: "text-red-600", border: "border-red-100", dot: "bg-red-500" },
  rising:    { label: "Rising",    bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100", dot: "bg-emerald-500" },
  steady:    { label: "Steady",    bg: "bg-slate-100",  text: "text-slate-500",   border: "border-slate-200",   dot: "bg-slate-400" },
};

const CATEGORY_COLORS: Record<string, string> = {
  Technology: "bg-blue-50 text-blue-600",
  Business:   "bg-violet-50 text-violet-600",
  Health:     "bg-teal-50 text-teal-600",
  Culture:    "bg-pink-50 text-pink-600",
  Finance:    "bg-amber-50 text-amber-700",
  Sports:     "bg-orange-50 text-orange-600",
  Politics:   "bg-slate-100 text-slate-600",
  Science:    "bg-cyan-50 text-cyan-600",
};

function MomentumSparkline({ momentum }: { momentum: BriefingTopic["momentum"] }) {
  const points =
    momentum === "exploding" ? [2, 4, 4, 6, 7, 10, 14, 22, 32, 48] :
    momentum === "rising"    ? [4, 5, 5, 6, 7,  8, 10, 12, 15, 19] :
                               [6, 5, 6, 7, 6,  7,  7,  6,  7,  7];

  const max = Math.max(...points);
  const W = 80, H = 32;
  const xs = points.map((_, i) => (i / (points.length - 1)) * W);
  const ys = points.map(v => H - (v / max) * H * 0.9);
  const line = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x} ${ys[i]}`).join(" ");
  const area = `${line} L ${W} ${H} L 0 ${H} Z`;

  const color = momentum === "exploding" ? "#ef4444" : momentum === "rising" ? "#10b981" : "#94a3b8";
  const fillColor = momentum === "exploding" ? "#fef2f2" : momentum === "rising" ? "#f0fdf4" : "#f8fafc";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-20 h-8">
      <path d={area} fill={fillColor} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TopicSkeleton() {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-7 h-7 rounded-full bg-slate-100" />
        <div className="h-3 bg-slate-100 rounded w-16" />
        <div className="h-3 bg-slate-100 rounded w-20 ml-auto" />
      </div>
      <div className="h-5 bg-slate-100 rounded w-2/3 mb-4" />
      <div className="space-y-2 mb-5">
        <div className="h-3 bg-slate-50 rounded w-full" />
        <div className="h-3 bg-slate-50 rounded w-5/6" />
        <div className="h-3 bg-slate-50 rounded w-4/5" />
      </div>
      <div className="h-3 bg-slate-100 rounded w-28 mb-3" />
      <div className="space-y-2">
        <div className="h-3 bg-slate-50 rounded w-full" />
        <div className="h-3 bg-slate-50 rounded w-3/4" />
      </div>
    </div>
  );
}

export default function DailyBriefingView() {
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  async function load(force = false) {
    if (!force) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const res = await fetch(`/api/briefing/daily${force ? "?bust=" + Date.now() : ""}`);
      const data = await res.json();
      if (data.error) setError(data.error);
      else setBriefing(data);
    } catch {
      setError("Failed to load briefing. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-lg bg-[#275fe8] flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="white" className="w-3.5 h-3.5"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Daily Brief</h1>
          </div>
          <p className="text-sm text-slate-500">
            {briefing?.date ?? "Loading today's trending topics…"}
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing || loading}
          className="flex items-center gap-1.5 text-xs font-semibold border border-slate-200 text-slate-500 px-3 py-1.5 rounded-lg hover:border-[#275fe8] hover:text-[#275fe8] transition disabled:opacity-40"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/><path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/></svg>
          Refresh
        </button>
      </div>

      {/* Content */}
      {error ? (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-4 text-sm text-red-600">{error}</div>
      ) : loading ? (
        <div className="space-y-4">
          <TopicSkeleton />
          <TopicSkeleton />
          <TopicSkeleton />
        </div>
      ) : briefing ? (
        <div className="space-y-4">
          {briefing.topics.map((topic, i) => {
            const mom = MOMENTUM_CONFIG[topic.momentum] ?? MOMENTUM_CONFIG.steady;
            const catColor = CATEGORY_COLORS[topic.category] ?? "bg-slate-100 text-slate-500";
            return (
              <div key={i} className="bg-white border border-slate-100 rounded-2xl overflow-hidden hover:shadow-sm transition-shadow">
                {/* Card header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-50">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-black flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </div>
                    <span className={`text-[0.65rem] font-bold px-2 py-0.5 rounded-full ${catColor}`}>
                      {topic.category}
                    </span>
                  </div>
                  <div className={`flex items-center gap-1.5 text-[0.65rem] font-bold px-2.5 py-1 rounded-full border ${mom.bg} ${mom.text} ${mom.border}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${mom.dot} ${topic.momentum === "exploding" ? "animate-pulse" : ""}`} />
                    {mom.label}
                    <MomentumSparkline momentum={topic.momentum} />
                  </div>
                </div>

                {/* Card body */}
                <div className="px-6 pt-4 pb-6">
                  <h2 className="font-black text-slate-900 text-lg leading-tight mb-4 capitalize">{topic.name}</h2>

                  {/* Summary */}
                  <p className="text-sm text-slate-600 leading-relaxed mb-5">{topic.summary}</p>

                  {/* What's Next */}
                  <div className="bg-slate-50 rounded-xl px-4 py-3.5 mb-4">
                    <p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-slate-400 mb-2">What&apos;s Next</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{topic.what_next}</p>
                  </div>

                  {/* Related */}
                  {topic.related?.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-wide">Related:</span>
                      {topic.related.map((r, ri) => (
                        <span key={ri} className="text-[0.75rem] text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-0.5 rounded-full font-medium">
                          {r}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <p className="text-xs text-slate-400 text-center pt-2">
            Generated from real-time Google Trends + News · Refreshes every 6 hours
          </p>
        </div>
      ) : null}
    </div>
  );
}
