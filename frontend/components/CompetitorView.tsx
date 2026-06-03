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

interface MetaAd {
  id: string;
  page_name: string;
  body: string;
  title: string;
  description: string;
  caption: string;
  snapshot_url: string;
  start_date: string;
  end_date: string | null;
  platforms: string[];
  impressions: { lower_bound: string; upper_bound: string } | null;
  spend: { lower_bound: string; upper_bound: string } | null;
  currency: string;
}

const PLATFORM_ICON: Record<string, string> = {
  facebook: "f",
  instagram: "ig",
  messenger: "m",
  audience_network: "an",
};

function Tag({ label, color = "purple" }: { label: string; color?: "purple" | "green" | "blue" | "orange" }) {
  const styles = {
    purple: "bg-[#eff6ff] text-[#275fe8]",
    green:  "bg-[#eff6ff] text-[#275fe8]",
    blue:   "bg-blue-50 text-blue-700",
    orange: "bg-orange-50 text-orange-700",
  };
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${styles[color]}`}>{label}</span>;
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-8 h-8 rounded-xl bg-[#eff6ff] flex items-center justify-center flex-shrink-0">{icon}</span>
        <p className="text-xs font-bold text-slate-900 uppercase tracking-[0.08em]">{title}</p>
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
  const [metaAds, setMetaAds] = useState<MetaAd[] | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaError, setMetaError] = useState("");

  const fetchMetaAds = async (competitorName: string) => {
    setMetaLoading(true);
    setMetaError("");
    setMetaAds(null);
    try {
      const res = await fetch("/api/competitor/meta-ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitor_name: competitorName }),
      });
      const json = await res.json();
      if (json.error) setMetaError(json.error);
      else setMetaAds(json.ads ?? []);
    } catch {
      setMetaError("Failed to fetch Meta ads.");
    } finally {
      setMetaLoading(false);
    }
  };

  const analyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    let target = url.trim();
    if (!target.startsWith("http")) target = "https://" + target;
    setLoading(true);
    setError("");
    setData(null);
    setMetaAds(null);
    setMetaError("");
    try {
      const res = await fetch("/api/competitor/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      const json = await res.json();
      if (json.error) setError(json.error);
      else {
        setData(json);
        if (json.overview?.name) fetchMetaAds(json.overview.name);
      }
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
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#275fe8] focus:ring-1 focus:ring-[#275fe8] bg-white"
          />
        </div>
        <button type="submit" disabled={loading || !url.trim()}
          className="bg-[#275fe8] hover:bg-[#1a4fd0] disabled:opacity-50 text-white font-semibold px-5 py-3 rounded-xl text-sm transition flex items-center gap-2">
          {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
          {loading ? "Analyzing…" : "Analyze"}
        </button>
      </form>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>}

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-4 border-[#eff6ff] border-t-[#275fe8] rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Crawling site and analyzing strategy…</p>
          <p className="text-xs text-slate-400">This takes about 15–20 seconds</p>
        </div>
      )}

      {data && !loading && (
        <div className="flex flex-col gap-4 view-enter">
          {/* Overview banner */}
          {data.overview && (
            <div className="bg-gradient-to-r from-[#eff6ff] to-[#f0f7ff] border border-[#bfdbfe] rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[0.6875rem] font-semibold text-[#275fe8] uppercase tracking-[0.1em] mb-1">{data.overview.industry}</p>
                  <h3 className="font-display text-xl font-bold text-slate-900">{data.overview.name}</h3>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">{data.overview.tagline}</p>
                </div>
                <span className="text-xs font-bold bg-white border border-[#bfdbfe] text-[#275fe8] px-3 py-1.5 rounded-full flex-shrink-0 capitalize">{data.overview.scale}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-[#bfdbfe]/40">
                <span className="text-xs text-slate-500"><strong className="text-slate-700">Target audience:</strong> {data.overview.target_audience}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Content Strategy */}
            {data.content_strategy && (
              <Card title="Content Strategy" icon={<svg viewBox="0 0 24 24" fill="none" stroke="#275fe8" strokeWidth="2" className="w-4 h-4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>}>
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
              <Card title="Keyword Themes" icon={<svg viewBox="0 0 24 24" fill="none" stroke="#275fe8" strokeWidth="2" className="w-4 h-4"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>}>
                <div className="flex flex-wrap gap-2">
                  {data.keyword_themes.map((k, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#275fe8]" />
                      <span className="text-sm font-medium text-slate-700">{k}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Positioning */}
            {data.positioning && (
              <Card title="Positioning & Messaging" icon={<svg viewBox="0 0 24 24" fill="none" stroke="#275fe8" strokeWidth="2" className="w-4 h-4"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>}>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-400 mb-1.5">Unique value props</p>
                    <ul className="space-y-1">
                      {data.positioning.unique_value_props.map((v, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-sm text-slate-700">
                          <span className="text-[#275fe8] mt-0.5 flex-shrink-0">✓</span>{v}
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
              <Card title="Content Gaps & Opportunities" icon={<svg viewBox="0 0 24 24" fill="none" stroke="#275fe8" strokeWidth="2" className="w-4 h-4"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>}>
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
                          <span className="text-[#275fe8] mt-0.5 flex-shrink-0">→</span>{o}
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
            <Card title="Social & Community Signals" icon={<svg viewBox="0 0 24 24" fill="none" stroke="#275fe8" strokeWidth="2" className="w-4 h-4"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {data.social_signals.mentioned_channels.map((c, i) => <Tag key={i} label={c} color="green" />)}
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{data.social_signals.community_focus}</p>
            </Card>
          )}

          {/* Live Meta Ads */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-[#eff6ff] flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#275fe8" strokeWidth="2" className="w-4 h-4"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                </span>
                <p className="text-xs font-bold text-slate-900 uppercase tracking-[0.08em]">Live Meta Ads</p>
                <span className="text-[0.625rem] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">FACEBOOK · INSTAGRAM</span>
              </div>
              {metaAds !== null && !metaLoading && (
                <button
                  onClick={() => data?.overview?.name && fetchMetaAds(data.overview.name)}
                  className="text-xs text-[#275fe8] font-semibold hover:underline flex items-center gap-1"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                  Refresh
                </button>
              )}
            </div>

            {metaLoading && (
              <div className="flex items-center gap-2 py-6 justify-center text-slate-400 text-sm">
                <div className="w-4 h-4 border-2 border-slate-200 border-t-[#275fe8] rounded-full animate-spin flex-shrink-0" />
                Searching Meta Ad Library…
              </div>
            )}

            {metaError && data?.overview?.name && (
              <div className="flex flex-col gap-2">
                <a
                  href={`https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=${encodeURIComponent(data.overview.name)}&search_type=keyword_unordered`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-[#275fe8] hover:bg-[#1a4fd0] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                  Search &quot;{data.overview.name}&quot; in Meta Ad Library
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 ml-auto"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
                <a
                  href={`https://library.tiktok.com/ads?region=US&search_term=${encodeURIComponent(data.overview.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-black hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.2 8.2 0 0 0 4.79 1.52V6.78a4.85 4.85 0 0 1-1.02-.09z"/></svg>
                  Search &quot;{data.overview.name}&quot; in TikTok Ad Library
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 ml-auto"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
              </div>
            )}

            {metaAds !== null && !metaLoading && metaAds.length === 0 && (
              <p className="text-sm text-slate-400 py-4 text-center">No active ads found for this competitor in the Meta Ad Library.</p>
            )}

            {metaAds && metaAds.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">{metaAds.length} active ad{metaAds.length !== 1 ? "s" : ""} found</p>
                {metaAds.map((ad) => (
                  <div key={ad.id} className="border border-slate-100 rounded-xl p-4 hover:border-[#bfdbfe] hover:bg-[#f0f7ff] transition">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex flex-wrap gap-1">
                        {ad.platforms.map(p => (
                          <span key={p} className="text-[0.625rem] font-bold bg-[#eff6ff] text-[#275fe8] px-2 py-0.5 rounded-full uppercase">
                            {PLATFORM_ICON[p] ?? p}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {ad.spend && (
                          <span className="text-xs text-slate-500">
                            Spend: <strong>${ad.spend.lower_bound}–${ad.spend.upper_bound}</strong>
                          </span>
                        )}
                        {ad.impressions && (
                          <span className="text-xs text-slate-500">
                            Impressions: <strong>{ad.impressions.lower_bound}–{ad.impressions.upper_bound}</strong>
                          </span>
                        )}
                        {ad.snapshot_url && (
                          <a href={ad.snapshot_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs font-semibold text-[#275fe8] hover:underline flex items-center gap-0.5">
                            View ad
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                          </a>
                        )}
                      </div>
                    </div>
                    {ad.title && <p className="text-sm font-bold text-slate-800 mb-1">{ad.title}</p>}
                    {ad.body && <p className="text-sm text-slate-600 leading-relaxed">{ad.body}</p>}
                    {ad.description && <p className="text-xs text-slate-400 mt-1">{ad.description}</p>}
                    <p className="text-[0.625rem] text-slate-300 mt-2">
                      Running since {new Date(ad.start_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                      {ad.end_date ? ` · ended ${new Date(ad.end_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}` : " · still active"}
                    </p>
                  </div>
                ))}
                <a
                  href={`https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=US&q=${encodeURIComponent(data?.overview?.name ?? "")}&search_type=keyword_unordered`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[#275fe8] hover:underline pt-1"
                >
                  View all in Meta Ad Library
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
              </div>
            )}
          </div>

          {/* Paid Acquisition */}
          {data.paid_acquisition && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-8 h-8 rounded-xl bg-[#eff6ff] flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#275fe8" strokeWidth="2" className="w-4 h-4"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                </span>
                <p className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em]">Acquisition Strategy</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 mb-5">
                <span className={`text-sm font-bold px-4 py-1.5 rounded-full capitalize ${
                  data.paid_acquisition.strategy === "paid" ? "bg-red-50 text-red-700 border border-red-200" :
                  data.paid_acquisition.strategy === "mixed" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                  "bg-[#eff6ff] text-[#275fe8] border border-[#bfdbfe]"
                }`}>{data.paid_acquisition.strategy}</span>
                <span className="text-xs text-slate-400">Ad Spend:</span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full capitalize ${
                  data.paid_acquisition.spend_level === "high" ? "bg-red-50 text-red-600" :
                  data.paid_acquisition.spend_level === "medium" ? "bg-amber-50 text-amber-600" :
                  data.paid_acquisition.spend_level === "low" ? "bg-[#eff6ff] text-[#275fe8]" :
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
                        <span className="text-[#275fe8] font-bold flex-shrink-0 mt-0.5">▸</span>{t}
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
