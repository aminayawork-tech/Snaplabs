"use client";
import { useRef, useState } from "react";
import { api } from "@/lib/api";
import { AGENTS } from "@/lib/types";
import type { AgentOutput as AgentOutputT, ResearchData } from "@/lib/types";
import AgentOutput, { CopyButton } from "./AgentOutput";
import clsx from "clsx";

interface Props {
  researchData: ResearchData;
  bizName: string;
  initialOutputs?: Record<string, AgentOutputT>;
  onAgentOutput?: (agentId: string, output: AgentOutputT) => void;
}

type Status = "queued" | "running" | "done" | "error";
interface Run { text: string; status: Status; timestamp?: string; error?: string }

const CONCURRENCY = 4;

const AGENT_BLURB: Record<string, string> = {
  content_engine: "Full blog post + calendar",
  seo: "Fixes, keywords, meta tags",
  paid_ads: "Google + Meta ad copy",
  social_media: "Posts + video scripts",
  email_sms: "5-email sequence + SMS",
  lead_gen: "Landing page + lead magnet",
  review_referral: "Review & referral scripts",
};

const words = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);
const stamp = () => new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

export default function AgentGrid({ researchData, bizName, initialOutputs = {}, onAgentOutput }: Props) {
  const [runs, setRuns] = useState<Record<string, Run>>(() =>
    Object.fromEntries(Object.entries(initialOutputs).map(([id, o]) => [id, { text: o.output, status: "done" as Status, timestamp: o.timestamp }]))
  );
  const [active, setActive] = useState<string | null>(() => Object.keys(initialOutputs)[0] ?? null);
  const aborts = useRef<Record<string, AbortController>>({});

  const patch = (id: string, p: Partial<Run>) =>
    setRuns((r) => ({ ...r, [id]: { ...(r[id] ?? { text: "", status: "queued" }), ...p } }));

  const runOne = async (agentId: string) => {
    aborts.current[agentId]?.abort();
    const ctrl = new AbortController();
    aborts.current[agentId] = ctrl;
    patch(agentId, { text: "", status: "running", error: undefined });
    setActive((a) => a ?? agentId);

    let full = "";
    let last = 0;
    try {
      for await (const ev of api.agents.run({ agent_id: agentId, research_data: researchData, biz_name: bizName }, ctrl.signal)) {
        if (ev.type === "text") {
          full += ev.text as string;
          if (Date.now() - last > 120) {
            last = Date.now();
            patch(agentId, { text: full });
          }
        }
        if (ev.type === "error") throw new Error(ev.text as string);
      }
      if (!full) throw new Error("The agent returned no output.");
      const ts = stamp();
      patch(agentId, { text: full, status: "done", timestamp: ts });
      onAgentOutput?.(agentId, { output: full, timestamp: ts });
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      patch(agentId, { text: full, status: "error", error: (e as Error).message });
    }
  };

  const runAll = async () => {
    const pending = AGENTS.filter((a) => runs[a.id]?.status !== "done" && runs[a.id]?.status !== "running").map((a) => a.id);
    const queue = pending.length ? pending : AGENTS.map((a) => a.id);
    queue.forEach((id) => patch(id, { status: "queued", text: "", error: undefined }));
    setActive((a) => a ?? queue[0]);
    const worker = async () => {
      for (let id = queue.shift(); id; id = queue.shift()) await runOne(id);
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));
  };

  const remove = (agentId: string) => {
    aborts.current[agentId]?.abort();
    setRuns((r) => { const n = { ...r }; delete n[agentId]; return n; });
    setActive((a) => (a === agentId ? Object.keys(runs).find((k) => k !== agentId) ?? null : a));
  };

  const download = (agentId: string, text: string) => {
    const label = AGENTS.find((a) => a.id === agentId)?.label ?? agentId;
    const blob = new Blob([text], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(bizName || "business").replace(/\W+/g, "-").toLowerCase()}-${label.replace(/\W+/g, "-").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const statuses = Object.values(runs).map((r) => r.status);
  const busy = statuses.some((s) => s === "running" || s === "queued");
  const doneCount = AGENTS.filter((a) => runs[a.id]?.status === "done").length;
  const runningCount = statuses.filter((s) => s === "running").length;
  const tabs = AGENTS.filter((a) => runs[a.id]);
  const current = active && runs[active] ? active : tabs[0]?.id ?? null;
  const run = current ? runs[current] : null;

  return (
    <div>
      <div className="flex items-end justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h3 className="text-base font-bold text-slate-800 mb-1">Activate AI Agents</h3>
          <p className="text-xs text-slate-400">Each agent uses your audit as context and writes ready-to-publish deliverables. Agents run in parallel.</p>
        </div>
        {busy && (
          <p className="text-xs font-semibold text-[#275fe8] flex items-center gap-2">
            <span className="w-3 h-3 rounded-full border-2 border-[#bfdbfe] border-t-[#275fe8] animate-spin" />
            {runningCount} writing · {doneCount}/{AGENTS.length} done
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-3">
        {AGENTS.map((agent) => {
          const r = runs[agent.id];
          const s = r?.status;
          return (
            <button
              key={agent.id}
              onClick={() => (s === "done" || s === "running" ? setActive(agent.id) : s === "queued" ? undefined : runOne(agent.id))}
              className={clsx(
                "border rounded-xl px-3 py-2.5 text-left transition-all",
                current === agent.id && r ? "ring-2 ring-[#275fe8]/30" : "",
                s === "done" ? "bg-[#eff6ff] border-[#bfdbfe]"
                  : s === "running" ? "bg-white border-[#275fe8]"
                  : s === "error" ? "bg-red-50 border-red-200"
                  : "bg-white border-slate-200 hover:border-[#93c5fd] hover:bg-[#f8fbff]"
              )}
            >
              <div className="flex items-center gap-1.5">
                {s === "running" && <span className="w-3 h-3 rounded-full border-2 border-slate-200 border-t-[#275fe8] animate-spin flex-shrink-0" />}
                {s === "done" && <span className="text-[#275fe8] text-xs">✓</span>}
                <span className={clsx("text-xs font-bold", s === "done" ? "text-[#275fe8]" : s === "error" ? "text-red-600" : "text-slate-800")}>{agent.label}</span>
              </div>
              <p className="text-[0.6875rem] text-slate-400 mt-0.5 truncate">
                {s === "running" ? `Writing… ${words(r.text)} words`
                  : s === "queued" ? "Queued"
                  : s === "done" ? `${words(r.text)} words · view`
                  : s === "error" ? "Failed — click to retry"
                  : AGENT_BLURB[agent.id]}
              </p>
            </button>
          );
        })}
      </div>

      <button
        onClick={runAll}
        disabled={busy}
        className="w-full bg-gradient-to-r from-[#275fe8] to-[#1a4fd0] text-white font-bold rounded-xl py-3 text-sm shadow-md hover:shadow-lg hover:-translate-y-px transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 mb-6"
      >
        {busy ? `Running ${runningCount} agents in parallel…` : doneCount === AGENTS.length ? "Re-run All 7 Agents" : doneCount > 0 ? `Run Remaining ${AGENTS.length - doneCount} Agents` : "Run All 7 Agents — Do It For Me"}
      </button>

      {current && run && (
        <div className="border border-slate-200 rounded-2xl bg-slate-50/50 overflow-hidden">
          <div className="flex gap-1 px-2 pt-2 overflow-x-auto border-b border-slate-200 bg-white">
            {tabs.map((t) => {
              const r = runs[t.id];
              return (
                <button key={t.id} onClick={() => setActive(t.id)}
                  className={clsx("flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 whitespace-nowrap transition",
                    current === t.id ? "border-[#275fe8] text-[#275fe8] bg-[#eff6ff]" : "border-transparent text-slate-500 hover:text-slate-800")}>
                  {r.status === "running" && <span className="w-2.5 h-2.5 rounded-full border-2 border-slate-200 border-t-[#275fe8] animate-spin" />}
                  {r.status === "queued" && <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
                  {r.status === "error" && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-3 px-4 py-3 flex-wrap">
            <p className="text-xs text-slate-500">
              <span className="font-bold text-slate-800">{AGENTS.find((a) => a.id === current)?.label} Agent</span>
              {run.timestamp && run.status === "done" && <> · {run.timestamp}</>}
              {run.text && <> · {words(run.text).toLocaleString()} words</>}
            </p>
            {run.status === "done" && (
              <div className="flex items-center gap-1.5">
                <CopyButton text={run.text} label="Copy all" />
                <button onClick={() => download(current, run.text)} className="text-[0.6875rem] font-semibold px-2.5 py-1 rounded-lg border bg-white border-slate-200 text-slate-500 hover:border-[#275fe8] hover:text-[#275fe8] transition">Download .md</button>
                <button onClick={() => runOne(current)} className="text-[0.6875rem] font-semibold px-2.5 py-1 rounded-lg border bg-white border-slate-200 text-slate-500 hover:border-[#275fe8] hover:text-[#275fe8] transition">Re-run</button>
                <button onClick={() => remove(current)} className="text-[0.6875rem] font-semibold px-2 py-1 rounded-lg text-slate-400 hover:text-red-500 transition" title="Remove output">✕</button>
              </div>
            )}
          </div>

          <div className="px-4 pb-4">
            {run.status === "queued" && <p className="text-sm text-slate-400 py-10 text-center">Waiting for a free slot…</p>}
            {run.status === "error" && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-3 flex items-center justify-between gap-3">
                <span>{run.error}</span>
                <button onClick={() => runOne(current)} className="font-semibold underline flex-shrink-0">Retry</button>
              </div>
            )}
            {run.status === "running" && !run.text && (
              <p className="text-sm text-slate-400 py-10 text-center">Reading your audit and starting to write…</p>
            )}
            {run.text && <AgentOutput agentId={current} text={run.text} streaming={run.status === "running"} />}
          </div>
        </div>
      )}
    </div>
  );
}
