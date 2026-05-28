import Anthropic from "@anthropic-ai/sdk";

const TASKS: Record<string, (biz: string) => string> = {
  content_engine:  (b) => `Create a comprehensive content strategy for ${b}: 3 blog post outlines targeting top SEO keywords, a 30-day content calendar, and key messaging for each audience segment.`,
  seo:             (b) => `Provide a complete SEO improvement plan for ${b}: fix critical technical issues, target the top 10 keywords, and outline a 90-day backlink strategy.`,
  paid_ads:        (b) => `Design a Google Ads + Meta Ads campaign for ${b}: campaign structure, 5 headline variants, ad copy for each service, and recommended budget allocation.`,
  social_media:    (b) => `Create a 30-day social media content calendar for ${b}: posts for LinkedIn, Instagram, and Facebook using brand story, services, and audience insights.`,
  email_sms:       (b) => `Write a 5-email welcome + nurture sequence for ${b} new leads: subject lines, preview text, body copy, and a clear CTA for each email.`,
  lead_gen:        (b) => `Design a lead generation funnel for ${b}: landing page headline + copy, lead magnet idea, form fields, and a follow-up sequence outline.`,
  review_referral: (b) => `Build a review acquisition and referral program for ${b}: outreach templates for past clients, referral incentive structure, and review request script.`,
};

export function getTask(agentId: string, bizName: string): string {
  const fn = TASKS[agentId];
  const biz = bizName || "this business";
  return fn ? fn(biz) : `Run marketing analysis for ${biz}.`;
}

export async function runAgent(
  agentId: string,
  bizName: string,
  researchData: Record<string, unknown>,
  taskOverride?: string
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });
    const biz = bizName || "this business";

    const task = taskOverride
      ? `Complete this specific marketing task for ${biz} in full. Produce ready-to-use output — actual copy, templates, scripts, or plans — that can be used immediately. Do not outline or summarize; write the real thing.\n\nTASK: ${taskOverride}`
      : getTask(agentId, biz);

    const system = taskOverride
      ? `You are a senior marketing specialist executing a specific task for ${biz}. Use every detail from the audit data below to make your output specific to this business — use their real service names, real audience, real location, real competitors where relevant. Output should be complete and ready to hand off or publish.\n\nAudit Data:\n${JSON.stringify(researchData).slice(0, 12000)}`
      : `You are a specialized marketing AI agent. Generate specific, actionable marketing content.\n\nAudit Data:\n${JSON.stringify(researchData).slice(0, 12000)}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system,
      messages: [{ role: "user", content: task }],
    });

    const output = response.content[0].type === "text" ? response.content[0].text : "";
    return { success: true, output };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
