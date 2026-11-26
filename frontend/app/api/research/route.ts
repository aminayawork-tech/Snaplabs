import { NextRequest } from "next/server";
import { kv, kvConfigured } from "@/lib/kv";

export const dynamic = "force-dynamic";

const KINDS = new Set(["trends", "competitor", "audience", "social"]);
const MAX_ENTRIES = 50;
const MAX_BYTES = 900_000;

interface Entry { key: string; label: string; updatedAt: number; data: unknown }

const hashKey = (kind: string) => `research:${kind}`;

function parseEntries(flat: string[] | null): Entry[] {
  const out: Entry[] = [];
  for (let i = 1; i < (flat?.length ?? 0); i += 2) {
    try { out.push(JSON.parse(flat![i])); } catch { /* skip corrupt value */ }
  }
  return out.sort((a, b) => b.updatedAt - a.updatedAt);
}

function badKind(kind: string | null) {
  return !kind || !KINDS.has(kind);
}

export async function GET(req: NextRequest) {
  if (!kvConfigured()) return Response.json({ error: "not_configured" }, { status: 503 });
  const kind = req.nextUrl.searchParams.get("kind");
  if (badKind(kind)) return Response.json({ error: "Invalid kind" }, { status: 400 });
  try {
    const entries = parseEntries(await kv<string[]>("HGETALL", hashKey(kind!)));
    return Response.json({ entries: entries.slice(0, MAX_ENTRIES) });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 });
  }
}

export async function PUT(req: NextRequest) {
  if (!kvConfigured()) return Response.json({ error: "not_configured" }, { status: 503 });
  const { kind, key, label, data, updatedAt } = await req.json();
  if (badKind(kind) || typeof key !== "string" || !key || key.length > 300) {
    return Response.json({ error: "Invalid entry" }, { status: 400 });
  }
  const value = JSON.stringify({ key, label: String(label ?? key).slice(0, 300), updatedAt: Number(updatedAt) || Date.now(), data });
  if (value.length > MAX_BYTES) return Response.json({ error: "Entry too large" }, { status: 413 });
  try {
    await kv("HSET", hashKey(kind), key, value);
    const count = await kv<number>("HLEN", hashKey(kind));
    if (count > MAX_ENTRIES) {
      const stale = parseEntries(await kv<string[]>("HGETALL", hashKey(kind))).slice(MAX_ENTRIES).map((e) => e.key);
      if (stale.length) await kv("HDEL", hashKey(kind), ...stale);
    }
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!kvConfigured()) return Response.json({ error: "not_configured" }, { status: 503 });
  const kind = req.nextUrl.searchParams.get("kind");
  const key = req.nextUrl.searchParams.get("key");
  if (badKind(kind) || !key) return Response.json({ error: "Invalid request" }, { status: 400 });
  try {
    await kv("HDEL", hashKey(kind!), key);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 });
  }
}
