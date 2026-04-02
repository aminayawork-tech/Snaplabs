"""
agents.py - MarketingOS AI Agent Definitions
8 pre-built marketing agents, each with a strong system prompt and run() method.
All agents use Claude via utils.call_claude and support context chaining.
"""

import json
from typing import Optional, Dict, Any, List, Callable
from dataclasses import dataclass, field

from utils import call_claude, call_claude_json, truncate_text, track_claude_usage


# ---------------------------------------------------------------------------
# Agent Registry
# ---------------------------------------------------------------------------

AGENT_REGISTRY: Dict[str, Dict[str, Any]] = {}


def register_agent(agent_id: str, meta: Dict[str, Any]):
    """Decorator-style registration for agents."""
    AGENT_REGISTRY[agent_id] = meta


def get_agent_list() -> List[Dict[str, Any]]:
    """Return all registered agents sorted by display order."""
    return sorted(AGENT_REGISTRY.values(), key=lambda x: x.get("order", 99))


# ---------------------------------------------------------------------------
# Base Agent Class
# ---------------------------------------------------------------------------

@dataclass
class BaseAgent:
    agent_id: str
    name: str
    description: str
    icon: str
    system_prompt: str
    color: str = "#4f46e5"

    def run(
        self,
        task: str,
        context: Optional[Dict[str, Any]] = None,
        research_data: Optional[Dict[str, Any]] = None,
        max_tokens: int = 3000,
        progress_callback: Optional[Callable[[str], None]] = None,
    ) -> Dict[str, Any]:
        """
        Run the agent on the given task.

        Returns:
          {
            "success": bool,
            "output": str,
            "agent_id": str,
            "agent_name": str,
            "error": str (on failure)
          }
        """
        def log(msg):
            if progress_callback:
                progress_callback(msg)

        log(f"Running {self.name}...")

        # Build enriched prompt with context
        full_prompt = self._build_prompt(task, context, research_data)

        try:
            output = call_claude(
                prompt=full_prompt,
                system=self.system_prompt,
                max_tokens=max_tokens,
                temperature=0.5,
            )
            log(f"{self.name} complete.")
            return {
                "success": True,
                "output": output,
                "agent_id": self.agent_id,
                "agent_name": self.name,
            }
        except Exception as e:
            return {
                "success": False,
                "output": "",
                "agent_id": self.agent_id,
                "agent_name": self.name,
                "error": str(e),
            }

    def _build_prompt(
        self,
        task: str,
        context: Optional[Dict[str, Any]],
        research_data: Optional[Dict[str, Any]],
    ) -> str:
        parts = []

        if research_data:
            biz_name = research_data.get("business_name", "the client")
            industry = research_data.get("industry", "")
            services = research_data.get("services_offered", [])
            gaps = research_data.get("current_marketing_gaps", [])
            audience = research_data.get("target_audience", [])
            location = research_data.get("location", "")

            parts.append(f"""CLIENT CONTEXT:
- Business: {biz_name}
- Industry: {industry}
- Location: {location}
- Services: {', '.join(services[:5]) if services else 'N/A'}
- Marketing Gaps: {', '.join(gaps[:3]) if gaps else 'N/A'}
- Target Audience: {json.dumps(audience[:2], indent=2) if audience else 'N/A'}
""")

        if context:
            ctx_str = json.dumps(context, indent=2)
            if len(ctx_str) > 3000:
                ctx_str = ctx_str[:3000] + "..."
            parts.append(f"PREVIOUS AGENT OUTPUTS / CONTEXT:\n{ctx_str}\n")

        parts.append(f"YOUR TASK:\n{task}")

        return "\n\n".join(parts)


# ---------------------------------------------------------------------------
# Agent 1: Content Engine Agent
# ---------------------------------------------------------------------------

CONTENT_SYSTEM = """You are an elite content marketing strategist and copywriter.
You create compelling, SEO-optimized content that converts readers into customers.
You understand brand voice, storytelling, and the buyer's journey.
Always produce content that is specific, actionable, and tailored to the client's industry."""

