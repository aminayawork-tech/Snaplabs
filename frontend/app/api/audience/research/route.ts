import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { market } = await req.json();
  if (!market) return Response.json({ error: "Market/niche required" }, { status: 400 });

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      messages: [{
        role: "user",
        content: `You are a market research expert. Build a detailed audience research report for: "${market}"

Return ONLY valid JSON (no markdown fences):
{
  "personas": [
    {
      "name": "Persona name (e.g. 'The Busy Professional')",
      "emoji": "single emoji representing this persona",
      "age_range": "e.g. 28-40",
      "job_title": "typical job/role",
      "income": "e.g. '$60K-90K/yr'",
      "location": "where they tend to live",
      "psychographics": ["trait 1", "trait 2", "trait 3"],
      "pain_points": ["pain 1", "pain 2", "pain 3"],
      "goals": ["goal 1", "goal 2", "goal 3"],
      "buying_triggers": ["trigger 1", "trigger 2"],
      "preferred_channels": ["channel 1", "channel 2", "channel 3"],
      "content_preferences": ["preference 1", "preference 2"]
    }
  ],
  "customer_journey": {
    "awareness": {
      "description": "how they first discover solutions",
      "touchpoints": ["touchpoint 1", "touchpoint 2", "touchpoint 3"],
      "content_ideas": ["idea 1", "idea 2"]
    },
    "consideration": {
      "description": "how they evaluate options",
      "touchpoints": ["touchpoint 1", "touchpoint 2", "touchpoint 3"],
      "content_ideas": ["idea 1", "idea 2"]
    },
    "decision": {
      "description": "what drives the final purchase",
      "touchpoints": ["touchpoint 1", "touchpoint 2"],
      "content_ideas": ["idea 1", "idea 2"]
    },
    "retention": {
      "description": "what keeps them coming back",
      "touchpoints": ["touchpoint 1", "touchpoint 2"],
      "content_ideas": ["idea 1", "idea 2"]
    }
  },
  "market_insights": {
    "estimated_size": "e.g. '$4.2B global market'",
    "growth_trend": "e.g. '+12% YoY, driven by...'",
    "key_communities": ["r/subreddit1", "Facebook Group: XYZ", "Discord: XYZ"],
    "market_trends": ["trend 1", "trend 2", "trend 3"],
    "underserved_segments": ["segment 1", "segment 2"]
  }
}

Generate exactly 3 personas covering different segments of this market.`,
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
