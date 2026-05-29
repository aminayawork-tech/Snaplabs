import Anthropic from "@anthropic-ai/sdk";

const SYSTEM = `You are a world-class marketing strategist and business intelligence analyst.
Analyze scraped website content and return a comprehensive marketing audit in strict JSON format.`;

const PROMPT = `Analyze the scraped website content below.

WEBSITE URL: {url}

SCRAPED CONTENT:
{markdown}

Return a strict JSON object with EXACTLY these keys (no markdown fences):
{
  "business_name": "The company name",
  "industry": "Primary industry/niche",
  "location": "City, State/Country or 'Online/National'",
  "target_audience": [
    {"persona_name":"...","demographics":"...","pain_points":["..."],"where_to_reach":"..."}
  ],
  "services_offered": ["service 1","service 2"],
  "current_marketing_strengths": ["strength 1","strength 2"],
  "current_marketing_gaps": ["gap 1","gap 2","gap 3"],
  "top_10_longtail_keywords": [
    {
      "keyword": "...",
      "intent": "informational|commercial|transactional",
      "difficulty": "low|medium|high",
      "monthly_searches": "e.g. '100-500' or '1K-5K'"
    }
  ],
  "competitor_analysis": [
    {
      "name": "...",
      "url": "https://theirwebsite.com",
      "strengths": "one sentence",
      "weaknesses": "one sentence",
      "estimated_traffic": "e.g. '10K-50K/mo'",
      "top_ranking_keywords": ["keyword 1", "keyword 2", "keyword 3"]
    }
  ],
  "quick_win_opportunities": [
    {
      "tactic": "...",
      "timeline": "...",
      "expected_impact": "one sentence",
      "effort": "low|medium|high",
      "how_to_steps": ["Step 1: ...", "Step 2: ..."]
    }
  ],
  "overall_marketing_score": {"score":0,"max_score":100,"summary":"One sentence summary"}
}

Be specific and actionable. Use real data from the scraped content.`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchPAA(fc: any, keyword: string): Promise<string[]> {
  try {
    const url = `https://www.google.com/search?q=${encodeURIComponent(keyword)}&hl=en`;
    const res = await fc.scrapeUrl(url, { formats: ["markdown"] });
    if (!res.success || !res.markdown) return [];
    const md: string = res.markdown;
    const idx = md.search(/people\s+also\s+ask/i);
    if (idx === -1) return [];
    return md.slice(idx, idx + 4000)
      .split("\n")
      .map((l: string) => l.replace(/^[\s#*\->[\]|]+/, "").trim())
      .filter((l: string) => l.endsWith("?") && l.length > 15 && l.length < 260)
      .slice(0, 6);
  } catch {
    return [];
  }
}

export async function runResearch(
  url: string,
  deepCrawl: boolean,
  onProgress?: (step: number, label: string) => void
): Promise<{ success: boolean; research?: Record<string, unknown>; pages_crawled?: number; error?: string }> {
  onProgress?.(0, "Scraping website content");

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const FirecrawlApp = require("@mendable/firecrawl-js").default;
    const fc = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY ?? "" });

    let markdown = "";
    let pagesCrawled = 1;

    if (deepCrawl) {
      const result = await fc.crawlUrl(url, { limit: 50 });
      if (result.success && Array.isArray(result.data)) {
        markdown = result.data.map((p: { markdown?: string }) => p.markdown ?? "").join("\n\n");
        pagesCrawled = result.data.length;
      }
    } else {
      const result = await fc.crawlUrl(url, { limit: 5 });
      if (result.success && Array.isArray(result.data)) {
        markdown = result.data.map((p: { markdown?: string }) => p.markdown ?? "").join("\n\n");
        pagesCrawled = result.data.length;
      } else {
        const single = await fc.scrapeUrl(url, { formats: ["markdown"] });
        if (single.success) markdown = single.markdown ?? "";
      }
    }

    if (!markdown || markdown.trim().length < 30) {
      return { success: false, error: "Could not extract content from this site. Try enabling Deep Crawl." };
    }

    onProgress?.(1, "Extracting pages & structure");
    onProgress?.(2, "Running AI analysis");

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: SYSTEM,
      messages: [{ role: "user", content: PROMPT.replace("{url}", url).replace("{markdown}", markdown.slice(0, 30000)) }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return { success: false, error: "Could not extract JSON from AI response. Please try again." };

    let research: Record<string, unknown>;
    try {
      research = JSON.parse(match[0]);
    } catch {
      // Response was truncated — try trimming to last valid field boundary
      const raw = match[0];
      const lastComma = raw.lastIndexOf('",');
      if (lastComma > 100) {
        try {
          research = JSON.parse(raw.slice(0, lastComma + 1) + '"}}');
        } catch {
          return { success: false, error: "Audit response was truncated. Please try again (reduce crawl pages or disable deep crawl)." };
        }
      } else {
        return { success: false, error: "Audit response was truncated. Please try again." };
      }
    }

    // Scrape Google PAA for top keywords in parallel
    onProgress?.(3, "Fetching People Also Ask from Google");
    const rawKws = (research.top_10_longtail_keywords ?? []) as (string | { keyword: string })[];
    const topKws = rawKws.slice(0, 4).map(k => (typeof k === "string" ? k : k.keyword)).filter(Boolean);

    const paaResults = await Promise.allSettled(topKws.map(kw => fetchPAA(fc, kw)));
    const paa: Record<string, string[]> = {};
    paaResults.forEach((r, i) => {
      if (r.status === "fulfilled" && r.value.length > 0) paa[topKws[i]] = r.value;
    });
    if (Object.keys(paa).length > 0) research.people_also_ask = paa;

    return { success: true, research, pages_crawled: pagesCrawled };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
