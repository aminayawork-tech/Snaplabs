import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url) return Response.json({ error: "URL required" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const FirecrawlApp = require("@mendable/firecrawl-js").default;
  const fc = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY ?? "" });
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });

  try {
    const scraped = await fc.scrapeUrl(url, { formats: ["markdown"] });
    const markdown = (scraped?.markdown ?? scraped?.data?.markdown ?? "").slice(0, 12000);

    if (!markdown) return Response.json({ error: "Could not scrape that URL. Check it's publicly accessible." }, { status: 422 });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: `You are a competitive intelligence analyst. Analyze this competitor's website content and return ONLY valid JSON (no markdown fences).

URL: ${url}
CONTENT:
${markdown}

Return this exact JSON structure:
{
  "overview": {
    "name": "company name",
    "industry": "industry/niche",
    "tagline": "their core value proposition in one sentence",
    "target_audience": "who they target",
    "scale": "startup/small/mid-size/enterprise (estimate from content)"
  },
  "content_strategy": {
    "main_topics": ["topic 1", "topic 2", "topic 3", "topic 4", "topic 5"],
    "content_types": ["blog", "videos", "case studies", etc],
    "tone": "professional/casual/technical/conversational",
    "publishing_signals": "what the content cadence/depth signals"
  },
  "keyword_themes": ["keyword cluster 1", "keyword cluster 2", "keyword cluster 3", "keyword cluster 4", "keyword cluster 5", "keyword cluster 6"],
  "positioning": {
    "unique_value_props": ["UVP 1", "UVP 2", "UVP 3"],
    "messaging_pillars": ["pillar 1", "pillar 2", "pillar 3"],
    "competitive_angle": "how they differentiate from competitors"
  },
  "content_gaps": {
    "missing_topics": ["topic gap 1", "topic gap 2", "topic gap 3"],
    "format_opportunities": ["format they underuse 1", "format 2"],
    "strategic_opportunities": ["opportunity 1", "opportunity 2", "opportunity 3"]
  },
  "social_signals": {
    "mentioned_channels": ["channel 1", "channel 2"],
    "community_focus": "description of their community/social approach",
    "engagement_signals": "what the site signals about their social engagement"
  }
}`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    const match = text.match(/\{[\s\S]*\}/);
    const data = match ? JSON.parse(match[0]) : {};
    return Response.json(data);
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
