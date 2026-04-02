"""
workflow.py - MarketingOS Workflow Engine
Chains agents together using LangGraph (with a pure-Python fallback).
Supports: research → proposal → any agent sequence.
"""

import json
import time
from typing import Optional, Dict, Any, List, Callable, TypedDict, Annotated
from datetime import datetime

from agents import run_agent, get_agent, suggest_workflow_from_research
from research_agent import run_research
from proposal_agent import generate_proposal
from utils import get_cost_summary

# Try to import langgraph; fall back to simple sequential runner
try:
    from langgraph.graph import StateGraph, END
    from langgraph.graph.message import add_messages
    LANGGRAPH_AVAILABLE = True
except ImportError:
    LANGGRAPH_AVAILABLE = False


# ---------------------------------------------------------------------------
# Workflow State
# ---------------------------------------------------------------------------

class WorkflowState(TypedDict, total=False):
    url: str
    deep_crawl: bool
    research_result: Dict[str, Any]
    proposal_result: Dict[str, Any]
    agent_results: List[Dict[str, Any]]
    current_agent_index: int
    agent_sequence: List[Dict[str, Any]]  # [{agent_id, task}, ...]
    errors: List[str]
    status: str
    started_at: str
    completed_at: str


# ---------------------------------------------------------------------------
# Node Functions (for LangGraph or sequential runner)
# ---------------------------------------------------------------------------

def node_research(state: WorkflowState, progress_cb=None) -> WorkflowState:
    """Node: Run website research."""
    url = state.get("url", "")
    deep_crawl = state.get("deep_crawl", False)

    if not url:
        state["errors"] = state.get("errors", []) + ["No URL provided for research"]
        state["status"] = "error"
        return state

    result = run_research(url, deep_crawl=deep_crawl, progress_callback=progress_cb)
    state["research_result"] = result
    if not result.get("success"):
        state["errors"] = state.get("errors", []) + [f"Research failed: {result.get('error')}"]
    return state


def node_generate_proposal(
    state: WorkflowState,
    setup_fee: str = "2,500",
    monthly_retainer: str = "1,500",
    agency_name: str = "",
    progress_cb=None,
) -> WorkflowState:
    """Node: Generate client proposal from research."""
    research_result = state.get("research_result", {})
    research_data = research_result.get("research", {})

    if not research_data:
        state["errors"] = state.get("errors", []) + ["No research data for proposal"]
        return state

    if progress_cb:
        progress_cb("Generating client proposal...")

    proposal = generate_proposal(
        research_data=research_data,
        setup_fee=setup_fee,
        monthly_retainer=monthly_retainer,
        agency_name=agency_name,
    )
    state["proposal_result"] = proposal
    return state


def node_run_agents(state: WorkflowState, progress_cb=None) -> WorkflowState:
    """Node: Run through the agent sequence."""
    agent_sequence = state.get("agent_sequence", [])
    research_data = state.get("research_result", {}).get("research", {})
    agent_results = state.get("agent_results", [])

    # Build running context from previous agent outputs
    context = {}
    for prev in agent_results:
        if prev.get("success"):
            context[prev["agent_id"]] = prev.get("output", "")[:2000]  # Trim for context

    current_idx = state.get("current_agent_index", 0)

    if current_idx >= len(agent_sequence):
        return state

    step = agent_sequence[current_idx]
    agent_id = step.get("agent_id", "custom")
    task = step.get("task", "Analyze the client and provide recommendations")

    if progress_cb:
        progress_cb(f"Running agent {current_idx + 1}/{len(agent_sequence)}: {agent_id}")

    result = run_agent(
        agent_id=agent_id,
        task=task,
        context=context if context else None,
        research_data=research_data if research_data else None,
        max_tokens=2500,
        progress_callback=progress_cb,
    )

    agent_results.append({**result, "task": task})
    state["agent_results"] = agent_results
    state["current_agent_index"] = current_idx + 1
    return state


# ---------------------------------------------------------------------------
# Simple Sequential Workflow Runner (no LangGraph dependency)
# ---------------------------------------------------------------------------

