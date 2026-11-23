// Research results saved in localStorage so reopening a past search costs no API calls.
export type ResearchKind = "trends" | "competitor" | "audience";

export interface SavedEntry<T> {
  key: string;
  label: string;
  updatedAt: number;
  data: T;
}

const MAX_SAVED = 20;
const storeKey = (kind: ResearchKind) => `snappy_research_${kind}_v1`;

function readStore<T>(kind: ResearchKind): Record<string, SavedEntry<T>> {
  try { return JSON.parse(localStorage.getItem(storeKey(kind)) ?? "{}"); } catch { return {}; }
}

function writeStore<T>(kind: ResearchKind, entries: [string, SavedEntry<T>][]) {
  while (entries.length) {
    try { localStorage.setItem(storeKey(kind), JSON.stringify(Object.fromEntries(entries))); return; }
    catch { entries = entries.slice(0, -1); }
  }
  try { localStorage.removeItem(storeKey(kind)); } catch { /* ignore */ }
}

export function listSaved<T>(kind: ResearchKind): SavedEntry<T>[] {
  return Object.values(readStore<T>(kind)).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getSaved<T>(kind: ResearchKind, key: string): SavedEntry<T> | null {
  return readStore<T>(kind)[key] ?? null;
}

export function putSaved<T>(kind: ResearchKind, key: string, label: string, data: T) {
  const store = readStore<T>(kind);
  store[key] = { key, label, updatedAt: Date.now(), data };
  writeStore(kind, Object.entries(store).sort((a, b) => b[1].updatedAt - a[1].updatedAt).slice(0, MAX_SAVED));
}

export function deleteSaved(kind: ResearchKind, key: string) {
  const store = readStore(kind);
  delete store[key];
  writeStore(kind, Object.entries(store));
}

export function savedAgo(ts?: number): string {
  if (!ts) return "";
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}