content_agent = BaseAgent(
    agent_id="content_engine",
    name="Content Engine Agent",
    description="Creates blog posts, social content, email sequences, case studies, and content calendars",
    icon="[Content]",
    system_prompt=CONTENT_SYSTEM,
    color="#7c3aed",
)
register_agent("content_engine", {
    "id": "content_engine",
    "name": "Content Engine Agent",
    "description": "Blog posts, content calendars, social copy, case studies",
    "icon": "Content",
    "color": "#7c3aed",
    "order": 1,
    "default_tasks": [
        "Create a 30-day content calendar with topics, formats, and publishing schedule",
        "Write a 1500-word SEO blog post targeting the top keyword",
        "Create 10 LinkedIn posts for the next month",
        "Write 5 email newsletter templates",
        "Create a content strategy document with pillar topics and cluster keywords",
    ],
})


# ---------------------------------------------------------------------------
# Agent 2: Paid Ads Agent
# ---------------------------------------------------------------------------

ADS_SYSTEM = """You are a paid advertising expert specializing in Meta (Facebook/Instagram) and Google Ads.
You create high-converting ad campaigns, compelling copy, and strategic targeting recommendations.
You understand ROAS optimization, audience segmentation, and funnel-based advertising.
Always provide specific ad copy, targeting parameters, budgets, and expected metrics."""

ads_agent = BaseAgent(
    agent_id="paid_ads",
    name="Paid Ads Agent",
    description="Meta & Google ad campaigns, targeting strategy, creative copy, budget allocation",
    icon="[Ads]",
    system_prompt=ADS_SYSTEM,
    color="#dc2626",
)
register_agent("paid_ads", {
    "id": "paid_ads",
    "name": "Paid Ads Agent",
    "description": "Meta & Google campaigns, ad copy, targeting, budget optimization",
    "icon": "Ads",
    "color": "#dc2626",
    "order": 2,
    "default_tasks": [
        "Create a complete Facebook/Instagram ad campaign with targeting, copy, and creative briefs",
        "Design a Google Search campaign with keywords, ad groups, and ad copy",
        "Build a retargeting campaign strategy for website visitors",
        "Create a $1,000/month ad budget allocation plan across channels",
        "Write 5 ad variations (headlines + descriptions) for split testing",
    ],
})


# ---------------------------------------------------------------------------
# Agent 3: SEO Agent
# ---------------------------------------------------------------------------

SEO_SYSTEM = """You are an expert SEO strategist with deep knowledge of technical SEO,
on-page optimization, link building, and local SEO.
You stay current with Google algorithm updates and E-E-A-T principles.
Provide specific, prioritized, actionable SEO recommendations with expected timelines and impact.
Always back recommendations with data from the research provided."""

seo_agent = BaseAgent(
    agent_id="seo",
    name="SEO Agent",
    description="Technical SEO, keyword strategy, on-page optimization, link building plans",
    icon="[SEO]",
    system_prompt=SEO_SYSTEM,
    color="#059669",
)
register_agent("seo", {
    "id": "seo",
    "name": "SEO Agent",
    "description": "Technical SEO audits, keyword strategy, on-page optimization",
    "icon": "SEO",
    "color": "#059669",
    "order": 3,
    "default_tasks": [
        "Create a 90-day SEO action plan with priorities and expected rankings",
        "Generate optimized meta titles and descriptions for 10 key pages",
        "Build a keyword cluster map around the top 3 service pages",
        "Create a local SEO optimization checklist",
        "Write a link-building outreach strategy with target site types",
    ],
})


# ---------------------------------------------------------------------------
# Agent 4: Lead Gen Agent
# ---------------------------------------------------------------------------

LEADGEN_SYSTEM = """You are a B2B lead generation expert specializing in LinkedIn outreach,
cold email, and multi-channel prospecting.
You create personalized outreach sequences that get responses.
You understand ICP (Ideal Customer Profile) definition, lead scoring, and sales funnels.
Always provide specific scripts, sequences, and targeting criteria."""

leadgen_agent = BaseAgent(
    agent_id="lead_gen",
    name="Lead Gen Agent",
    description="LinkedIn outreach, cold email sequences, ICP targeting, lead scoring",
    icon="[LeadGen]",
    system_prompt=LEADGEN_SYSTEM,
    color="#d97706",
)
register_agent("lead_gen", {
    "id": "lead_gen",
    "name": "Lead Gen Agent",
    "description": "LinkedIn outreach, cold email sequences, ICP definition",
    "icon": "LeadGen",
    "color": "#d97706",
    "order": 4,
    "default_tasks": [
        "Define the Ideal Customer Profile (ICP) with firmographics and buying signals",
        "Write a 5-step LinkedIn outreach sequence for decision makers",
        "Create a cold email campaign with 3 follow-up sequences",
        "Build a lead scoring framework based on engagement signals",
        "Write scripts for 10 personalized LinkedIn connection requests",
    ],
})


