import { NextRequest } from "next/server";
import { runAgent } from "@/lib/agentRunner";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { agent_id, research_data, biz_name } = await req.json();
  const result = await runAgent(agent_id, biz_name ?? "", research_data);
  return Response.json(result);
}
