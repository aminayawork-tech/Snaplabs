import { NextRequest } from "next/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

interface TrendPoint { time: string; value: number[] }
interface RankedKw { query: string; value: number }

function calcGrowth(data: TrendPoint[]): number {
  if (data.length < 4) return 0;
  const half = Math.floor(data.length / 2);
  const avg = (slice: TrendPoint[]) => slice.reduce((s, d) => s + (d.value[0] ?? 0), 0) / slice.length;
  const first = avg(data.slice(0, half));
  const second = avg(data.slice(half));
  if (first === 0) return second > 0 ? 100 : 0;
  return Math.round(((second - first) / first) * 100);
}

export async function POST(req: NextRequest) {
  const { keywords, geo = "US" } = await req.json();
  if (!Array.isArray(keywords) || keywords.length === 0) return Response.json({ results: [] });

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const gt = require("google-trends-api");
  const startTime = new Date();
  startTime.setFullYear(startTime.getFullYear() - 1);

  const results = [];
  for (const keyword of (keywords as string[]).slice(0, 10)) {
    try {
      const raw = await gt.interestOverTime({ keyword, startTime, geo });
      const data: TrendPoint[] = JSON.parse(raw).default?.timelineData ?? [];
      const sparkline = data.map((d: TrendPoint) => d.value[0] ?? 0);
      const growth = calcGrowth(data);
      const current = sparkline[sparkline.length - 1] ?? 0;

      let rising: string[] = [];
      try {
        const relRaw = await gt.relatedQueries({ keyword, geo });
        const ranked: RankedKw[] = JSON.parse(relRaw).default?.rankedList?.[1]?.rankedKeyword ?? [];
        rising = ranked.slice(0, 6).map((r) => r.query);
      } catch { /* skip if related queries fail */ }

      results.push({ keyword, sparkline, growth_pct: growth, current_interest: current, rising_queries: rising });
      await new Promise((r) => setTimeout(r, 250));
    } catch {
      results.push({ keyword, sparkline: [], growth_pct: 0, current_interest: 0, rising_queries: [] });
    }
  }

  return Response.json({ results });
}