class WorkflowRunner:
    """
    Runs a configurable workflow: research → (optional proposal) → agents.
    Works with or without LangGraph installed.
    """

    def __init__(self, progress_callback: Optional[Callable[[str], None]] = None):
        self.progress_callback = progress_callback
        self._log = progress_callback or (lambda x: None)

    def run_full_pipeline(
        self,
        url: str,
        deep_crawl: bool = False,
        run_proposal: bool = True,
        agent_sequence: Optional[List[Dict[str, Any]]] = None,
        setup_fee: str = "2,500",
        monthly_retainer: str = "1,500",
        agency_name: str = "",
    ) -> Dict[str, Any]:
        """
        Full pipeline: Research → Proposal → Agent Sequence.

        agent_sequence: list of {agent_id: str, task: str}
        """
        started = datetime.now()
        results: Dict[str, Any] = {
            "url": url,
            "started_at": started.isoformat(),
            "research": None,
            "proposal": None,
            "agent_outputs": [],
            "errors": [],
            "status": "running",
        }

        # Step 1: Research
        self._log(f"[1/3] Starting research for {url}...")
        research_result = run_research(
            url=url,
            deep_crawl=deep_crawl,
            progress_callback=self.progress_callback,
        )
        results["research"] = research_result

        if not research_result.get("success"):
            results["errors"].append(f"Research: {research_result.get('error')}")
            results["status"] = "partial"
            # Continue anyway with empty research
            research_data = {}
        else:
            research_data = research_result.get("research", {})

        # Step 2: Proposal (optional)
        if run_proposal and research_data:
            self._log("[2/3] Generating client proposal...")
            proposal_result = generate_proposal(
                research_data=research_data,
                setup_fee=setup_fee,
                monthly_retainer=monthly_retainer,
                agency_name=agency_name,
            )
            results["proposal"] = proposal_result
            if not proposal_result.get("success"):
                results["errors"].append(f"Proposal: {proposal_result.get('error')}")

        # Step 3: Agent sequence
        if agent_sequence:
            self._log(f"[3/3] Running {len(agent_sequence)} agents...")
            context = {}
            for i, step in enumerate(agent_sequence):
                agent_id = step.get("agent_id", "custom")
                task = step.get("task", "Provide marketing recommendations")
                self._log(f"  Agent {i+1}/{len(agent_sequence)}: {agent_id}")

                agent_result = run_agent(
                    agent_id=agent_id,
                    task=task,
                    context=context if context else None,
                    research_data=research_data if research_data else None,
                    max_tokens=2500,
                    progress_callback=self.progress_callback,
                )

                results["agent_outputs"].append({
                    **agent_result,
                    "task": task,
                    "step": i + 1,
                })

                # Feed output as context for next agent
                if agent_result.get("success"):
                    context[agent_id] = agent_result.get("output", "")[:2000]

                # Small delay between agents to avoid rate limiting
                if i < len(agent_sequence) - 1:
                    time.sleep(0.5)

        results["completed_at"] = datetime.now().isoformat()
        results["status"] = "completed" if not results["errors"] else "partial"
        results["cost_summary"] = get_cost_summary()

        self._log("Workflow complete!")
        return results

    def run_agents_only(
        self,
        agent_sequence: List[Dict[str, Any]],
        research_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Run just the agent sequence (no research/proposal)."""
        started = datetime.now()
        results = {
            "started_at": started.isoformat(),
            "agent_outputs": [],
            "errors": [],
            "status": "running",
        }

        context = {}
        for i, step in enumerate(agent_sequence):
            agent_id = step.get("agent_id", "custom")
            task = step.get("task", "Provide marketing recommendations")
            self._log(f"Running agent {i+1}/{len(agent_sequence)}: {agent_id}...")

            result = run_agent(
                agent_id=agent_id,
                task=task,
                context=context if context else None,
                research_data=research_data,
                max_tokens=2500,
                progress_callback=self.progress_callback,
            )

            results["agent_outputs"].append({**result, "task": task, "step": i + 1})

            if result.get("success"):
                context[agent_id] = result.get("output", "")[:2000]
            else:
                results["errors"].append(f"Agent {agent_id}: {result.get('error')}")

            if i < len(agent_sequence) - 1:
                time.sleep(0.5)

        results["completed_at"] = datetime.now().isoformat()
        results["status"] = "completed" if not results["errors"] else "partial"
        results["cost_summary"] = get_cost_summary()
        return results


# ---------------------------------------------------------------------------
# LangGraph-based workflow (enhanced, if available)
# ---------------------------------------------------------------------------

def build_langgraph_workflow(
    url: str,
    deep_crawl: bool = False,
    agent_sequence: Optional[List[Dict[str, Any]]] = None,
    run_proposal: bool = True,
) -> Optional[Any]:
    """
    Build a LangGraph StateGraph for the full pipeline.
    Returns compiled graph or None if LangGraph not available.
    """
    if not LANGGRAPH_AVAILABLE:
        return None

    try:
        graph = StateGraph(WorkflowState)

        # Add nodes
        graph.add_node("research", lambda s: node_research(s))

        if run_proposal:
            graph.add_node("proposal", lambda s: node_generate_proposal(s))

        if agent_sequence:
            for i in range(len(agent_sequence)):
                graph.add_node(f"agent_{i}", lambda s, idx=i: node_run_agents(s))

        # Connect nodes
        graph.set_entry_point("research")

        if run_proposal:
            graph.add_edge("research", "proposal")
            prev = "proposal"
        else:
            prev = "research"

        if agent_sequence:
            graph.add_edge(prev, "agent_0")
            for i in range(len(agent_sequence) - 1):
                graph.add_edge(f"agent_{i}", f"agent_{i+1}")
            graph.add_edge(f"agent_{len(agent_sequence)-1}", END)
        else:
            graph.add_edge(prev, END)

        return graph.compile()
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Pre-built Workflow Templates
# ---------------------------------------------------------------------------

WORKFLOW_TEMPLATES = {
    "quick_audit": {
        "name": "Quick Audit & Proposal",
        "description": "Research the site → generate client proposal. Best for initial client outreach.",
        "icon": "🚀",
        "steps": ["research", "proposal"],
        "agent_sequence": [],
        "estimated_time": "3-5 min",
        "credits": "~2 Firecrawl + ~5K Claude tokens",
    },
    "full_marketing_plan": {
        "name": "Full Marketing Plan",
        "description": "Research → Proposal → SEO + Content + Lead Gen agents. Complete marketing plan.",
        "icon": "🎯",
        "steps": ["research", "proposal", "seo", "content_engine", "lead_gen"],
        "agent_sequence": [
            {"agent_id": "seo", "task": "Create a 90-day SEO action plan based on the research"},
            {"agent_id": "content_engine", "task": "Create a 30-day content calendar"},
            {"agent_id": "lead_gen", "task": "Create LinkedIn outreach + cold email sequence"},
        ],
        "estimated_time": "8-12 min",
        "credits": "~2 Firecrawl + ~15K Claude tokens",
    },
    "social_media_blitz": {
        "name": "Social Media Blitz",
        "description": "Research → Social Media + Content + Review agents. Full social presence plan.",
        "icon": "📱",
        "steps": ["research", "social_media", "content_engine", "review_referral"],
        "agent_sequence": [
            {"agent_id": "social_media", "task": "Create 2-week social media content calendar across all platforms"},
            {"agent_id": "content_engine", "task": "Write 5 blog posts to support the social content"},
            {"agent_id": "review_referral", "task": "Create a Google Review campaign and referral program"},
        ],
        "estimated_time": "6-8 min",
        "credits": "~1 Firecrawl + ~10K Claude tokens",
    },
    "lead_gen_machine": {
        "name": "Lead Gen Machine",
        "description": "Research → Lead Gen + Email/SMS + Paid Ads. Full lead generation system.",
        "icon": "💰",
        "steps": ["research", "lead_gen", "email_sms", "paid_ads"],
        "agent_sequence": [
            {"agent_id": "lead_gen", "task": "Define ICP and create outreach sequences"},
            {"agent_id": "email_sms", "task": "Create 7-email nurture sequence for new leads"},
            {"agent_id": "paid_ads", "task": "Create Facebook + Google ad campaign strategy"},
        ],
        "estimated_time": "6-10 min",
        "credits": "~1 Firecrawl + ~12K Claude tokens",
    },
    "complete_domination": {
        "name": "Complete Domination",
        "description": "Everything: Research → Proposal → All 6 core agents. Full agency deliverable.",
        "icon": "👑",
        "steps": ["research", "proposal", "seo", "content_engine", "lead_gen", "email_sms", "social_media", "paid_ads"],
        "agent_sequence": [
            {"agent_id": "seo", "task": "Create comprehensive 90-day SEO plan"},
            {"agent_id": "content_engine", "task": "Create 30-day content calendar and 3 blog posts"},
            {"agent_id": "lead_gen", "task": "Build complete lead generation system with outreach sequences"},
            {"agent_id": "email_sms", "task": "Create full email nurture and SMS campaign"},
            {"agent_id": "social_media", "task": "Create 2-week social calendar for all platforms"},
            {"agent_id": "paid_ads", "task": "Design paid ads strategy for Meta and Google"},
        ],
        "estimated_time": "15-20 min",
        "credits": "~2 Firecrawl + ~30K Claude tokens",
    },
}


def get_workflow_template(template_id: str) -> Optional[Dict[str, Any]]:
    return WORKFLOW_TEMPLATES.get(template_id)


def list_workflow_templates() -> List[Dict[str, Any]]:
    return [{"id": k, **v} for k, v in WORKFLOW_TEMPLATES.items()]
