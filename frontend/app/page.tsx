"use client";
import { useState, useCallback } from "react";
import Nav from "@/components/Nav";
import HomeView from "@/components/HomeView";
import RunningView from "@/components/RunningView";
import ResultsView from "@/components/ResultsView";
import SavedView from "@/components/SavedView";
import TrendsView from "@/components/TrendsView";
import { storage } from "@/lib/storage";
import type { View, AuditResult, AgentOutput, Keyword } from "@/lib/types";

interface PendingAudit { url: string; bizName: string; deepCrawl: boolean; }

export default function App() {
  const [view, setView]           = useState<View>("home");
  const [pending, setPending]     = useState<PendingAudit | null>(null);
  const [auditStep, setAuditStep] = useState(0);
  const [auditId, setAuditId]     = useState<string | null>(null);
  const [result, setResult]       = useState<AuditResult | null>(null);
  const [bizName, setBizName]     = useState("");
  const [agentOutputs, setAgentOutputs] = useState<Record<string, AgentOutput>>({});
  const [auditError, setAuditError] = useState("");

  const startAudit = useCallback((url: string, bName: string, deepCrawl: boolean) => {
    setBizName(bName);
    setPending({ url, bizName: bName, deepCrawl });
    setAuditStep(0);
    setResult(null);
    setAgentOutputs({});
    setAuditError("");
    setView("running");
  }, []);

  const handleAuditDone = useCallback((r: AuditResult, bName: string) => {
    const id = `${Date.now()}`;
    setAuditId(id);
    setResult(r);
    setAgentOutputs({});

    const rawScore = r.data.overall_marketing_score;
    const score = typeof rawScore === "number" ? rawScore : (rawScore?.score ?? 0);

    storage.upsert({
      id,
      name: bName || r.data.business_name || "Untitled",
      website_url: pending?.url ?? "",
      created_at: new Date().toISOString(),
      research_data: r.data,
      pages_crawled: r.pages_crawled,
      agent_outputs: {},
      score,
      industry: r.data.industry ?? "",
    });

    setView("results");
  }, [pending]);

  const handleAuditError = useCallback((msg: string) => {
    setAuditError(msg);
    setView("home");
  }, []);

  const openSaved = useCallback((id: string) => {
    const saved = storage.get(id);
    if (!saved) return;
    setAuditId(id);
    setBizName(saved.name);
    setResult({ data: saved.research_data, pages_crawled: saved.pages_crawled });
    setAgentOutputs(saved.agent_outputs ?? {});
    setView("results");
  }, []);

  const handleAgentOutput = useCallback((agentId: string, output: AgentOutput) => {
    setAgentOutputs((prev) => {
      const next = { ...prev, [agentId]: output };
      if (auditId) storage.addAgentOutput(auditId, agentId, output);
      return next;
    });
  }, [auditId]);

  const handleNav = useCallback((v: View) => {
    if (v === "running") return;
    setView(v);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav view={view} onNav={handleNav} hasAudit={Boolean(result)} />

      <main className="md:ml-[220px] pb-[72px] md:pb-8 px-4 md:px-8 pt-6 max-w-[720px] mx-auto md:mx-0 md:max-w-none">
        {auditError && view === "home" && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm">
            {auditError}
          </div>
        )}

        {view === "home" && (
          <HomeView onStartAudit={startAudit} onOpenSaved={openSaved} onNav={handleNav} />
        )}
        {view === "running" && pending && (
          <RunningView
            url={pending.url}
            bizName={pending.bizName}
            deepCrawl={pending.deepCrawl}
            step={auditStep}
            onSetStep={setAuditStep}
            onDone={(r) => handleAuditDone(r, pending.bizName)}
            onError={handleAuditError}
          />
        )}
        {view === "results" && result && (
          <ResultsView
            result={result}
            bizName={bizName}
            initialAgentOutputs={agentOutputs}
            onAgentOutput={handleAgentOutput}
          />
        )}
        {view === "saved" && (
          <SavedView onOpen={openSaved} />
        )}
        {view === "trends" && (
          <TrendsView
            auditKeywords={(result?.data.top_10_longtail_keywords ?? []) as (string | Keyword)[]}
            bizName={bizName || undefined}
          />
        )}
      </main>
    </div>
  );
}
