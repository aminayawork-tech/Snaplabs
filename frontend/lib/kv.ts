// Minimal Upstash Redis REST client. Vercel's Upstash integration sets KV_REST_API_URL / KV_REST_API_TOKEN;
// a direct Upstash setup uses UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN.
const url = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const kvConfigured = () => Boolean(url() && token());

export async function kv<T = unknown>(...command: (string | number)[]): Promise<T> {
  const res = await fetch(url()!, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) throw new Error(json.error ?? `KV request failed (${res.status})`);
  return json.result as T;
}
