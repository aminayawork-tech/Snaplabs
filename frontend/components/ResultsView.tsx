"use client";
import { useState } from "react";
import type { AuditResult, Competitor, QuickWin, AudiencePersona, AgentOutput, Keyword } from "@/lib/types";
import { AGENTS } from "@/lib/types";
import { api } from "@/lib/api";
import { renderMarkdown } from "@/lib/renderMarkdown";
import Section from "./Section";
import AgentGrid from "./AgentGrid";
import ChatPanel from "./ChatPanel";

function guessAgentId(tactic: string): string {
  const t = tactic.toLowerCase();
  if (/review|testimonial|referral|houzz|google review/.test(t)) return "review_referral";
  if (/email|sms|newsletter|nurture|drip/.test(t)) return "email_sms";
  if (/instagram|linkedin|social|tiktok|facebook|pinterest/.test(t)) return "social_media";
  if (/paid|ppc|google ads|facebook ads|retarget|ad spend/.test(t)) return "paid_ads";
  if (/lead|landing page|form|capture|cta|funnel/.test(t)) return "lead_gen";
  if (/blog|content|article|post|copy|write/.test(t)) return "content_engine";
  return "seo";
}

interface WinCardProps {
  win: QuickWin;
  index: number;
  researchData: AuditResult["data"];
  bizName: string;
  personas: AudiencePersona[];
  onAgentOutput?: (agentId: string, output: AgentOutput) => void;
}

