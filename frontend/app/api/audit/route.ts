import { NextRequest } from "next/server";
import { runResearch } from "@/lib/research";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

function sse(data: object) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  const { url, biz_name, deep_crawl } = await req.json();
  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (d: object) => ctrl.enqueue(enc.encode(sse(d)));
      try {
        send({ type: "progress", step: 0, label: "Scraping website content" });

        const result = await runResearch(url, deep_crawl ?? false, (step, label) => {
          send({ type: "progress", step, label });
        });

        if (result.success) {
          send({ type: "progress", step: 3, label: "Building your report" });
          send({ type: "result", data: result.research, pages_crawled: result.pages_crawled ?? 1, biz_name });
        } else {
          send({ type: "error", message: result.error });
        }
      } catch (e) {
        send({ type: "error", message: String(e) });
      } finally {
        ctrl.enqueue(enc.encode("data: [DONE]\n\n"));
        ctrl.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" },
  });
}
