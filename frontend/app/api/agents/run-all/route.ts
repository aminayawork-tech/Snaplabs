import { NextRequest } from "next/server";
import { runAgent } from "@/lib/agentRunner";
import { AGENTS } from "@/lib/types";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { research_data, biz_name } = await req.json();
  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (d: object) => ctrl.enqueue(enc.encode(`data: ${JSON.stringify(d)}\n\n`));
      for (let i = 0; i < AGENTS.length; i++) {
        const agent = AGENTS[i];
        send({ type: "agent_start", agent_id: agent.id, index: i, total: AGENTS.length });
        const result = await runAgent(agent.id, biz_name ?? "", research_data);
        if (result.success) {
          const ts = new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
          send({ type: "agent_done", agent_id: agent.id, output: result.output, timestamp: ts });
        } else {
          send({ type: "agent_error", agent_id: agent.id, error: result.error });
        }
      }
      ctrl.enqueue(enc.encode("data: [DONE]\n\n"));
      ctrl.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
}
