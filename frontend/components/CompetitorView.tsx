"use client";
import { useState } from "react";

interface CompetitorData {
  overview?: { name: string; industry: string; tagline: string; target_audience: string; scale: string };
  content_strategy?: { main_topics: string[]; content_types: string[]; tone: string; publishing_signals: string };
  keyword_themes?: string[];
  positioning?: { unique_value_props: string[]; messaging_pillars: string[]; competitive_angle: string };
  paid_acquisition?: {
    strategy: "organic" | "paid" | "mixed";
    spend_level: "high" | "medium" | "low" | "unknown";
    primary_channels: string[];
    campaign_themes: string[];
    ad_copy_signals: string[];
    landing_page_signals: string;
    organic_strengths: string[];
  };
  content_gaps?: { missing_topics: string[]; format_opportunities: string[]; strategic_opportunities: string[] };
  social_signals?: { mentioned_channels: string[]; community_focus: string; engagement_signals: string };
  error?: string;
}

function Tag({ label, color = "purple" }: { label: string; color?: "purple" | "green" | "blue" | "orange" }) {
  const styles = {
    purple: "bg-[#f3eef8] text-[#6b21d6]",
    green:  "bg-green-50 text-green-700",
    blue:   "bg-blue-50 text-blue-700",
    orange: "bg-orange-50 text-orange-700",
  };
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${styles[color]}`}>{label}</span>;
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-8 h-8 rounded-xl bg-[#f3eef8] flex items-center justify-center flex-shrink-0">{icon}</span>
        <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em]">{title}</p>
      </div>
      {children}
    </div>
  );
}

export default function CompetitorView() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CompetitorData | null>(null);
  const [error, setError] = useState("");

  const analyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    let target = url.trim();
    if (!target.startsWith("http")) target = "https://" + target;
    setLoading(true);
    setError("");
    setData(null);
    try {
      const res = await fetch("/api/competitor/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
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

  return (
    <div className="view-enter">
      <div className="mb-6">
        <h2 className="font-display text-[1.375rem] font-bold text-slate-900 tracking-tight">Competitor Analysis</h2>
        <p className="text-[0.875rem] text-slate-500 mt-1">Deep-dive any competitor site — content strategy, keyword themes, positioning gaps.</p>
      </div>

      <form onSubmit={analyze} className="flex gap-2 mb-6">
        <div className="flex-1 relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://competitor.com"
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#6b21d6] focus:ring-1 focus:ring-[#6b21d6] bg-white"
          />
        </div>
        <button type="submit" disabled={loading || !url.trim()}
          className="bg-[#6b21d6] hover:bg-[#5b17be] disabled:opacity-50 text-white font-semibold px-5 py-3 rounded-xl text-sm transition flex items-center gap-2">
          {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
          {loading ? "Analyzing…" : "Analyze"}
        </button>
      </form>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>}

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-4 border-[#f3eef8] border-t-[#6b21d6] rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Crawling site and analyzing strategy…</p>
          <p className="text-xs text-slate-400">This takes about 15–20 seconds</p>
        </div>
      )}

      {data && !loading && (
        <div className="flex flex-col gap-4 view-enter">
          {/* Overview banner */}
          {data.overview && (
            <div className="bg-gradient-to-r from-[#f3eef8] to-[#faf8ff] border border-[#c4a8e8] rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[0.6875rem] font-semibold text-[#6b21d6] uppercase tracking-[0.1em] mb-1">{data.overview.industry}</p>
                  <h3 className="font-display text-xl font-bold text-slate-900">{data.overview.name}</h3>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">{data.overview.tagline}</p>
                </div>
                <span className="text-xs font-bold bg-white border border-[#c4a8e8] text-[#6b21d6] px-3 py-1.5 rounded-full flex-shrink-0 capitalize">{data.overview.scale}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-[#c4a8e8]/40">
                <span className="text-xs text-slate-500"><strong className="text-slate-700">Target audience:</strong> {data.overview.target_audience}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Content Strategy */}
            {data.content_strategy && (
              <Card title="Content Strategy" icon={<svg viewBox="0 0 24 24" fill="none" stroke="#6b21d6" strokeWidth="2" className="w-4 h-4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>}>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-400 mb-1.5">Main topics</p>
                    <div className="flex flex-wrap gap-1.5">
                      {data.content_strategy.main_topics.map((t, i) => <Tag key={i} label={t} />)}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1.5">Content formats</p>
                    <div className="flex flex-wrap gap-1.5">
                      {data.content_strategy.content_types.map((t, i) => <Tag key={i} label={t} color="blue" />)}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-2">{data.content_strategy.publishing_signals}</p>
                </div>
              </Card>
            )}

            {/* Keyword Themes */}
            {data.keyword_themes && (
              <Card title="Keyword Themes" icon={<svg viewBox="0 0 24 24" fill="none" stroke="#6b21d6" strokeWidth="2" className="w-4 h-4"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>}>
                <div className="flex flex-wrap gap-2">
                  {data.keyword_themes.map((k, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#6b21d6]" />
                      <span className="text-sm font-medium text-slate-700">{k}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Positioning */}
            {data.positioning && (
              <Card title="Positioning & Messaging" icon={<svg viewBox="0 0 24 24" fill="none" stroke="#6b21d6" strokeWidth="2" className="w-4 h-4"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>}>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-400 mb-1.5">Unique value props</p>
                    <ul className="space-y-1">
                      {data.positioning.unique_value_props.map((v, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-sm text-slate-700">
                          <span className="text-[#6b21d6] mt-0.5 flex-shrink-0">✓</span>{v}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-2">{data.positioning.competitive_angle}</p>
                </div>
              </Card>
            )}

            {/* Content Gaps */}
            {data.content_gaps && (
              <Card title="Content Gaps & Opportunities" icon={<svg viewBox="0 0 24 24" fill="none" stroke="#6b21d6" strokeWidth="2" className="w-4 h-4"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>}>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-400 mb-1.5">Topics they&apos;re missing</p>
                    <div className="flex flex-wrap gap-1.5">
                      {data.content_gaps.missing_topics.map((t, i) => <Tag key={i} label={t} color="orange" />)}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1.5">Strategic opportunities for you</p>
                    <ul className="space-y-1">
                      {data.content_gaps.strategic_opportunities.map((o, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-sm text-slate-700">
                          <span className="text-green-500 mt-0.5 flex-shrink-0">→</span>{o}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Social Signals */}
          {data.social_signals && (
            <Card title="Social & Community Signals" icon={<svg viewBox="0 0 24 24" fill="none" stroke="#6b21d6" strokeWidth="2" className="w-4 h-4"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {data.social_signals.mentioned_channels.map((c, i) => <Tag key={i} label={c} color="green" />)}
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{data.social_signals.community_focus}</p>
            </Card>
          )}

          {/* Paid Acquisition */}
          {data.paid_acquisition && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-8 h-8 rounded-xl bg-[#f3eef8] flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#6b21d6" strokeWidth="2" className="w-4 h-4"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                </span>
                <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em]">Acquisition Strategy</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 mb-5">
                <span className={`text-sm font-bold px-4 py-1.5 rounded-full capitalize ${
                  data.paid_acquisition.strategy === "paid" ? "bg-red-50 text-red-700 border border-red-200" :
                  data.paid_acquisition.strategy === "mixed" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                  "bg-green-50 text-green-700 border border-green-200"
                }`}>{data.paid_acquisition.strategy}</span>
                <span className="text-xs text-slate-400">Ad Spend:</span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full capitalize ${
                  data.paid_acquisition.spend_level === "high" ? "bg-red-50 text-red-600" :
                  data.paid_acquisition.spend_level === "medium" ? "bg-amber-50 text-amber-600" :
                  data.paid_acquisition.spend_level === "low" ? "bg-green-50 text-green-600" :
                  "bg-slate-100 text-slate-500"
                }`}>{data.paid_acquisition.spend_level}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <p className="text-xs text-slate-400 mb-2">Primary Channels</p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.paid_acquisition.primary_channels.map((c, i) => <Tag key={i} label={c} color="blue" />)}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-2">Organic Strengths</p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.paid_acquisition.organic_strengths.map((s, i) => <Tag key={i} label={s} color="green" />)}
                  </div>
                </div>
              </div>
              {data.paid_acquisition.campaign_themes.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-400 mb-2">Inferred Campaign Themes</p>
                  <ul className="space-y-1.5">
                    {data.paid_acquisition.campaign_themes.map((t, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="text-[#6b21d6] font-bold flex-shrink-0 mt-0.5">▸</span>{t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {data.paid_acquisition.ad_copy_signals.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-400 mb-2">Ad Copy Signals Detected</p>
                  <ul className="space-y-1.5">
                    {data.paid_acquisition.ad_copy_signals.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600 italic">
                        <span className="text-amber-500 font-bold flex-shrink-0 mt-0.5 not-italic">→</span>{s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {data.paid_acquisition.landing_page_signals && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-400 mb-1">Landing Page Patterns</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{data.paid_acquisition.landing_page_signals}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
