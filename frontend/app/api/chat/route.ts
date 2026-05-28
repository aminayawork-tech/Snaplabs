import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { message, research_data, history } = await req.json();
  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (d: object) => ctrl.enqueue(enc.encode(`data: ${JSON.stringify(d)}\n\n`));
      try {
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });
        const messages = [
          ...((history ?? []) as { role: "user" | "assistant"; content: string }[]).slice(-8),
          { role: "user" as const, content: message },
        ];

        const response = anthropic.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          system: `You are an AI marketing analyst for Snappymarketer.\n\nAudit Data:\n${JSON.stringify(research_data).slice(0, 8000)}\n\nBe specific, actionable, and reference real data from the audit.`,
          messages,
        });

        for await (const event of response) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            send({ type: "text", text: event.delta.text });
          }
        }
      } catch (e) {
        send({ type: "error", text: String(e) });
      } finally {
        ctrl.enqueue(enc.encode("data: [DONE]\n\n"));
        ctrl.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
}