# ---------------------------------------------------------------------------
# Agent 5: Email/SMS Nurture Agent
# ---------------------------------------------------------------------------

EMAIL_SYSTEM = """You are an expert email and SMS marketing specialist.
You design automated nurture sequences that convert leads into customers.
You understand deliverability, segmentation, personalization, and CRM automation.
Create sequences with compelling subject lines, preview text, and body copy.
Always think about the customer journey stage and tailor messaging accordingly."""

email_agent = BaseAgent(
    agent_id="email_sms",
    name="Email/SMS Nurture Agent",
    description="Automated email sequences, SMS campaigns, drip campaigns, re-engagement flows",
    icon="[Email]",
    system_prompt=EMAIL_SYSTEM,
    color="#0891b2",
)
register_agent("email_sms", {
    "id": "email_sms",
    "name": "Email/SMS Nurture Agent",
    "description": "Automated sequences, drip campaigns, re-engagement flows",
    "icon": "Email",
    "color": "#0891b2",
    "order": 5,
    "default_tasks": [
        "Create a 7-email welcome sequence for new leads",
        "Write a 30-day nurture sequence with value + CTA balance",
        "Design an abandoned cart/inquiry re-engagement campaign",
        "Create 5 SMS follow-up messages for hot leads",
        "Write a re-engagement campaign for cold subscribers",
    ],
})


# ---------------------------------------------------------------------------
# Agent 6: Social Media Agent
# ---------------------------------------------------------------------------

SOCIAL_SYSTEM = """You are a social media marketing expert who creates viral, engaging content
across Instagram, LinkedIn, Facebook, TikTok, and Twitter/X.
You understand each platform's algorithm, content formats, and audience behavior.
Create platform-specific content that drives engagement, followers, and brand awareness.
Always provide ready-to-post copy, hashtag strategies, and posting schedules."""

social_agent = BaseAgent(
    agent_id="social_media",
    name="Social Media Agent",
    description="Platform-specific posts, hashtag strategy, community management scripts, viral hooks",
    icon="[Social]",
    system_prompt=SOCIAL_SYSTEM,
    color="#9333ea",
)
register_agent("social_media", {
    "id": "social_media",
    "name": "Social Media Agent",
    "description": "Platform-specific content, hashtags, community management",
    "icon": "Social",
    "color": "#9333ea",
    "order": 6,
    "default_tasks": [
        "Create a 2-week social media content calendar for all platforms",
        "Write 15 Instagram captions with hashtag sets",
        "Create 5 LinkedIn thought leadership posts",
        "Write a TikTok/Reels script series for top services",
        "Create a social media brand voice guide",
    ],
})


# ---------------------------------------------------------------------------
# Agent 7: Review & Referral Agent
# ---------------------------------------------------------------------------

REVIEW_SYSTEM = """You are an expert in reputation management, online reviews, and referral marketing.
You know how to ethically and effectively get more 5-star reviews, handle negative reviews,
and build systematic referral programs that drive organic growth.
Always provide specific scripts, templates, and systems."""

review_agent = BaseAgent(
    agent_id="review_referral",
    name="Review & Referral Agent",
    description="Google/Yelp review campaigns, referral programs, reputation management",
    icon="[Reviews]",
    system_prompt=REVIEW_SYSTEM,
    color="#f59e0b",
)
register_agent("review_referral", {
    "id": "review_referral",
    "name": "Review & Referral Agent",
    "description": "Review campaigns, referral programs, reputation management",
    "icon": "Reviews",
    "color": "#f59e0b",
    "order": 7,
    "default_tasks": [
        "Create a Google Review request campaign with email + SMS templates",
        "Design a referral program with incentive structure and tracking",
        "Write responses to 5 common negative review scenarios",
        "Build a reputation monitoring checklist",
        "Create a post-purchase review request automation sequence",
    ],
})


# ---------------------------------------------------------------------------
# Agent 8: Custom Agent
# ---------------------------------------------------------------------------

CUSTOM_SYSTEM = """You are a versatile AI marketing assistant.
You can tackle any marketing challenge — strategy, copy, analysis, planning, or execution.
Be specific, actionable, and focused on measurable outcomes.
Adapt your tone and approach to whatever the user needs."""

