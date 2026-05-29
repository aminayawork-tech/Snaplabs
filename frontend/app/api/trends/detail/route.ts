import { NextRequest } from "next/server";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { keyword, geo = "US", timeRange = "1y" } = await req.json();

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const gt = require("google-trends-api");
  const startTime = new Date();
  if (timeRange === "6m") startTime.setMonth(startTime.getMonth() - 6);
  else if (timeRange === "5y") startTime.setFullYear(startTime.getFullYear() - 5);
  else startTime.setFullYear(startTime.getFullYear() - 1);

  try {
    const raw = await gt.interestOverTime({ keyword, startTime, geo });
    const timelineData = JSON.parse(raw).default?.timelineData ?? [];

    const timeline: { date: string; value: number }[] = timelineData.map(
      (d: { formattedAxisTime?: string; formattedTime?: string; value: number[] }) => ({
        date: d.formattedAxisTime || d.formattedTime || "",
        value: d.value[0] ?? 0,
      })
    );

    let risingQueries: string[] = [];
    try {
      const relRaw = await gt.relatedQueries({ keyword, geo });
      const rankedList = JSON.parse(relRaw).default?.rankedList ?? [];
      const risingKws: { query: string }[] = rankedList[1]?.rankedKeyword ?? [];
      const topKws: { query: string }[] = rankedList[0]?.rankedKeyword ?? [];
      const merged = [...risingKws, ...topKws].filter((v, i, a) => a.findIndex(x => x.query === v.query) === i);
      risingQueries = merged.slice(0, 8).map((r) => r.query);
    } catch { /* skip */ }

    return Response.json({ timeline, rising_queries: risingQueries });
  } catch {
    return Response.json({ timeline: [], rising_queries: [] });
  }
}
