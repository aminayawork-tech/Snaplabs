"use client";
import type { AuditResult, Competitor, QuickWin, AudiencePersona, AgentOutput } from "@/lib/types";
import Section from "./Section";
import AgentGrid from "./AgentGrid";
import ChatPanel from "./ChatPanel";

interface Props {
  result: AuditResult;
  bizName: string;
  initialAgentOutputs?: Record<string, AgentOutput>;
  onAgentOutput?: (agentId: string, output: AgentOutput) => void;
}

function scoreColor(s: number) {
  return s >= 70 ? "#22c55e" : s >= 50 ? "#f59e0b" : "#ef4444";
}

export default function ResultsView({ result, bizName, initialAgentOutputs, onAgentOutput }: Props) {
  const { data, pages_crawled } = result;

  const rawScore = data.overall_marketing_score;
  const scoreVal = typeof rawScore === "number" ? rawScore : (rawScore?.score ?? 0);
  const sc = scoreColor(scoreVal);

  const name     = data.business_name || bizName || "Your Business";
  const industry = data.industry || "";
  const location = data.location || "";
  const sub      = [industry, location].filter(Boolean).join(" · ");

  const services   = data.services_offered ?? [];
  const strengths  = data.current_marketing_strengths ?? [];
  const gaps       = data.current_marketing_gaps ?? [];

  const seo        = data.seo_analysis ?? {};
  const keywords   = data.top_10_longtail_keywords ?? data.target_keywords ?? (seo as Record<string, unknown>).target_keywords as unknown[] ?? [];
  const techIssues = data.technical_seo_issues ?? ((seo as Record<string, unknown>).technical_issues as string[]) ?? [];

  const competitors = (data.competitor_analysis ?? data.competitors ?? []) as Competitor[];
  const wins        = (data.quick_win_opportunities ?? []) as QuickWin[];
  const personas    = (data.target_audience ?? []) as AudiencePersona[];

  return (
    <div className="view-enter">
      {/* Business card */}
      <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 flex items-center justify-between mb-4 shadow-sm">
        <div className="min-w-0">
          <p className="font-extrabold text-lg text-slate-800 truncate">{name}</p>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
        <div className="flex-shrink-0 ml-4 text-center">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-extrabold"
            style={{ background: sc, boxShadow: `0 2px 8px ${sc}66` }}
          >
            {scoreVal}
          </div>
          <p className="text-[0.6rem] text-slate-400 mt-1 uppercase tracking-wider">Score /100</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        {[
          { label: "Pages",      value: pages_crawled },
          { label: "Services",   value: services.length },
          { label: "Quick Wins", value: wins.length },
          { label: "Competitors",value: competitors.length },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-xl p-2 text-center shadow-sm">
            <p className="text-brand text-xl font-bold">{value}</p>
            <p className="text-[0.62rem] text-slate-400 uppercase tracking-wide mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Audit sections ── */}
      <Section title="Overview — Business, Gaps & Strengths" defaultOpen>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            {services.length > 0 && (
              <>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Services</p>
                <ul className="list-disc list-inside text-sm text-slate-600 space-y-0.5 mb-3">
                  {services.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </>
            )}
            {strengths.length > 0 && (
              <>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Strengths</p>
                <ul className="list-disc list-inside text-sm text-slate-600 space-y-0.5">
                  {strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </>
            )}
          </div>
          <div>
            {gaps.length > 0 && (
              <>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Marketing Gaps</p>
                <ul className="list-disc list-inside text-sm text-slate-600 space-y-0.5">
                  {gaps.map((g, i) => <li key={i}>{g}</li>)}
                </ul>
              </>
            )}
          </div>
        </div>
      </Section>

      <Section title="SEO & Keywords">
        {keywords.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Target Keywords</p>
            <div className="flex flex-wrap gap-1.5">
              {keywords.slice(0, 15).map((kw, i) => {
                const txt = typeof kw === "string" ? kw : (kw as { keyword: string }).keyword ?? String(kw);
                return (
                  <span key={i} className="bg-brand-100 text-brand px-2.5 py-0.5 rounded-full text-xs font-medium">
                    {txt}
                  </span>
                );
              })}
            </div>
          </div>
        )}
        {techIssues.length > 0 && (
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Technical Issues to Fix</p>
            <ul className="list-disc list-inside text-sm text-slate-600 space-y-0.5">
              {techIssues.slice(0, 8).map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>
        )}
        {keywords.length === 0 && techIssues.length === 0 && (
          <p className="text-sm text-slate-400">No SEO data found in audit.</p>
        )}
      </Section>

      <Section title="Competitors">
        {competitors.length > 0 ? (
          <div className="flex flex-col gap-2">
            {competitors.slice(0, 6).map((comp, i) => {
              if (typeof comp !== "object") return <p key={i} className="text-sm text-slate-600">- {String(comp)}</p>;
              const cName     = comp.name ?? comp.competitor_name ?? "Competitor";
              const cUrl      = comp.url ?? comp.website ?? "";
              const strength  = comp.strengths ?? comp.key_strength ?? comp.strength ?? "";
              const weakness  = comp.weaknesses ?? comp.weakness ?? "";
              return (
                <div key={i} className="border border-slate-200 rounded-xl px-4 py-3">
                  <p className="font-bold text-slate-800 text-sm">{cName}
                    {cUrl && <span className="font-normal text-slate-400 text-xs ml-2">{cUrl}</span>}
                  </p>
                  {strength && <p className="text-xs text-slate-600 mt-1"><b>Strength:</b> {String(strength).slice(0, 140)}</p>}
                  {weakness && <p className="text-xs text-slate-600"><b>Weakness:</b> {String(weakness).slice(0, 140)}</p>}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No competitor data found.</p>
        )}
      </Section>

      <Section title="Quick Wins — Actionable Opportunities">
        {wins.length > 0 ? (
          <div className="flex flex-col gap-2">
            {wins.map((w, i) => {
              if (typeof w !== "object") return <p key={i} className="text-sm text-slate-600">- {String(w)}</p>;
              const title   = w.tactic ?? w.title ?? w.opportunity ?? `Win #${i + 1}`;
              const effort  = (w.effort ?? "").toLowerCase();
              const impact  = w.expected_impact ?? w.impact ?? "";
              const timeline = w.timeline ?? "";
              const effortColor = effort.includes("low") ? "bg-green-500" : effort.includes("medium") ? "bg-amber-500" : "bg-red-500";
              return (
                <div key={i} className="border border-slate-200 rounded-xl px-4 py-3">
                  <p className="font-semibold text-slate-800 text-sm mb-1">{i + 1}. {title}</p>
                  {impact && <p className="text-xs text-slate-600 mb-2">{String(impact).slice(0, 160)}</p>}
                  <div className="flex gap-1.5">
                    {effort && (
                      <span className={`${effortColor} text-white text-[0.68rem] font-bold px-2 py-0.5 rounded`}>
                        {effort} effort
                      </span>
                    )}
                    {timeline && (
                      <span className="bg-brand-100 text-brand text-[0.68rem] font-semibold px-2 py-0.5 rounded">
                        {timeline}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No quick wins identified.</p>
        )}
      </Section>

      <Section title="Target Audience">
        {personas.length > 0 ? (
          <div className="flex flex-col gap-4">
            {personas.slice(0, 4).map((p, i) => (
              <div key={i}>
                <p className="font-bold text-slate-800 text-sm">{p.persona_name ?? `Segment ${i + 1}`}</p>
                {p.demographics && <p className="text-xs text-slate-400 mt-0.5">{p.demographics}</p>}
                {(p.pain_points ?? []).length > 0 && (
                  <p className="text-xs text-slate-600 mt-1">
                    Pain points: {(p.pain_points ?? []).slice(0, 4).join(" · ")}
                  </p>
                )}
                {p.where_to_reach && (
                  <p className="text-xs text-slate-600">Where to reach: {p.where_to_reach}</p>
                )}
                {i < personas.length - 1 && <hr className="border-slate-100 mt-3" />}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No audience data found.</p>
        )}
      </Section>

      <Section title="Download Report">
        <div className="flex gap-3">
          <a
            href={`data:text/markdown;charset=utf-8,${encodeURIComponent(`# ${name} Marketing Audit\n\n${JSON.stringify(data, null, 2)}`)}`}
            download={`audit_${name.replace(/\s+/g, "_")}.md`}
            className="flex-1 text-center bg-white border border-slate-200 hover:border-brand-300 text-slate-700 hover:text-brand text-sm font-semibold py-2.5 rounded-xl transition"
          >
            Download Markdown
          </a>
          <a
            href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`}
            download={`audit_${name.replace(/\s+/g, "_")}.json`}
            className="flex-1 text-center bg-white border border-slate-200 hover:border-brand-300 text-slate-700 hover:text-brand text-sm font-semibold py-2.5 rounded-xl transition"
          >
            Download JSON
          </a>
        </div>
      </Section>

      <hr className="border-slate-100 my-6" />

      {/* Agents */}
      <AgentGrid
        researchData={data}
        bizName={bizName}
        initialOutputs={initialAgentOutputs}
        onAgentOutput={onAgentOutput}
      />

      <hr className="border-slate-100 my-6" />

      {/* Chat */}
      <ChatPanel researchData={data} />
    </div>
  );
}
