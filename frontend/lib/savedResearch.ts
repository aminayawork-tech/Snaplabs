// Saved research: localStorage gives instant reads; /api/research (Redis) makes it follow you across browsers.
export type ResearchKind = "trends" | "competitor" | "audience" | "social";

export interface SavedEntry<T> {
  key: string;
  label: string;
  updatedAt: number;
  data: T;
}

const MAX_SAVED = 30;
const storeKey = (kind: ResearchKind) => `snappy_research_${kind}_v1`;
// Keys this browser has seen on the server; one missing from the server later was deleted elsewhere.
const syncedKey = (kind: ResearchKind) => `snappy_research_${kind}_synced_v1`;

function readJSON<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? "") ?? fallback; } catch { return fallback; }
}

function readStore<T>(kind: ResearchKind): Record<string, SavedEntry<T>> {
  return readJSON<Record<string, SavedEntry<T>>>(storeKey(kind), {});
}

function writeStore<T>(kind: ResearchKind, store: Record<string, SavedEntry<T>>) {
  let entries = Object.entries(store).sort((a, b) => b[1].updatedAt - a[1].updatedAt).slice(0, MAX_SAVED);
  while (entries.length) {
    try { localStorage.setItem(storeKey(kind), JSON.stringify(Object.fromEntries(entries))); return; }
    catch { entries = entries.slice(0, -1); }
  }
  try { localStorage.removeItem(storeKey(kind)); } catch { /* ignore */ }
}

function markSynced(kind: ResearchKind, keys: string[], replace = false) {
  const set = new Set(replace ? [] : readJSON<string[]>(syncedKey(kind), []));
  keys.forEach((k) => set.add(k));
  try { localStorage.setItem(syncedKey(kind), JSON.stringify([...set])); } catch { /* ignore */ }
}

async function pushRemote<T>(kind: ResearchKind, entry: SavedEntry<T>) {
  try {
    const res = await fetch("/api/research", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, ...entry }),
    });
    if (res.ok) markSynced(kind, [entry.key]);
  } catch { /* offline or not configured — stays local */ }
}

export function listSaved<T>(kind: ResearchKind): SavedEntry<T>[] {
  return Object.values(readStore<T>(kind)).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getSaved<T>(kind: ResearchKind, key: string): SavedEntry<T> | null {
  return readStore<T>(kind)[key] ?? null;
}

export function putSaved<T>(kind: ResearchKind, key: string, label: string, data: T) {
  const store = readStore<T>(kind);
  const entry = { key, label, updatedAt: Date.now(), data };
  store[key] = entry;
  writeStore(kind, store);
  void pushRemote(kind, entry);
}

export function deleteSaved(kind: ResearchKind, key: string) {
  const store = readStore(kind);
  delete store[key];
  writeStore(kind, store);
  void fetch(`/api/research?kind=${kind}&key=${encodeURIComponent(key)}`, { method: "DELETE" }).catch(() => {});
}

// Pull saved research from the server and merge it into this browser. Resolves true if the server was reachable.
export async function syncSaved<T>(kind: ResearchKind): Promise<boolean> {
  let remote: SavedEntry<T>[];
  try {
    const res = await fetch(`/api/research?kind=${kind}`, { cache: "no-store" });
    if (!res.ok) return false;
    remote = (await res.json()).entries ?? [];
  } catch {
    return false;
  }

  const store = readStore<T>(kind);
  const remoteKeys = new Set(remote.map((e) => e.key));
  const previouslySynced = new Set(readJSON<string[]>(syncedKey(kind), []));

  for (const entry of remote) {
    const local = store[entry.key];
    if (!local || local.updatedAt < entry.updatedAt) store[entry.key] = entry;
    else if (local.updatedAt > entry.updatedAt) void pushRemote(kind, local);
  }
  for (const [key, entry] of Object.entries(store)) {
    if (remoteKeys.has(key)) continue;
    if (previouslySynced.has(key)) delete store[key];   // deleted in another browser
    else void pushRemote(kind, entry);                 // saved here before syncing existed
  }

  writeStore(kind, store);
  markSynced(kind, [...remoteKeys], true);
  return true;
}

export function savedAgo(ts?: number): string {
  if (!ts) return "";
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}
