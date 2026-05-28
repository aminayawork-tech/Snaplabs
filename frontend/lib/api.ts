import type { Client, ResearchData } from "./types";

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

// ── Generic fetch helpers ────────────────────────────────────────────────────

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function del(path: string): Promise<void> {
  const res = await fetch(`${BASE}${path}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await res.text());
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── SSE stream reader ────────────────────────────────────────────────────────

export async function* streamSSE(
  path: string,
  body: unknown,
  signal?: AbortSignal
): AsyncGenerator<Record<string, unknown>> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok || !res.body) throw new Error("Stream failed");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    const parts = buf.split("\n\n");
    buf = parts.pop() ?? "";

    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6);
      if (payload === "[DONE]") return;
      try {
        yield JSON.parse(payload) as Record<string, unknown>;
      } catch {
        // skip malformed
      }
    }
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export const api = {
  clients: {
    list: () => get<Client[]>("/clients"),
    get:  (id: number) =>
      get<{ client: Client; research: { research_data: ResearchData; pages_crawled?: number } | null; agent_runs: AgentRunRow[] }>(`/clients/${id}`),
    delete: (id: number) => del(`/clients/${id}`),
  },

  audit: (body: { url: string; biz_name: string; deep_crawl: boolean }, signal?: AbortSignal) =>
    streamSSE("/audit", body, signal),

  agents: {
    run: (body: { agent_id: string; research_data: ResearchData; biz_name: string; client_id?: number }) =>
      post<{ success: boolean; output?: string; error?: string }>("/agents/run", body),
    runAll: (body: { research_data: ResearchData; biz_name: string; client_id?: number }, signal?: AbortSignal) =>
      streamSSE("/agents/run-all", body, signal),
  },

  chat: (body: { message: string; research_data: ResearchData; history: { role: string; content: string }[] }, signal?: AbortSignal) =>
    streamSSE("/chat", body, signal),
};

export interface AgentRunRow {
  agent_type: string;
  output: string;
  timestamp: string;
}