custom_agent = BaseAgent(
    agent_id="custom",
    name="Custom Agent",
    description="Flexible agent for any custom marketing task or analysis",
    icon="[Custom]",
    system_prompt=CUSTOM_SYSTEM,
    color="#6b7280",
)
register_agent("custom", {
    "id": "custom",
    "name": "Custom Agent",
    "description": "Any custom marketing task — flexible and open-ended",
    "icon": "Custom",
    "color": "#6b7280",
    "order": 8,
    "default_tasks": [
        "Analyze the competitor landscape and find differentiation opportunities",
        "Create a go-to-market strategy for a new service offering",
        "Write a press release for a major company announcement",
        "Create a marketing budget allocation recommendation",
        "Develop a brand positioning statement and tagline options",
    ],
})


# ---------------------------------------------------------------------------
# Agent Lookup
# ---------------------------------------------------------------------------

_AGENTS: Dict[str, BaseAgent] = {
    "content_engine": content_agent,
    "paid_ads": ads_agent,
    "seo": seo_agent,
    "lead_gen": leadgen_agent,
    "email_sms": email_agent,
    "social_media": social_agent,
    "review_referral": review_agent,
    "custom": custom_agent,
}


def get_agent(agent_id: str) -> Optional[BaseAgent]:
    return _AGENTS.get(agent_id)


def run_agent(
    agent_id: str,
    task: str,
    context: Optional[Dict[str, Any]] = None,
    research_data: Optional[Dict[str, Any]] = None,
    max_tokens: int = 3000,
    progress_callback: Optional[Callable[[str], None]] = None,
) -> Dict[str, Any]:
    """Convenience function to run any agent by ID."""
    agent = get_agent(agent_id)
    if not agent:
        return {"success": False, "output": "", "error": f"Unknown agent: {agent_id}"}
    return agent.run(
        task=task,
        context=context,
        research_data=research_data,
        max_tokens=max_tokens,
        progress_callback=progress_callback,
    )


# ---------------------------------------------------------------------------
# Suggested Workflow Builder
# ---------------------------------------------------------------------------

def suggest_workflow_from_research(research_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Given research output, suggest an ordered agent workflow.
    Returns list of {agent_id, task, rationale}
    """
    gaps = research_data.get("current_marketing_gaps", [])
    services = research_data.get("services_offered", [])
    biz_name = research_data.get("business_name", "the client")
    industry = research_data.get("industry", "")

    workflow = []

    # Always start with SEO
    workflow.append({
        "agent_id": "seo",
        "task": f"Create a 90-day SEO action plan for {biz_name} in the {industry} industry. "
                f"Focus on these gaps: {', '.join(gaps[:2]) if gaps else 'overall SEO improvement'}",
        "rationale": "SEO is the foundation — organic traffic compounds over time.",
    })

    # Content next
    workflow.append({
        "agent_id": "content_engine",
        "task": f"Create a 30-day content calendar for {biz_name}. "
                f"Include blog topics targeting their key audience and services: {', '.join(services[:3]) if services else 'their main services'}",
        "rationale": "Content drives SEO, social, and email simultaneously.",
    })

    # Lead gen
    workflow.append({
        "agent_id": "lead_gen",
        "task": f"Define the ICP for {biz_name} and create a LinkedIn + cold email outreach sequence "
                f"targeting ideal {industry} clients.",
        "rationale": "Proactive outreach fills the pipeline while SEO builds.",
    })

    # Email nurture
    workflow.append({
        "agent_id": "email_sms",
        "task": f"Create a 7-email welcome + nurture sequence for {biz_name} leads, "
                f"focused on converting inquiries to booked appointments.",
        "rationale": "Nurture converts leads that aren't ready to buy immediately.",
    })

    # Social media
    workflow.append({
        "agent_id": "social_media",
        "task": f"Create 2 weeks of social media content for {biz_name} across "
                f"Instagram, LinkedIn, and Facebook. Focus on building authority in {industry}.",
        "rationale": "Social proof and consistent posting build trust.",
    })

    # Review & referral
    workflow.append({
        "agent_id": "review_referral",
        "task": f"Design a Google Review campaign and referral program for {biz_name}. "
                f"Include email/SMS templates and a referral incentive structure.",
        "rationale": "Reviews and referrals are the highest-converting traffic source.",
    })

    return workflow
