import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildAgentPrompt } from "@/lib/agentRunner";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { agent_id, research_data, biz_name, task_override } = await req.json();
  const enc = new TextEncoder();
  const { system, task, maxTokens } = buildAgentPrompt(agent_id, biz_name, research_data, task_override);

  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (d: object) => ctrl.enqueue(enc.encode(`data: ${JSON.stringify(d)}\n\n`));
      try {
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });
        const response = anthropic.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: maxTokens,
          system,
          messages: [{ role: "user", content: task }],
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
