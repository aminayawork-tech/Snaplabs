import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

async function estimatePeakMonthly(keyword: string, geo: string): Promise<number> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });
  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 80,
      messages: [{
        role: "user",
        content: `Estimate the PEAK monthly Google search volume for "${keyword}" in ${geo === "US" ? "the United States" : "worldwide"}.

Return ONLY JSON with no markdown: {"monthly_searches": number}

Scale:
- Major brand/celebrity/broad term: 500K–5M
- Popular topic: 100K–500K
- Medium niche: 20K–100K
- Small niche: 5K–20K
- Long-tail: 500–5K`,
      }],
    });
    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = match ? JSON.parse(match[0]) : {};
    return Math.max(100, parsed.monthly_searches ?? 1000);
  } catch {
    return 1000;
  }
}

export async function POST(req: NextRequest) {
  const { keyword, geo = "US", timeRange = "1y" } = await req.json();

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const gt = require("google-trends-api");
  const startTime = new Date();
  if (timeRange === "6m") startTime.setMonth(startTime.getMonth() - 6);
  else if (timeRange === "5y") startTime.setFullYear(startTime.getFullYear() - 5);
  else startTime.setFullYear(startTime.getFullYear() - 1);

  try {
    // Phase 1: timeline + volume estimate in parallel (only one Google Trends call)
    const [raw, peakMonthly] = await Promise.all([
      gt.interestOverTime({ keyword, startTime, geo }),
      estimatePeakMonthly(keyword, geo),
    ]);

    const timelineData = JSON.parse(raw).default?.timelineData ?? [];
    const timeline: { date: string; value: number }[] = timelineData.map(
      (d: { formattedAxisTime?: string; formattedTime?: string; value: number[] }) => ({
        date: d.formattedAxisTime || d.formattedTime || "",
        value: Math.round(((d.value[0] ?? 0) / 100) * peakMonthly),
      })
    );

    // Small delay before Phase 2 to avoid Google Trends rate-limiting
    await new Promise(r => setTimeout(r, 400));

    // Phase 2: related queries + regions sequentially to stay safe
    let relatedQueries: { query: string; value: number }[] = [];
    let risingQueries: string[] = [];
    try {
      const relRaw = await gt.relatedQueries({ keyword, geo });
      const rankedList = JSON.parse(relRaw).default?.rankedList ?? [];
      const topKws: { query: string; value: number }[] = rankedList[0]?.rankedKeyword ?? [];
      const risingKws: { query: string; value: number }[] = rankedList[1]?.rankedKeyword ?? [];
      relatedQueries = topKws.slice(0, 14).map(r => ({ query: r.query, value: r.value }));
      const topSet = new Set(topKws.map(r => r.query));
      const merged = [...risingKws.filter(r => !topSet.has(r.query)), ...topKws]
        .filter((v, i, a) => a.findIndex(x => x.query === v.query) === i);
      risingQueries = merged.slice(0, 8).map(r => r.query);
    } catch { /* skip */ }

    await new Promise(r => setTimeout(r, 300));

    let regions: { region: string; value: number }[] = [];
    try {
      const regRaw = await gt.interestByRegion({ keyword, geo, resolution: "COUNTRY" });
      const geoData = JSON.parse(regRaw).default?.geoMapData ?? [];
      regions = (geoData as { geoName: string; value: number[] }[])
        .filter(r => (r.value[0] ?? 0) > 0)
        .sort((a, b) => (b.value[0] ?? 0) - (a.value[0] ?? 0))
        .slice(0, 8)
        .map(r => ({ region: r.geoName, value: r.value[0] ?? 0 }));
    } catch { /* skip */ }

    // YoY growth from timeline
    let yoyGrowth = 0;
    if (timeline.length >= 24) {
      const recent = timeline.slice(-12).reduce((s, d) => s + d.value, 0) / 12;
      const prior  = timeline.slice(-24, -12).reduce((s, d) => s + d.value, 0) / 12;
      yoyGrowth = prior > 0 ? Math.round(((recent - prior) / prior) * 100) : 0;
    }

    const currentMonthly = timeline[timeline.length - 1]?.value ?? 0;
    return Response.json({
      timeline,
      related_queries: relatedQueries,
      rising_queries: risingQueries,
      regions,
      peak_monthly: peakMonthly,
      current_monthly: currentMonthly,
      yoy_growth: yoyGrowth,
    });
  } catch {
    return Response.json({ timeline: [], related_queries: [], rising_queries: [], regions: [], peak_monthly: 0, current_monthly: 0, yoy_growth: 0 });
  }
}
