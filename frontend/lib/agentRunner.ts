const FORMAT_RULES = `OUTPUT FORMAT (strict):
- Start immediately with the first "## " heading. No preamble, no sign-off, no "Here is…".
- Every deliverable gets its own "## " heading. Use "### " for sub-parts inside a deliverable. Never use "# ".
- Write finished, ready-to-use copy — not outlines of copy, not advice about copy.
- Use real details from the audit data: business name, services, location, audience, competitors.
- Markdown tables are fine for calendars and budgets. Keep bullet lists tight.`;

const TASKS: Record<string, { task: (b: string) => string; maxTokens: number }> = {
  content_engine: {
    maxTokens: 7000,
    task: (b) => `Write publish-ready blog content for ${b}.

## Blog Post: <compelling SEO title>
Directly under the heading put these three lines exactly, then a blank line, then the article:
**Slug:** <lowercase-hyphenated-slug>
**Meta description:** <under 155 characters>
**Target keyword:** <primary keyword from the audit>
The article itself: 1,000–1,300 words, a strong intro hook, 4–6 "### " subheadings, practical specifics, an FAQ section answering 3 real "people also ask" questions, and a closing call-to-action naming ${b}.

## Next Two Posts
Two more post titles, each with target keyword, angle, and a 5-point outline.

## 30-Day Content Calendar
A markdown table: Day | Channel | Topic | Format | Goal.`,
  },
  seo: {
    maxTokens: 4500,
    task: (b) => `Produce an SEO action plan for ${b}.

## Fix First: Technical Issues
Each issue from the audit with the exact fix (code snippets or settings where relevant).

## Keyword Targets
A markdown table: Keyword | Intent | Page to target | Title tag | Meta description.

## On-Page Rewrites
Rewritten title tags, H1s and meta descriptions for the 3 most important pages.

## 90-Day Backlink Plan
Week-by-week actions with specific site types and an outreach email template.`,
  },
  paid_ads: {
    maxTokens: 4500,
    task: (b) => `Build ready-to-launch ad campaigns for ${b}.

## Campaign Structure
Campaigns → ad groups → keywords/audiences, as a markdown table.

## Google Search Ads
For each main service: 5 headlines (≤30 chars) and 3 descriptions (≤90 chars), plus negative keywords.

## Meta Ads
3 complete ads: primary text, headline, description, CTA button, and image/video direction.

## Budget & Bidding
Monthly budget split, bidding strategy, and the KPIs to watch in week 1, 2 and 4.`,
  },
  social_media: {
    maxTokens: 5000,
    task: (b) => `Write ready-to-post social content for ${b}.

## LinkedIn Posts
3 complete posts, each with a scroll-stopping first line, body, and hashtags.

## Instagram Posts
3 complete captions with hashtags, plus the visual direction for each.

## Short-Form Video Scripts
2 TikTok/Reels scripts: hook (first 2 seconds), shot list, on-screen text, voiceover.

## 30-Day Posting Calendar
A markdown table: Day | Platform | Post | Goal.`,
  },
  email_sms: {
    maxTokens: 5500,
    task: (b) => `Write a 5-email welcome + nurture sequence for new ${b} leads, plus SMS.

Write each email under its own heading, exactly like this:
## Email 1: <short name for the email>
**Subject:** <subject line>
**Preview text:** <preview text>
**Send:** <timing, e.g. Immediately / Day 2>

<full email body, written to the reader, signed from ${b}, ending with one clear call-to-action>

Repeat for Email 2 through Email 5.

## SMS Follow-Ups
3 SMS messages under 160 characters each, with timing.`,
  },
  lead_gen: {
    maxTokens: 4500,
    task: (b) => `Design a complete lead generation funnel for ${b}.

## Landing Page Copy
Headline, subheadline, 3 benefit blocks, social proof section, FAQ, and CTA — all written out in full.

## Lead Magnet
The offer, its title, and a full outline of its contents.

## Form & Thank-You Page
Exact form fields and the thank-you page copy.

## Follow-Up Sequence
What happens in the first 7 days after opt-in, with the message copy.`,
  },
  review_referral: {
    maxTokens: 4000,
    task: (b) => `Build a review and referral program for ${b}.

## Review Request Messages
An email, an SMS, and an in-person script asking happy customers for a Google review.

## Referral Program
The incentive structure, rules, and the announcement email.

## Responding to Reviews
Reply templates for a 5-star, a 3-star, and a 1-star review.

## Rollout Checklist
Step-by-step checklist to launch this week.`,
  },
};

export function buildAgentPrompt(
  agentId: string,
  bizName: string,
  researchData: unknown,
  taskOverride?: string
): { system: string; task: string; maxTokens: number } {
  const biz = bizName || "this business";
  const audit = JSON.stringify(researchData).slice(0, 12000);
  const today = `Today's date is ${new Date().toISOString().slice(0, 10)}. Use the current year in any dated content, and treat older years in the audit data as out of date.`;

  if (taskOverride) {
    return {
      system: `You are a senior marketing specialist executing a specific task for ${biz}. Output must be complete and ready to hand off or publish.\n${today}\n\n${FORMAT_RULES}\n\nAudit Data:\n${audit}`,
      task: `Complete this marketing task for ${biz} in full. Write the real thing — actual copy, templates, scripts or plans.\n\nTASK: ${taskOverride}`,
      maxTokens: 6000,
    };
  }

  const def = TASKS[agentId];
  return {
    system: `You are a specialist marketing agent producing deliverables a business owner can publish today.\n${today}\n\n${FORMAT_RULES}\n\nAudit Data:\n${audit}`,
    task: def ? def.task(biz) : `Produce a marketing action plan for ${biz}.`,
    maxTokens: def?.maxTokens ?? 4000,
  };
}
