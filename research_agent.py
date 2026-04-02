"""
research_agent.py - MarketingOS Research & Audit Engine
Scrapes a website with Firecrawl, then runs Claude analysis to produce
a structured business intelligence report.
"""

import json
from typing import Optional, Dict, Any, Callable

from utils import (
    FirecrawlWrapper,
    call_claude_json,
    call_claude,
    truncate_text,
    get_cost_summary,
    track_claude_usage,
)

# ---------------------------------------------------------------------------
# Hardcoded analysis prompt (as specified)
# ---------------------------------------------------------------------------

RESEARCH_SYSTEM_PROMPT = """You are a world-class marketing strategist and business intelligence analyst.
Your job is to deeply analyze scraped website content and return a comprehensive, accurate,
data-driven marketing audit in strict JSON format."""

RESEARCH_USER_PROMPT_TEMPLATE = """You are a world-class marketing strategist. Analyze the scraped website content below.

WEBSITE URL: {url}

SCRAPED CONTENT:
{markdown}

Return a strict JSON object with EXACTLY these keys (no extra keys, no markdown fences):
{{
  "business_name": "The company name",
  "industry": "Primary industry/niche",
  "location": "City, State/Country or 'Online/National'",
  "target_audience": [
    {{
      "persona_name": "Persona label",
      "demographics": "Age, income, role etc.",
      "pain_points": ["pain 1", "pain 2"],
      "where_to_reach": "LinkedIn, Google, etc."
    }}
  ],
  "services_offered": ["service 1", "service 2", "..."],
  "current_marketing_strengths": ["strength 1", "strength 2"],
  "current_marketing_gaps": ["gap 1", "gap 2", "gap 3"],
  "top_10_longtail_keywords": [
    {{"keyword": "...", "intent": "informational|commercial|transactional", "difficulty": "low|medium|high"}}
  ],
  "competitor_analysis": [
    {{"name": "Competitor Name", "strengths": "...", "weaknesses": "...", "estimated_traffic": "..."}}
  ],
  "quick_win_opportunities": [
    {{"tactic": "...", "timeline": "...", "expected_impact": "...", "effort": "low|medium|high"}}
  ],
  "suggested_agent_workflow": {{
    "phase_1": "...",
    "phase_2": "...",
    "phase_3": "..."
  }},
  "key_contact_info": {{
    "email": "...",
    "phone": "...",
    "address": "...",
    "social_media": []
  }},
  "overall_marketing_score": {{
    "score": 0,
    "max_score": 100,
    "breakdown": {{
      "seo": 0,
      "content": 0,
      "social_media": 0,
      "paid_ads": 0,
      "conversion": 0
    }},
    "summary": "One sentence summary of marketing health"
  }}
}}

Be specific and actionable. Use real data from the content where available. Do not invent facts."""


# ---------------------------------------------------------------------------
# Main Research Engine
# ---------------------------------------------------------------------------

class ResearchAgent:
    """
    Orchestrates: Firecrawl scrape → Claude analysis → structured report.
    """

    def __init__(self, firecrawl_api_key: Optional[str] = None, anthropic_api_key: Optional[str] = None):
        self.scraper = FirecrawlWrapper(api_key=firecrawl_api_key)

    def run(
        self,
        url: str,
        deep_crawl: bool = False,
        crawl_limit: int = 10,
        progress_callback: Optional[Callable[[str], None]] = None,
    ) -> Dict[str, Any]:
        """
        Full research pipeline.

        Returns:
          {
            "success": bool,
            "url": str,
            "scraped_markdown": str,
            "research": dict,   <- structured JSON from Claude
            "pages_crawled": int,
            "credits_used": int,
            "scrape_source": str,
            "error": str (only on failure)
          }
        """
        def log(msg: str):
            if progress_callback:
                progress_callback(msg)

        # --- Step 1: Scrape ---
        log(f"Scraping {url} {'(deep crawl)' if deep_crawl else '(single page)'}...")

        if deep_crawl:
            scrape_result = self.scraper.crawl(url, limit=crawl_limit)
        else:
            scrape_result = self.scraper.scrape(url)

        if not scrape_result.get("success"):
            return {
                "success": False,
                "url": url,
                "error": scrape_result.get("error", "Scraping failed"),
                "scraped_markdown": "",
                "research": {},
                "pages_crawled": 0,
                "credits_used": 0,
                "scrape_source": "failed",
            }

        scraped_markdown = scrape_result.get("markdown", "")
        pages_crawled = scrape_result.get("pages_crawled", 1)
        credits_used = scrape_result.get("credits_used", 1)
        scrape_source = scrape_result.get("source", "firecrawl")

        log(f"Scraped {pages_crawled} page(s). Running AI analysis...")

        if not scraped_markdown or len(scraped_markdown.strip()) < 100:
            return {
                "success": False,
                "url": url,
                "error": "Scraped content is too short or empty. The site may block bots.",
                "scraped_markdown": scraped_markdown,
                "research": {},
                "pages_crawled": pages_crawled,
                "credits_used": credits_used,
                "scrape_source": scrape_source,
            }

        # --- Step 2: Claude Analysis ---
        truncated_md = truncate_text(scraped_markdown, max_chars=14000)
        prompt = RESEARCH_USER_PROMPT_TEMPLATE.format(
            url=url,
            markdown=truncated_md,
        )

        log("Sending to Claude for marketing analysis...")
        research_data = call_claude_json(
            prompt=prompt,
            system=RESEARCH_SYSTEM_PROMPT,
            max_tokens=4096,
        )

        if "error" in research_data and not research_data.get("business_name"):
            # Try a simpler fallback prompt
            log("Retrying with simplified prompt...")
            research_data = _fallback_analysis(url, truncated_md)

        log("Research complete!")

        return {
            "success": True,
            "url": url,
            "scraped_markdown": scraped_markdown,
            "research": research_data,
            "pages_crawled": pages_crawled,
            "credits_used": credits_used,
            "scrape_source": scrape_source,
        }


