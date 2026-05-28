import type { ResearchData } from "./types";

// All API calls go to Next.js route handlers — no separate backend needed
async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function* streamSSE(
  path: string,
  body: unknown,
  signal?: AbortSignal
): AsyncGenerator<Record<string, unknown>> {
  const res = await fetch(path, {
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
      try { yield JSON.parse(payload); } catch { /* skip malformed */ }
    }
  }
}

export const api = {
  audit: (body: { url: string; biz_name: string; deep_crawl: boolean }, signal?: AbortSignal) =>
    streamSSE("/api/audit", body, signal),

  agents: {
    run: (body: { agent_id: string; research_data: ResearchData; biz_name: string; task_override?: string }) =>
      post<{ success: boolean; output?: string; error?: string }>("/api/agents/run", body),
    runAll: (body: { research_data: ResearchData; biz_name: string }, signal?: AbortSignal) =>
      streamSSE("/api/agents/run-all", body, signal),
  },

  chat: (body: { message: string; research_data: ResearchData; history: { role: string; content: string }[] }, signal?: AbortSignal) =>
    streamSSE("/api/chat", body, signal),
};
