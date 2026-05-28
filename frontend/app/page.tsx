"use client";
import { useState, useCallback } from "react";
import Nav from "@/components/Nav";
import HomeView from "@/components/HomeView";
import RunningView from "@/components/RunningView";
import ResultsView from "@/components/ResultsView";
import SavedView from "@/components/SavedView";
import { api } from "@/lib/api";
import type { View, AuditResult, AgentOutput } from "@/lib/types";

interface PendingAudit {
  url: string;
  bizName: string;
  deepCrawl: boolean;
}

export default function App() {
  const [view, setView]               = useState<View>("home");
  const [pending, setPending]         = useState<PendingAudit | null>(null);
  const [auditStep, setAuditStep]     = useState(0);
  const [result, setResult]           = useState<AuditResult | null>(null);
  const [bizName, setBizName]         = useState("");
  const [agentOutputs, setAgentOutputs] = useState<Record<string, AgentOutput>>({});
  const [auditError, setAuditError]   = useState("");

  const startAudit = useCallback((url: string, bName: string, deepCrawl: boolean) => {
    setBizName(bName);
    setPending({ url, bizName: bName, deepCrawl });
    setAuditStep(0);
    setResult(null);
    setAgentOutputs({});
    setAuditError("");
    setView("running");
  }, []);

  const handleAuditDone = useCallback((r: AuditResult) => {
    setResult(r);
    setAgentOutputs({});
    setView("results");
  }, []);

  const handleAuditError = useCallback((msg: string) => {
    setAuditError(msg);
    setView("home");
  }, []);

  const openSavedClient = useCallback(async (clientId: number) => {
    try {
      const { client, research, agent_runs } = await api.clients.get(clientId);
      if (!research) return;

      const outputs: Record<string, AgentOutput> = {};
      for (const run of agent_runs ?? []) {
        if (!outputs[run.agent_type]) {
          outputs[run.agent_type] = { output: run.output, timestamp: run.timestamp, saved: true };
        }
      }

      setBizName(client.name);
      setResult({
        data: research.research_data,
        pages_crawled: research.pages_crawled ?? 1,
        client_id: clientId,
      });
      setAgentOutputs(outputs);
      setView("results");
    } catch (e) {
      console.error("Failed to load client:", e);
    }
  }, []);

  const handleNav = useCallback((v: View) => {
    if (v === "running") return;
    setView(v);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav view={view} onNav={handleNav} hasAudit={Boolean(result)} />

      {/* Content area: offset right on desktop, offset bottom on mobile */}
      <main className="md:ml-[220px] pb-[72px] md:pb-0 px-4 md:px-8 max-w-[720px] md:max-w-none xl:max-w-[800px] pt-6 mx-auto md:mx-0">
        {view === "home" && (
          <HomeView
            onStartAudit={startAudit}
            onOpenSaved={openSavedClient}
            onNav={handleNav}
          />
        )}

        {view === "running" && pending && (
          <>
            {auditError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm">
                {auditError}
              </div>
            )}
            <RunningView
              url={pending.url}
              bizName={pending.bizName}
              deepCrawl={pending.deepCrawl}
              step={auditStep}
              onSetStep={setAuditStep}
              onDone={handleAuditDone}
              onError={handleAuditError}
            />
          </>
        )}

        {view === "results" && result && (
          <ResultsView
            result={result}
            bizName={bizName}
            initialAgentOutputs={agentOutputs}
          />
        )}

        {view === "saved" && (
          <SavedView onOpen={openSavedClient} />
        )}
      </main>
    </div>
  );
}