function QuickWinCard({ win, index, researchData, bizName, personas, onAgentOutput }: WinCardProps) {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<AgentOutput | null>(null);
  const [streamText, setStreamText] = useState("");
  const [agentError, setAgentError] = useState("");
  const [selectedPersona, setSelectedPersona] = useState<number | "all">("all");
  const abortRef = useState<AbortController | null>(null);

  const title    = win.tactic ?? win.title ?? win.opportunity ?? `Win #${index + 1}`;
  const effort   = (win.effort ?? "").toLowerCase();
  const impact   = win.expected_impact ?? win.impact ?? "";
  const timeline = win.timeline ?? "";
  const steps    = win.how_to_steps ?? [];
  const agentId  = guessAgentId(title);
  const agentMeta = AGENTS.find((a) => a.id === agentId);

  const effortColor = effort.includes("low")
    ? "bg-green-500" : effort.includes("medium") ? "bg-amber-500" : "bg-red-500";

  const buildTaskOverride = () => {
    const base = [title, impact].filter(Boolean).join(" — Expected outcome: ");
    if (selectedPersona === "all" || personas.length === 0) return base;
    const p = personas[selectedPersona as number];
    if (!p) return base;
    const parts = [
      `Persona: ${p.persona_name ?? "Target audience"}`,
      p.demographics && `Demographics: ${p.demographics}`,
      (p.pain_points ?? []).length > 0 && `Pain points: ${(p.pain_points ?? []).join(", ")}`,
      p.where_to_reach && `Where to reach them: ${p.where_to_reach}`,
    ].filter(Boolean).join("\n");
    return `${base}\n\nTARGET AUDIENCE FOR THIS CONTENT:\n${parts}`;
  };

  const activate = async () => {
    if (running) return;
    const ctrl = new AbortController();
    abortRef[1](ctrl);
    setRunning(true);
    setAgentError("");
    setOutput(null);
    setStreamText("");
    let full = "";
    try {
      for await (const ev of api.agents.run(
        { agent_id: agentId, research_data: researchData, biz_name: bizName, task_override: buildTaskOverride() },
        ctrl.signal
      )) {
        if (ev.type === "text") {
          full += ev.text as string;
          setStreamText(full);
        }
        if (ev.type === "error") {
          setAgentError(ev.text as string);
        }
      }
      if (full) {
        const ts = new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
        const out: AgentOutput = { output: full, timestamp: ts };
        setOutput(out);
        setStreamText("");
        onAgentOutput?.(agentId, out);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setAgentError(String(e));
    } finally {
      setRunning(false);
    }
  };

  const clearOutput = () => {
    abortRef[0]?.abort();
    setOutput(null);
    setStreamText("");
    setAgentError("");
    setRunning(false);
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition"
      >
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#f3eef8] text-[#6b21d6] text-xs font-extrabold flex items-center justify-center mt-0.5">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 text-sm leading-snug">{title}</p>
          {impact && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{String(impact)}</p>}
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {effort && <span className={`${effortColor} text-white text-[0.68rem] font-bold px-2 py-0.5 rounded`}>{effort} effort</span>}
            {timeline && <span className="bg-brand-100 text-brand text-[0.68rem] font-semibold px-2 py-0.5 rounded">{timeline}</span>}
          </div>
        </div>
        <span className={`flex-shrink-0 text-slate-400 mt-1 transition-transform duration-150 ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 py-4 bg-slate-50">

          {/* Audience selector */}
          {personas.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-extrabold text-[#6b21d6] uppercase tracking-wide mb-2">Who are we targeting?</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => { setSelectedPersona("all"); setOutput(null); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                    selectedPersona === "all"
                      ? "bg-[#6b21d6] text-white border-[#6b21d6]"
                      : "bg-white text-slate-600 border-slate-200 hover:border-[#c4a8e8]"
                  }`}
                >
                  All audiences
                </button>
                {personas.map((p, pi) => (
                  <button
                    key={pi}
                    onClick={() => { setSelectedPersona(pi); setOutput(null); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                      selectedPersona === pi
                        ? "bg-[#6b21d6] text-white border-[#6b21d6]"
                        : "bg-white text-slate-600 border-slate-200 hover:border-[#c4a8e8]"
                    }`}
                  >
                    {p.persona_name ?? `Segment ${pi + 1}`}
                  </button>
                ))}
              </div>
              {selectedPersona !== "all" && personas[selectedPersona as number] && (
                <div className="mt-2 bg-white border border-[#c4a8e8] rounded-xl px-3 py-2.5 text-xs text-slate-600">
                  <span className="font-bold text-[#6b21d6]">Demographics: </span>
                  {personas[selectedPersona as number].demographics}
                  {(personas[selectedPersona as number].pain_points ?? []).length > 0 && (
                    <><br /><span className="font-bold text-[#6b21d6]">Pain points: </span>
                    {(personas[selectedPersona as number].pain_points ?? []).slice(0, 3).join(" · ")}</>
                  )}
                  {personas[selectedPersona as number].where_to_reach && (
                    <><br /><span className="font-bold text-[#6b21d6]">Where to reach: </span>
                    {personas[selectedPersona as number].where_to_reach}</>
                  )}
                </div>
              )}
            </div>
          )}

          {steps.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-extrabold text-[#6b21d6] uppercase tracking-wide mb-2">How to Complete</p>
              <ol className="space-y-2">
                {steps.map((s, si) => (
                  <li key={si} className="flex gap-2.5 text-sm text-slate-700">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white border border-[#c4a8e8] text-[#6b21d6] text-xs font-bold flex items-center justify-center mt-0.5">
                      {si + 1}
                    </span>
                    <span>{s.replace(/^Step \d+:\s*/i, "")}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {agentError && (
            <div className="mb-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2.5 text-sm">
              {agentError}
            </div>
          )}

          {!output && !streamText && (
            <button
              onClick={activate}
              disabled={running}
              className="w-full bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] text-white font-bold rounded-xl py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-60 hover:shadow-md transition"
            >
              {running ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white spin" />
                  Writing… (streaming output below)
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                  Do This For Me — {agentMeta?.label ?? agentId} Agent
                </>
              )}
            </button>
          )}

          {(streamText || output) && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-extrabold text-[#6b21d6] uppercase tracking-wide">
                  {agentMeta?.label} Agent Output{output ? ` · ${output.timestamp}` : ""}
                  {running && <span className="inline-block w-1.5 h-3.5 bg-[#6b21d6] ml-1 animate-pulse align-middle" />}
                </p>
                <div className="flex gap-2">
                  {!running && output && (
                    <button
                      onClick={activate}
                      className="text-xs text-slate-400 hover:text-brand font-semibold transition"
                    >
                      Re-run
                    </button>
                  )}
                  <button
                    onClick={clearOutput}
                    className="text-xs text-slate-400 hover:text-red-500 font-semibold transition"
                    title="Clear output"
                  >
                    ✕ Clear
                  </button>
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 leading-relaxed max-h-[520px] overflow-y-auto">
                {renderMarkdown(streamText || output?.output || "")}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
                <p className="text-sm font-extrabold text-[#6b21d6] uppercase tracking-wide mb-1">Services</p>
                <ul className="list-disc list-inside text-sm text-slate-700 space-y-1 mb-3">
                  {services.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </>
            )}
            {strengths.length > 0 && (
              <>
                <p className="text-sm font-extrabold text-[#6b21d6] uppercase tracking-wide mb-1">Strengths</p>
                <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                  {strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </>
            )}
          </div>
          <div>
            {gaps.length > 0 && (
              <>
                <p className="text-sm font-extrabold text-[#6b21d6] uppercase tracking-wide mb-1">Marketing Gaps</p>
                <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                  {gaps.map((g, i) => <li key={i}>{g}</li>)}
                </ul>
              </>
            )}
          </div>
        </div>
      </Section>

      <Section title="SEO & Keywords">
        {keywords.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-extrabold text-[#6b21d6] uppercase tracking-wide mb-3">Long-tail Keyword Opportunities</p>
            <div className="flex flex-col gap-2">
              {keywords.slice(0, 15).map((kw, i) => {
                const obj = typeof kw === "string" ? { keyword: kw } : (kw as Keyword);
                const diff = (obj.difficulty ?? "").toLowerCase();
                const intent = (obj.intent ?? "").toLowerCase();
                const vol = obj.monthly_searches ?? "";
                const diffColor = diff === "low" ? "bg-green-100 text-green-700" : diff === "medium" ? "bg-amber-100 text-amber-700" : diff === "high" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500";
                const intentColor = intent === "transactional" ? "bg-purple-100 text-purple-700" : intent === "commercial" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500";
                return (
                  <div key={i} className="border border-slate-200 rounded-xl px-4 py-2.5 flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-semibold text-slate-800 flex-1 min-w-[160px]">{obj.keyword}</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {vol && (
                        <span className="flex items-center gap-1 bg-slate-100 text-slate-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                          {vol}/mo
                        </span>
                      )}
                      {diff && <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${diffColor}`}>{diff} difficulty</span>}
                      {intent && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${intentColor}`}>{intent}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {techIssues.length > 0 && (
          <div>
            <p className="text-sm font-extrabold text-[#6b21d6] uppercase tracking-wide mb-2">Technical Issues to Fix</p>
            <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
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
          <div className="flex flex-col gap-3">
            {competitors.slice(0, 6).map((comp, i) => {
              if (typeof comp !== "object") return <p key={i} className="text-sm text-slate-600">- {String(comp)}</p>;
              const cName     = comp.name ?? comp.competitor_name ?? "Competitor";
              const cUrl      = comp.url ?? comp.website ?? "";
              const strength  = comp.strengths ?? comp.key_strength ?? comp.strength ?? "";
              const weakness  = comp.weaknesses ?? comp.weakness ?? "";
              const traffic   = comp.estimated_traffic ?? "";
              const rankingKws = comp.top_ranking_keywords ?? [];
              return (
                <div key={i} className="border border-slate-200 rounded-xl px-4 py-3.5">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-extrabold text-[#6b21d6] text-base leading-tight">{cName}</p>
                    {traffic && (
                      <span className="flex-shrink-0 text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full whitespace-nowrap">
                        ~{traffic}
                      </span>
                    )}
                  </div>
                  {cUrl && (
                    <a
                      href={cUrl.startsWith("http") ? cUrl : `https://${cUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand underline underline-offset-2 hover:text-brand-600 break-all"
                    >
                      {cUrl}
                    </a>
                  )}
                  {strength && <p className="text-sm text-slate-700 mt-2"><span className="font-bold text-[#6b21d6]">Strength:</span> {String(strength).slice(0, 220)}</p>}
                  {weakness && <p className="text-sm text-slate-700 mt-0.5"><span className="font-bold text-[#6b21d6]">Weakness:</span> {String(weakness).slice(0, 220)}</p>}
                  {rankingKws.length > 0 && (
                    <div className="mt-2.5">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Likely ranking for</p>
                      <div className="flex flex-wrap gap-1">
                        {rankingKws.slice(0, 6).map((kw, ki) => (
                          <span key={ki} className="bg-brand-50 text-brand text-xs font-medium px-2 py-0.5 rounded-full border border-brand-200">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
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
            {wins.map((w, i) =>
              typeof w !== "object" ? (
                <p key={i} className="text-sm text-slate-600">- {String(w)}</p>
              ) : (
                <QuickWinCard
                  key={i}
                  win={w}
                  index={i}
                  researchData={data}
                  bizName={bizName}
                  personas={personas}
                  onAgentOutput={onAgentOutput}
                />
              )
            )}
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
                <p className="font-extrabold text-[#6b21d6] text-base">{p.persona_name ?? `Segment ${i + 1}`}</p>
                {p.demographics && <p className="text-sm text-slate-500 mt-0.5">{p.demographics}</p>}
                {(p.pain_points ?? []).length > 0 && (
                  <p className="text-sm text-slate-700 mt-1.5">
                    <span className="font-bold text-[#6b21d6]">Pain points:</span> {(p.pain_points ?? []).slice(0, 4).join(" · ")}
                  </p>
                )}
                {p.where_to_reach && (
                  <p className="text-sm text-slate-700 mt-0.5">
                    <span className="font-bold text-[#6b21d6]">Where to reach:</span> {p.where_to_reach}
                  </p>
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
