import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getTask } from "@/lib/agentRunner";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { agent_id, research_data, biz_name, task_override } = await req.json();
  const enc = new TextEncoder();
  const biz = biz_name ?? "this business";

  const task = task_override
    ? `Complete this specific marketing task for ${biz} in full. Produce ready-to-use output — actual copy, templates, scripts, or plans — that can be used immediately. Do not outline or summarize; write the real thing.\n\nTASK: ${task_override}`
    : getTask(agent_id, biz);

  const system = task_override
    ? `You are a senior marketing specialist executing a specific task for ${biz}. Use every detail from the audit data below to make your output specific to this business — use their real service names, real audience, real location, real competitors where relevant. Output should be complete and ready to hand off or publish.\n\nAudit Data:\n${JSON.stringify(research_data).slice(0, 12000)}`
    : `You are a specialized marketing AI agent. Generate specific, actionable marketing content.\n\nAudit Data:\n${JSON.stringify(research_data).slice(0, 12000)}`;

  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (d: object) => ctrl.enqueue(enc.encode(`data: ${JSON.stringify(d)}\n\n`));
      try {
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });
        const response = anthropic.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 8192,
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
