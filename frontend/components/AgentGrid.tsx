"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { AGENTS } from "@/lib/types";
import type { AgentOutput, ResearchData } from "@/lib/types";
import Section from "./Section";
import clsx from "clsx";

interface Props {
  researchData: ResearchData;
  bizName: string;
  clientId?: number;
  initialOutputs?: Record<string, AgentOutput>;
}

export default function AgentGrid({ researchData, bizName, clientId, initialOutputs = {} }: Props) {
  const [outputs, setOutputs] = useState<Record<string, AgentOutput>>(initialOutputs);
  const [running, setRunning] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState(false);
  const [allProgress, setAllProgress] = useState("");

  const runAgent = async (agentId: string) => {
    if (running || runningAll) return;
    setRunning(agentId);
    try {
      const res = await api.agents.run({ agent_id: agentId, research_data: researchData, biz_name: bizName, client_id: clientId });
      if (res.success && res.output) {
        const ts = new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
        setOutputs((o) => ({ ...o, [agentId]: { output: res.output!, timestamp: ts } }));
      }
    } finally {
      setRunning(null);
    }
  };

  const runAll = async () => {
    if (running || runningAll) return;
    setRunningAll(true);
    try {
      for await (const ev of api.agents.runAll({ research_data: researchData, biz_name: bizName, client_id: clientId })) {
        if (ev.type === "agent_start") {
          const meta = AGENTS.find((a) => a.id === ev.agent_id);
          setAllProgress(`Running ${(ev.index as number) + 1}/${ev.total as number}: ${meta?.label ?? ev.agent_id}...`);
        }
        if (ev.type === "agent_done") {
          const ts = new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
          setOutputs((o) => ({ ...o, [ev.agent_id as string]: { output: ev.output as string, timestamp: ts } }));
        }
      }
      setAllProgress("All agents complete!");
    } finally {
      setRunningAll(false);
    }
  };

  return (
    <div>
      <h3 className="text-base font-bold text-slate-800 mb-1">Activate AI Agents</h3>
      <p className="text-xs text-slate-400 mb-4">
        Each agent uses your audit data as context and generates ready-to-use marketing content.
      </p>

      {/* 7-agent grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-3">
        {AGENTS.map((agent) => {
          const done = Boolean(outputs[agent.id]);
          const isRunning = running === agent.id;
          return (
            <button
              key={agent.id}
              onClick={() => runAgent(agent.id)}
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

      {/* Run All */}
      <button
        onClick={runAll}
        disabled={!!running || runningAll}
        className="w-full bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] text-white font-bold rounded-xl py-3 text-sm shadow-md hover:shadow-lg hover:-translate-y-px transition-all disabled:opacity-60 disabled:cursor-not-allowed mb-2"
      >
        {runningAll ? "Running all agents…" : "Run All 7 Agents — Do It For Me"}
      </button>

      {allProgress && (
        <p className="text-xs text-center text-slate-500 mb-4">{allProgress}</p>
      )}

      {/* Output cards */}
      {Object.entries(outputs).map(([aid, out]) => {
        const meta = AGENTS.find((a) => a.id === aid);
        return (
          <Section key={aid} title={`${meta?.label ?? aid} — ${out.timestamp}`}>
            <div className="prose text-sm whitespace-pre-wrap">{out.output}</div>
          </Section>
        );
      })}
    </div>
  );
}
