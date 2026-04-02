"""
proposal_agent.py - MarketingOS Client Proposal Generator
Takes research JSON + pricing inputs → generates full Markdown proposal via Claude
→ converts to PDF using utils.markdown_to_pdf.
"""

import os
import json
import tempfile
from typing import Optional, Dict, Any, List

from utils import call_claude, truncate_text, get_agency_info, markdown_to_pdf, read_pdf_bytes, sanitize_filename

# ---------------------------------------------------------------------------
# Proposal generation prompt
# ---------------------------------------------------------------------------

PROPOSAL_SYSTEM = """You are an expert marketing agency copywriter and business strategist.
You write compelling, personalized, high-converting client proposals that close deals.
Your proposals are professional, specific, data-driven, and persuasive.
Use the research data to make every section highly relevant to the specific client."""

PROPOSAL_TEMPLATE = """Generate a complete, professional AI marketing growth proposal in Markdown format.

AGENCY INFO:
- Agency Name: {agency_name}
- Email: {agency_email}
- Phone: {agency_phone}
- Website: {agency_website}

CLIENT RESEARCH DATA:
{research_json}

PRICING (use exactly as provided):
- One-Time AI Setup Fee: ${setup_fee}
- Monthly AI Retainer: ${monthly_retainer}
- Performance Bonus: {performance_bonus}

CUSTOM NOTES FROM AGENT:
{custom_notes}

Generate the full proposal following this exact structure:

---

# {agency_name} × {business_name} – AI Marketing Growth Proposal

**Prepared for:** {business_name}
**Prepared by:** {agency_name}
**Date:** {date}
**Confidential**

---

## Executive Summary

Write a compelling 3-4 paragraph executive summary that:
- Names the business and highlights 2-3 key findings from the audit
- Projects a realistic 3-5x lead increase with specific reasoning
- Creates urgency around their marketing gaps
- Positions AI-powered marketing as the solution

---

## Website & Marketing Audit

### Strengths
(List 4-6 genuine strengths found in the research, with brief explanations)

### Critical Gaps
(List each gap from research_data.current_marketing_gaps with context and cost of inaction)

### Competitive Position
(Analyze their position vs top 2-3 competitors from research. Be specific.)

### Overall Marketing Health Score
(Reference the score from research and explain the breakdown)

---

## Recommended AI-Powered Strategy

### Phase 1: Quick Wins (Weeks 1-4)
(List 5-6 quick wins from research with specific timelines and expected results)

### Phase 2: AI Agent Deployment (Month 2-3)
(Describe the full agent workflow from research.suggested_agent_workflow)

### Phase 3: Scale & Optimize (Month 4+)
(Long-term growth strategy, automation, and compound results)

### Expected Results & ROI
(Create a simple ROI table: investment vs projected returns over 3, 6, 12 months)

---

## Our AI Agent Stack

For each relevant agent below, write 2-3 sentences explaining how it will help THIS specific client:
- Content Engine Agent
- SEO Agent
- Paid Ads Agent (Meta & Google)
- Lead Generation Agent
- Email/SMS Nurture Agent
- Social Media Agent
- Review & Referral Agent

---

## Investment Options

### Option A: Quick-Start Package
- **One-Time AI Setup & Audit Fee:** ${setup_fee}
- Includes: Full AI stack setup, integrations, and onboarding
- Deliverables: [list 5 specific deliverables]

### Option B: Monthly AI Retainer
- **Monthly Investment:** ${monthly_retainer}/month
- Includes: [list what's included - content, ads management, reporting, etc.]
- Minimum term: 3 months for measurable results

### Option C: Full Partnership (Recommended)
- Setup + Retainer: ${setup_fee} setup + ${monthly_retainer}/month
- **Performance Bonus:** {performance_bonus}
- Best value: We're invested in your growth

### Our Guarantee
(Write a compelling guarantee statement)

---

## Next Steps

1. **Discovery Call** – 30-minute strategy call to align on goals
2. **Proposal Review** – We'll walk through this proposal together
3. **Kickoff** – Once approved, we begin within 48 hours

**To move forward:** Reply to this proposal or book a call at {agency_website}

---

*{agency_name} | {agency_email} | {agency_phone}*
*{agency_website}*

---

Make this proposal feel custom-written for {business_name}, referencing their specific
services, location, industry, and gaps. Use professional but energetic language.
Include specific numbers, timelines, and outcomes wherever possible."""


# ---------------------------------------------------------------------------
# ProposalAgent
# ---------------------------------------------------------------------------

