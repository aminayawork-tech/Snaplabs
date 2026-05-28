"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { AGENTS } from "@/lib/types";
import type { AgentOutput, ResearchData } from "@/lib/types";
import { renderMarkdown } from "@/lib/renderMarkdown";
import clsx from "clsx";

interface Props {
  researchData: ResearchData;
  bizName: string;
  initialOutputs?: Record<string, AgentOutput>;
  onAgentOutput?: (agentId: string, output: AgentOutput) => void;
}

export default function AgentGrid({ researchData, bizName, initialOutputs = {}, onAgentOutput }: Props) {
  const [outputs, setOutputs] = useState<Record<string, AgentOutput>>(initialOutputs);
  const [running, setRunning] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState(false);
  const [allProgress, setAllProgress] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const runSingle = async (agentId: string) => {
    if (running || runningAll) return;
    setRunning(agentId);
    let full = "";
    try {
      for await (const ev of api.agents.run({ agent_id: agentId, research_data: researchData, biz_name: bizName })) {
        if (ev.type === "text") full += ev.text as string;
      }
      if (full) {
        const ts = new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
        const out: AgentOutput = { output: full, timestamp: ts };
        setOutputs((o) => ({ ...o, [agentId]: out }));
        setExpanded((e) => ({ ...e, [agentId]: true }));
        onAgentOutput?.(agentId, out);
      }
    } finally {
      setRunning(null);
    }
  };

  const runAll = async () => {
    if (running || runningAll) return;
    setRunningAll(true);
    try {
      for await (const ev of api.agents.runAll({ research_data: researchData, biz_name: bizName })) {
        if (ev.type === "agent_start") {
          const meta = AGENTS.find((a) => a.id === ev.agent_id);
          setAllProgress(`Running ${(ev.index as number) + 1}/${ev.total as number}: ${meta?.label ?? ev.agent_id}…`);
        }
        if (ev.type === "agent_done") {
          const ts = new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
          const out: AgentOutput = { output: ev.output as string, timestamp: ts };
          const aid = ev.agent_id as string;
          setOutputs((o) => ({ ...o, [aid]: out }));
          setExpanded((e) => ({ ...e, [aid]: true }));
          onAgentOutput?.(aid, out);
        }
      }
      setAllProgress("All agents complete!");
    } finally {
      setRunningAll(false);
    }
  };

  const deleteOutput = (agentId: string) => {
    setOutputs((o) => { const n = { ...o }; delete n[agentId]; return n; });
    setExpanded((e) => { const n = { ...e }; delete n[agentId]; return n; });
  };

  return (
    <div>
      <h3 className="text-base font-bold text-slate-800 mb-1">Activate AI Agents</h3>
      <p className="text-xs text-slate-400 mb-4">
        Each agent uses your audit data as context and generates ready-to-use marketing content.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-3">
        {AGENTS.map((agent) => {
          const done = Boolean(outputs[agent.id]);
          const isRunning = running === agent.id;
          return (
            <button
              key={agent.id}
              onClick={() => runSingle(agent.id)}
              disabled={!!running || runningAll}
              className={clsx(
                "border rounded-xl px-3 py-2.5 text-xs font-semibold flex items-center gap-1.5 transition-all justify-center",
                done
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-white border-slate-200 text-slate-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand",
                (running || runningAll) && "opacity-50 cursor-not-allowed"
              )}
            >
              {isRunning ? (
                <div className="w-3 h-3 rounded-full border-2 border-slate-300 border-t-brand spin" />
              ) : done ? (
                <span>✓</span>
              ) : null}
              {agent.label}
            </button>
          );
        })}
      </div>

      <button
        onClick={runAll}
        disabled={!!running || runningAll}
        className="w-full bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] text-white font-bold rounded-xl py-3 text-sm shadow-md hover:shadow-lg hover:-translate-y-px transition-all disabled:opacity-60 disabled:cursor-not-allowed mb-2"
      >
        {runningAll ? "Running agents…" : "Run All 7 Agents — Do It For Me"}
      </button>

      {allProgress && (
        <p className="text-xs text-center text-slate-500 mb-4">{allProgress}</p>
      )}

      {/* Output cards */}
      {Object.entries(outputs).map(([aid, out]) => {
        const meta = AGENTS.find((a) => a.id === aid);
        const isOpen = expanded[aid] ?? false;
        return (
          <div key={aid} className="mb-2 border border-[#c4a8e8] rounded-xl overflow-hidden">
            <button
              onClick={() => setExpanded((e) => ({ ...e, [aid]: !e[aid] }))}
              className="w-full flex items-center justify-between px-4 py-3 text-left font-bold text-base text-[#6b21d6] transition hover:opacity-90"
              style={{ background: "#f3eef8" }}
            >
              <span>{meta?.label ?? aid} — {out.timestamp}</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => { e.stopPropagation(); deleteOutput(aid); }}
                  className="text-xs font-semibold text-slate-400 hover:text-red-500 transition px-1"
                  title="Delete output"
                >
                  ✕
                </button>
                <span className="text-lg text-[#6b21d6]">{isOpen ? "▾" : "▸"}</span>
              </div>
            </button>

            {isOpen && (
              <div className="px-4 py-4 bg-white text-sm text-slate-700 leading-relaxed">
                {renderMarkdown(out.output)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
