"use client";
import { useState } from "react";

interface Persona {
  name: string;
  emoji: string;
  age_range: string;
  job_title: string;
  income: string;
  location: string;
  psychographics: string[];
  pain_points: string[];
  goals: string[];
  buying_triggers: string[];
  preferred_channels: string[];
  content_preferences: string[];
}

interface JourneyStage {
  description: string;
  touchpoints: string[];
  content_ideas: string[];
}

interface MarketInsights {
  estimated_size: string;
  growth_trend: string;
  key_communities: string[];
  market_trends: string[];
  underserved_segments: string[];
}

interface AudienceData {
  personas: Persona[];
  customer_journey: {
    awareness: JourneyStage;
    consideration: JourneyStage;
    decision: JourneyStage;
    retention: JourneyStage;
  };
  market_insights: MarketInsights;
}

const STAGE_COLORS = {
  awareness:     { bg: "bg-blue-50",   border: "border-blue-200",   text: "text-blue-700",   dot: "bg-blue-500" },
  consideration: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", dot: "bg-purple-500" },
  decision:      { bg: "bg-green-50",  border: "border-green-200",  text: "text-green-700",  dot: "bg-green-500" },
  retention:     { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", dot: "bg-orange-500" },
};

const PERSONA_COLORS = [
  { bg: "from-[#f3eef8] to-[#ede9fe]", border: "border-[#c4a8e8]", accent: "text-[#6b21d6]" },
  { bg: "from-blue-50 to-indigo-50",   border: "border-blue-200",  accent: "text-blue-700" },
  { bg: "from-green-50 to-emerald-50", border: "border-green-200", accent: "text-green-700" },
];

function Tag({ label }: { label: string }) {
  return <span className="text-xs bg-white border border-slate-200 text-slate-600 px-2.5 py-1 rounded-full font-medium">{label}</span>;
}

export default function AudienceView() {
  const [market, setMarket] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AudienceData | null>(null);
  const [error, setError] = useState("");
  const [activePersona, setActivePersona] = useState(0);

  const research = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!market.trim()) return;
    setLoading(true);
    setError("");
    setData(null);
    try {
      const res = await fetch("/api/audience/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ market: market.trim() }),
      });
      const json = await res.json();
      if (json.error) setError(json.error);
      else { setData(json); setActivePersona(0); }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const journeyStages = data?.customer_journey
    ? (["awareness", "consideration", "decision", "retention"] as const).map(k => ({
        key: k,
        label: k.charAt(0).toUpperCase() + k.slice(1),
        data: data.customer_journey[k],
      }))
    : [];

  return (
    <div className="view-enter">
      <div className="mb-6">
        <h2 className="font-display text-[1.375rem] font-bold text-slate-900 tracking-tight">Audience Research</h2>
        <p className="text-[0.875rem] text-slate-500 mt-1">Generate buyer personas, customer journey maps, and market insights for any niche.</p>
      </div>

      <form onSubmit={research} className="flex gap-2 mb-6">
        <div className="flex-1 relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <input
            type="text"
            value={market}
            onChange={e => setMarket(e.target.value)}
            placeholder='Describe your market (e.g. "plant-based protein powder", "SaaS HR software")'
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#6b21d6] focus:ring-1 focus:ring-[#6b21d6] bg-white"
          />
        </div>
        <button type="submit" disabled={loading || !market.trim()}
          className="bg-[#6b21d6] hover:bg-[#5b17be] disabled:opacity-50 text-white font-semibold px-5 py-3 rounded-xl text-sm transition flex items-center gap-2">
          {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
          {loading ? "Researching…" : "Research"}
        </button>
      </form>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>}

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-4 border-[#f3eef8] border-t-[#6b21d6] rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Building personas and journey maps…</p>
          <p className="text-xs text-slate-400">This takes about 15–20 seconds</p>
        </div>
      )}

      {data && !loading && (
        <div className="flex flex-col gap-6 view-enter">

          {/* Persona selector tabs */}
          <div>
            <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-3">Buyer Personas</p>
            <div className="flex gap-2 mb-4 flex-wrap">
              {data.personas.map((p, i) => (
                <button key={i} onClick={() => setActivePersona(i)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition
                    ${activePersona === i ? "bg-[#6b21d6] text-white border-[#6b21d6]" : "bg-white text-slate-600 border-slate-200 hover:border-[#6b21d6]"}`}>
                  <span>{p.emoji}</span> {p.name}
                </button>
              ))}
            </div>

            {/* Active persona card */}
            {data.personas[activePersona] && (() => {
              const p = data.personas[activePersona];
              const c = PERSONA_COLORS[activePersona % PERSONA_COLORS.length];
              return (
                <div className={`bg-gradient-to-br ${c.bg} border ${c.border} rounded-2xl p-6`}>
                  {/* Header */}
                  <div className="flex items-start gap-4 mb-5">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm flex-shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" stroke="#6b21d6" className="w-6 h-6"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    </div>
                    <div>
                      <h3 className={`font-display text-xl font-bold ${c.accent}`}>{p.name}</h3>
                      <p className="text-sm text-slate-600">{p.job_title}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span>Age {p.age_range}</span>
                        <span>·</span>
                        <span>{p.income}</span>
                        <span>·</span>
                        <span>{p.location}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Pain Points */}
                    <div className="bg-white/70 rounded-xl p-4">
                      <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.08em] mb-2">Pain Points</p>
                      <ul className="space-y-1.5">
                        {p.pain_points.map((pt, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-sm text-slate-700">
                            <span className="text-red-400 flex-shrink-0 mt-0.5 font-bold">–</span>{pt}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {/* Goals */}
                    <div className="bg-white/70 rounded-xl p-4">
                      <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.08em] mb-2">Goals</p>
                      <ul className="space-y-1.5">
                        {p.goals.map((g, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-sm text-slate-700">
                            <span className="text-green-500 flex-shrink-0 mt-0.5 font-bold">+</span>{g}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {/* Buying Triggers */}
                    <div className="bg-white/70 rounded-xl p-4">
                      <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.08em] mb-2">Buying Triggers</p>
                      <ul className="space-y-1.5">
                        {p.buying_triggers.map((t, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-sm text-slate-700">
                            <span className="text-[#6b21d6] flex-shrink-0 mt-0.5">→</span>{t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="bg-white/70 rounded-xl p-4">
                      <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.08em] mb-2">Preferred Channels</p>
                      <div className="flex flex-wrap gap-1.5">
                        {p.preferred_channels.map((ch, i) => <Tag key={i} label={ch} />)}
                      </div>
                    </div>
                    <div className="bg-white/70 rounded-xl p-4">
                      <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.08em] mb-2">Content Preferences</p>
                      <div className="flex flex-wrap gap-1.5">
                        {p.content_preferences.map((cp, i) => <Tag key={i} label={cp} />)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Customer Journey */}
          <div>
            <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-3">Customer Journey Map</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {journeyStages.map(({ key, label, data: stage }) => {
                const c = STAGE_COLORS[key];
                return (
                  <div key={key} className={`${c.bg} border ${c.border} rounded-2xl p-4`}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                      <p className={`text-xs font-bold uppercase tracking-wider ${c.text}`}>{label}</p>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed mb-3">{stage.description}</p>
                    <div className="space-y-1 mb-3">
                      {stage.touchpoints.map((tp, i) => (
                        <p key={i} className="text-xs text-slate-500 flex items-start gap-1"><span className="flex-shrink-0 mt-0.5">•</span>{tp}</p>
                      ))}
                    </div>
                    <div className={`border-t ${c.border} pt-2`}>
                      <p className={`text-[0.6rem] font-bold uppercase tracking-wider ${c.text} mb-1`}>Content ideas</p>
                      {stage.content_ideas.map((ci, i) => (
                        <p key={i} className="text-xs text-slate-600 flex items-start gap-1"><span className="flex-shrink-0 mt-0.5">→</span>{ci}</p>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Market Insights */}
          {data.market_insights && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-4">Market Insights</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-[0.6875rem] text-slate-400 mb-0.5">Market Size</p>
                  <p className="font-bold text-slate-900 text-sm">{data.market_insights.estimated_size}</p>
                </div>
                <div>
                  <p className="text-[0.6875rem] text-slate-400 mb-0.5">Growth</p>
                  <p className="font-bold text-green-600 text-sm">{data.market_insights.growth_trend}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[0.6875rem] text-slate-400 mb-1.5">Key Communities</p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.market_insights.key_communities.map((c, i) => (
                      <span key={i} className="text-xs bg-orange-50 text-orange-700 px-2.5 py-1 rounded-full font-semibold">{c}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                <div>
                  <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-2">Market Trends</p>
                  <ul className="space-y-1">
                    {data.market_insights.market_trends.map((t, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-sm text-slate-700"><span className="text-[#6b21d6] flex-shrink-0">↑</span>{t}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em] mb-2">Underserved Segments</p>
                  <ul className="space-y-1">
                    {data.market_insights.underserved_segments.map((s, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-sm text-slate-700"><span className="text-green-500 flex-shrink-0">→</span>{s}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