class ProposalAgent:

    def __init__(self):
        self.agency = get_agency_info()

    def generate(
        self,
        research_data: Dict[str, Any],
        setup_fee: str = "2,500",
        monthly_retainer: str = "1,500",
        performance_bonus: str = "10% of incremental revenue",
        custom_notes: str = "",
        agency_name_override: str = "",
    ) -> Dict[str, Any]:
        """
        Generate a full Markdown proposal from research JSON.

        Returns:
          {
            "success": bool,
            "markdown": str,
            "business_name": str,
            "error": str (on failure)
          }
        """
        agency_name = agency_name_override or self.agency["name"]
        business_name = research_data.get("business_name", "Your Business")

        from datetime import datetime
        date_str = datetime.now().strftime("%B %d, %Y")

        # Trim research JSON to avoid token overrun
        research_str = json.dumps(research_data, indent=2)
        if len(research_str) > 8000:
            # Keep key fields
            trimmed = {
                k: research_data[k]
                for k in [
                    "business_name", "industry", "location", "services_offered",
                    "current_marketing_gaps", "current_marketing_strengths",
                    "quick_win_opportunities", "top_10_longtail_keywords",
                    "competitor_analysis", "suggested_agent_workflow",
                    "overall_marketing_score", "target_audience",
                ]
                if k in research_data
            }
            research_str = json.dumps(trimmed, indent=2)

        prompt = PROPOSAL_TEMPLATE.format(
            agency_name=agency_name,
            agency_email=self.agency["email"],
            agency_phone=self.agency["phone"],
            agency_website=self.agency["website"],
            research_json=research_str,
            setup_fee=setup_fee,
            monthly_retainer=monthly_retainer,
            performance_bonus=performance_bonus,
            custom_notes=custom_notes or "None",
            business_name=business_name,
            date=date_str,
        )

        try:
            markdown = call_claude(
                prompt=prompt,
                system=PROPOSAL_SYSTEM,
                max_tokens=6000,
                temperature=0.4,
            )
            return {
                "success": True,
                "markdown": markdown,
                "business_name": business_name,
            }
        except Exception as e:
            return {
                "success": False,
                "markdown": "",
                "business_name": business_name,
                "error": str(e),
            }

    def generate_pdf(self, markdown: str, business_name: str = "client") -> Optional[bytes]:
        """
        Convert proposal markdown to PDF bytes.
        Returns bytes on success, None on failure.
        """
        safe_name = sanitize_filename(business_name)
        with tempfile.NamedTemporaryFile(
            delete=False, suffix=".pdf", prefix=f"proposal_{safe_name}_"
        ) as tmp:
            tmp_path = tmp.name

        result_path = markdown_to_pdf(markdown, output_path=tmp_path)
        if result_path:
            data = read_pdf_bytes(result_path)
            try:
                os.unlink(result_path)
            except Exception:
                pass
            return data
        return None

    def generate_executive_summary_email(
        self, research_data: Dict[str, Any], proposal_markdown: str
    ) -> str:
        """
        Generate a short follow-up email that accompanies the proposal.
        """
        business_name = research_data.get("business_name", "there")
        agency = self.agency

        prompt = f"""Write a short, compelling email (subject line + body) to send alongside a marketing proposal.

Agency: {agency['name']}
Client: {business_name}
Industry: {research_data.get('industry', 'N/A')}
Top gap found: {research_data.get('current_marketing_gaps', [''])[0] if research_data.get('current_marketing_gaps') else 'N/A'}
Quick win: {research_data.get('quick_win_opportunities', [{}])[0] if research_data.get('quick_win_opportunities') else 'N/A'}

Write:
Subject: [subject line]

[Email body - 3-4 short paragraphs, professional but warm, reference their specific gap,
mention the proposal is attached, include a clear CTA to book a call]

Signature:
[Name]
{agency['name']}
{agency['email']}
{agency['phone']}"""

        return call_claude(prompt, max_tokens=600, temperature=0.5)


# ---------------------------------------------------------------------------
# Standalone helper
# ---------------------------------------------------------------------------

def generate_proposal(
    research_data: Dict[str, Any],
    setup_fee: str = "2,500",
    monthly_retainer: str = "1,500",
    performance_bonus: str = "10% of incremental revenue",
    custom_notes: str = "",
    agency_name: str = "",
) -> Dict[str, Any]:
    """Convenience function."""
    agent = ProposalAgent()
    return agent.generate(
        research_data=research_data,
        setup_fee=setup_fee,
        monthly_retainer=monthly_retainer,
        performance_bonus=performance_bonus,
        custom_notes=custom_notes,
        agency_name_override=agency_name,
    )
