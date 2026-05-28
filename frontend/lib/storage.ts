import type { ResearchData, AgentOutput } from "./types";

export interface SavedAudit {
  id: string;
  name: string;
  website_url: string;
  created_at: string;
  research_data: ResearchData;
  pages_crawled: number;
  agent_outputs: Record<string, AgentOutput>;
  score: number;
  industry: string;
}

const KEY = "snappy_audits_v2";

function load(): SavedAudit[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); }
  catch { return []; }
}

function persist(audits: SavedAudit[]) {
  localStorage.setItem(KEY, JSON.stringify(audits));
}

export const storage = {
  list(): SavedAudit[] {
    return load().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },
  get(id: string): SavedAudit | null {
    return load().find((a) => a.id === id) ?? null;
  },
  upsert(audit: SavedAudit) {
    persist([audit, ...load().filter((a) => a.id !== audit.id)]);
  },
  addAgentOutput(id: string, agentId: string, output: AgentOutput) {
    const audits = load();
    const i = audits.findIndex((a) => a.id === id);
    if (i >= 0) {
      audits[i].agent_outputs = { ...audits[i].agent_outputs, [agentId]: output };
      persist(audits);
    }
  },
  delete(id: string) {
    persist(load().filter((a) => a.id !== id));
  },
};
