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
    {"keyword":"...","intent":"informational|commercial|transactional","difficulty":"low|medium|high"}
  ],
  "competitor_analysis": [
    {"name":"...","strengths":"...","weaknesses":"...","estimated_traffic":"..."}
  ],
  "quick_win_opportunities": [
    {"tactic":"...","timeline":"...","expected_impact":"...","effort":"low|medium|high"}
  ],
  "overall_marketing_score": {"score":0,"max_score":100,"summary":"One sentence summary"}
}

Be specific and actionable. Use real data from the scraped content.`;

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
      const result = await fc.crawlUrl(url, { limit: 10 });
      if (result.success && Array.isArray(result.data)) {
        markdown = result.data.map((p: { markdown?: string }) => p.markdown ?? "").join("\n\n");
        pagesCrawled = result.data.length;
      }
    } else {
      const result = await fc.scrapeUrl(url, { formats: ["markdown"] });
      if (result.success) markdown = result.markdown ?? "";
    }

    if (!markdown || markdown.trim().length < 30) {
      return { success: false, error: "Could not extract content from this site. Try enabling Deep Crawl." };
    }

    onProgress?.(1, "Extracting pages & structure");
    onProgress?.(2, "Running AI analysis");

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: SYSTEM,
      messages: [{ role: "user", content: PROMPT.replace("{url}", url).replace("{markdown}", markdown.slice(0, 14000)) }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return { success: false, error: "Could not parse AI response" };

    const research = JSON.parse(match[0]);
    return { success: true, research, pages_crawled: pagesCrawled };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
