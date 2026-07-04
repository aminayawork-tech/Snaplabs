import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 30;

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const { keyword, insights, messages } = await req.json();
  if (!keyword || !Array.isArray(messages)) {
    return Response.json({ error: "missing params" }, { status: 400 });
  }

  const insightsSummary = insights
    ? `Summary: ${insights.summary || ""}
Rising trends: ${(insights.rising_trends ?? []).join(", ")}
Audience intent: ${insights.audience_intent || ""}
Content opportunities: ${(insights.content_opportunities ?? []).join("; ")}
Key takeaways: ${(insights.key_takeaways ?? []).join("; ")}`
    : "No initial analysis available.";

  const systemPrompt = `You are an expert marketing analyst helping a marketer understand search trends for the keyword "${keyword}".

Initial analysis of this keyword:
${insightsSummary}

Answer follow-up questions concisely and with specific, actionable marketing advice. Keep responses to 2-4 sentences unless more detail is explicitly requested. Avoid generic advice — be specific to this keyword and its audience.

IMPORTANT: Write in plain prose only. No markdown — no headers (##), no bold (**), no bullet points with asterisks or hyphens, no backticks. Just clean, readable sentences.`;

  const stream = await client.messages.stream({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system: systemPrompt,
    messages: messages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          controller.enqueue(encoder.encode(event.delta.text));
        }
      }
      controller.close();
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
