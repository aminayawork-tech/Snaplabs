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
    // Fetch Google Trends + Claude volume estimate in parallel
    const [raw, peakMonthly] = await Promise.all([
      gt.interestOverTime({ keyword, startTime, geo }),
      estimatePeakMonthly(keyword, geo),
    ]);

    const timelineData = JSON.parse(raw).default?.timelineData ?? [];

    // Scale 0-100 index to estimated monthly searches
    const timeline: { date: string; value: number }[] = timelineData.map(
      (d: { formattedAxisTime?: string; formattedTime?: string; value: number[] }) => ({
        date: d.formattedAxisTime || d.formattedTime || "",
        value: Math.round(((d.value[0] ?? 0) / 100) * peakMonthly),
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

    const currentMonthly = timeline[timeline.length - 1]?.value ?? 0;
    return Response.json({ timeline, rising_queries: risingQueries, peak_monthly: peakMonthly, current_monthly: currentMonthly });
  } catch {
    return Response.json({ timeline: [], rising_queries: [], peak_monthly: 0, current_monthly: 0 });
  }
}