# ---------------------------------------------------------------------------
# Fallback Analysis (simpler prompt, text output → parse manually)
# ---------------------------------------------------------------------------

def _fallback_analysis(url: str, markdown: str) -> Dict[str, Any]:
    """
    Simpler prompt that asks Claude to return JSON in parts.
    Used when the full strict JSON prompt fails.
    """
    simple_prompt = f"""Analyze this website content for {url}.

Content:
{markdown[:8000]}

Return ONLY valid JSON with these keys:
business_name, industry, location, services_offered (array),
current_marketing_gaps (array), quick_win_opportunities (array of strings),
top_10_longtail_keywords (array of strings), target_audience (array of strings),
overall_marketing_score (number 0-100), key_contact_info (object with email, phone)

Return raw JSON only, no markdown."""

    result = call_claude_json(simple_prompt, max_tokens=2048)
    return result


# ---------------------------------------------------------------------------
# Standalone helper: run research without class instantiation
# ---------------------------------------------------------------------------

def run_research(
    url: str,
    deep_crawl: bool = False,
    crawl_limit: int = 10,
    progress_callback: Optional[Callable[[str], None]] = None,
) -> Dict[str, Any]:
    """Convenience function."""
    agent = ResearchAgent()
    return agent.run(url, deep_crawl=deep_crawl, crawl_limit=crawl_limit, progress_callback=progress_callback)


# ---------------------------------------------------------------------------
# Competitor Research
# ---------------------------------------------------------------------------

def research_competitor(competitor_url: str, progress_callback=None) -> Dict[str, Any]:
    """Scrape and analyze a competitor site."""
    def log(msg):
        if progress_callback:
            progress_callback(msg)

    log(f"Researching competitor: {competitor_url}")
    scraper = FirecrawlWrapper()
    result = scraper.scrape(competitor_url)

    if not result.get("success") or not result.get("markdown"):
        return {"success": False, "url": competitor_url, "error": result.get("error", "Scrape failed")}

    md = truncate_text(result["markdown"], 8000)
    prompt = f"""Analyze this competitor website: {competitor_url}

Content:
{md}

Return JSON with keys:
- name: company name
- services: list of main services
- strengths: marketing strengths (list)
- weaknesses: gaps or weaknesses (list)
- pricing_signals: any pricing info found
- content_strategy: description of their content approach
- cta_analysis: primary calls-to-action
- estimated_traffic: low/medium/high based on site quality

Return raw JSON only."""

    data = call_claude_json(prompt, max_tokens=1500)
    data["url"] = competitor_url
    data["success"] = True
    return data


# ---------------------------------------------------------------------------
# SEO Quick Audit
# ---------------------------------------------------------------------------

def seo_quick_audit(url: str, scraped_markdown: str) -> Dict[str, Any]:
    """Run a focused SEO audit on already-scraped content."""
    md = truncate_text(scraped_markdown, 10000)
    prompt = f"""Perform a detailed SEO audit for {url}.

Scraped content:
{md}

Return JSON with:
- title_tag_issues: list of problems
- meta_description_issues: list
- heading_structure: analysis string
- keyword_density: top keywords found (list)
- internal_linking: assessment
- page_speed_recommendations: list
- schema_markup_suggestions: list
- local_seo_opportunities: list
- technical_seo_issues: list
- priority_fixes: top 5 actions (list of objects with action, priority, impact)

Raw JSON only."""

    return call_claude_json(prompt, max_tokens=2000)
