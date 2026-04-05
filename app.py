"""
app.py - snappymarketer: AI Marketing Platform
Main Streamlit application with 5 tabs: Dashboard | Research | Proposal | Agents | Workflows
"""

import os
import json
import time
import tempfile
from datetime import datetime
from typing import Optional, Dict, Any, List

import streamlit as st
from dotenv import load_dotenv

load_dotenv()

# ── Page config (must be first Streamlit call) ──────────────────────────────
st.set_page_config(
    page_title="snappymarketer – AI Marketing Platform",
    page_icon="S",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Theme CSS ──────────────────────────────────────────────────────────────
DARK_CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
* { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important; }
[data-testid="stAppViewContainer"] { background: #0d0d1a; color: #e2e8f0; }
[data-testid="stSidebar"] { background: #111127; border-right: 1px solid #1e1e3f; }
h1 { color: #a78bfa !important; font-size: 2rem !important; font-weight: 800 !important; letter-spacing: -0.5px !important; }
h2 { color: #a78bfa !important; font-size: 1.5rem !important; font-weight: 700 !important; }
h3 { color: #c4b5fd !important; font-size: 1.15rem !important; font-weight: 600 !important; }
h4 { color: #818cf8 !important; font-size: 1rem !important; font-weight: 600 !important; }
p, li { color: #cbd5e1 !important; font-size: 0.9rem !important; line-height: 1.6 !important; }
label { color: #94a3b8 !important; font-size: 0.82rem !important; font-weight: 500 !important; letter-spacing: 0.02em !important; }
.stButton > button {
    background: linear-gradient(135deg, #4f46e5, #7c3aed) !important;
    color: #ffffff !important; border: none !important; border-radius: 8px !important;
    font-weight: 600 !important; font-size: 0.875rem !important;
    letter-spacing: 0.01em !important; padding: 0.55rem 1.4rem !important;
    line-height: 1.4 !important; transition: all 0.2s !important;
}
.stButton > button:hover {
    background: linear-gradient(135deg, #6366f1, #8b5cf6) !important;
    transform: translateY(-1px) !important; box-shadow: 0 4px 15px rgba(99,102,241,0.4) !important;
}
.stButton > button p { color: #ffffff !important; font-size: 0.875rem !important; font-weight: 600 !important; }
.stTextInput > div > div > input,
.stTextArea > div > div > textarea {
    background: #1a1a2e !important; color: #e2e8f0 !important;
    border: 1px solid #2d2d5e !important; border-radius: 8px !important;
    font-size: 0.9rem !important;
}
[data-testid="stMetric"] {
    background: #1a1a2e; border: 1px solid #2d2d5e;
    border-radius: 12px; padding: 1rem;
}
[data-testid="stMetricValue"] { color: #a78bfa !important; font-weight: 700 !important; }
[data-testid="stMetricLabel"] { color: #64748b !important; font-size: 0.78rem !important; font-weight: 500 !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; }
.streamlit-expanderHeader {
    background: #1a1a2e !important; border: 1px solid #2d2d5e !important;
    border-radius: 8px !important; color: #a78bfa !important; font-weight: 600 !important;
}
.stTabs [data-baseweb="tab-list"] {
    background: #111127; border-radius: 10px; padding: 4px; gap: 4px;
}
.stTabs [data-baseweb="tab"] { border-radius: 8px; color: #94a3b8; font-weight: 500; font-size: 0.875rem; padding: 8px 18px; }
.stTabs [aria-selected="true"] { background: linear-gradient(135deg, #4f46e5, #7c3aed) !important; color: white !important; font-weight: 600 !important; }
.stDataFrame { background: #1a1a2e !important; }
.metric-card {
    background: linear-gradient(135deg, #1a1a2e, #1e1e3f);
    border: 1px solid #2d2d5e; border-radius: 12px; padding: 1.4rem; margin: 0.5rem 0;
}
.metric-card h4 { margin-bottom: 0.5rem !important; }
.metric-card p { margin: 0.4rem 0 !important; }
.metric-card small { color: #64748b !important; font-size: 0.78rem !important; }
.sidebar-logo {
    font-size: 1.5rem; font-weight: 800; letter-spacing: -0.5px;
    background: linear-gradient(135deg, #818cf8, #a78bfa);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 0.1rem;
}
.sidebar-tagline { font-size: 0.72rem; color: #64748b; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 1.5rem; }
.stProgress > div > div { background: linear-gradient(90deg, #4f46e5, #7c3aed) !important; }
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: #0d0d1a; }
::-webkit-scrollbar-thumb { background: #2d2d5e; border-radius: 3px; }
div[data-testid="stSelectbox"] > div > div { background: #1a1a2e !important; color: #e2e8f0 !important; }
.stCaption, .caption { color: #64748b !important; font-size: 0.8rem !important; }
/* hide Streamlit heading anchor links */
h1 a, h2 a, h3 a, h4 a { display: none !important; }
/* research result cards */
[data-testid="stMarkdownContainer"] div[style*="border:1px solid #2d2d5e"] { background: #13132a; color: #e2e8f0; }
[data-testid="stMarkdownContainer"] div[style*="border:1px solid #2d2d5e"] strong { color: #a78bfa; }
</style>
"""

LIGHT_CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
* { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important; }
[data-testid="stAppViewContainer"] { background: #f8fafc; color: #1e293b; }
[data-testid="stSidebar"] { background: #ffffff; border-right: 1px solid #e2e8f0; }
h1 { color: #4f46e5 !important; font-size: 2rem !important; font-weight: 800 !important; letter-spacing: -0.5px !important; }
h2 { color: #4f46e5 !important; font-size: 1.5rem !important; font-weight: 700 !important; }
h3 { color: #4338ca !important; font-size: 1.15rem !important; font-weight: 600 !important; }
h4 { color: #6366f1 !important; font-size: 1rem !important; font-weight: 600 !important; }
p, li { color: #475569 !important; font-size: 0.9rem !important; line-height: 1.6 !important; }
label { color: #64748b !important; font-size: 0.82rem !important; font-weight: 500 !important; letter-spacing: 0.02em !important; }
.stButton > button {
    background: linear-gradient(135deg, #4f46e5, #7c3aed) !important;
    color: #ffffff !important; border: none !important; border-radius: 8px !important;
    font-weight: 600 !important; font-size: 0.875rem !important;
    letter-spacing: 0.01em !important; padding: 0.55rem 1.4rem !important;
    line-height: 1.4 !important; transition: all 0.2s !important;
}
.stButton > button:hover {
    background: linear-gradient(135deg, #6366f1, #8b5cf6) !important;
    transform: translateY(-1px) !important; box-shadow: 0 4px 15px rgba(99,102,241,0.3) !important;
}
.stButton > button p { color: #ffffff !important; font-size: 0.875rem !important; font-weight: 600 !important; }
.stTextInput > div > div > input,
.stTextArea > div > div > textarea {
    background: #ffffff !important; color: #1e293b !important;
    border: 1px solid #cbd5e1 !important; border-radius: 8px !important;
    font-size: 0.9rem !important;
}
[data-testid="stMetric"] {
    background: #ffffff; border: 1px solid #e2e8f0;
    border-radius: 12px; padding: 1rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.07);
}
[data-testid="stMetricValue"] { color: #4f46e5 !important; font-weight: 700 !important; }
[data-testid="stMetricLabel"] { color: #94a3b8 !important; font-size: 0.78rem !important; font-weight: 500 !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; }
.streamlit-expanderHeader {
    background: #f1f5f9 !important; border: 1px solid #e2e8f0 !important;
    border-radius: 8px !important; color: #4f46e5 !important; font-weight: 600 !important;
}
.stTabs [data-baseweb="tab-list"] {
    background: #f1f5f9; border-radius: 10px; padding: 4px; gap: 4px;
}
.stTabs [data-baseweb="tab"] { border-radius: 8px; color: #1e293b; font-weight: 500; font-size: 0.875rem; padding: 8px 18px; }
.stTabs [data-baseweb="tab"]:hover { color: #4f46e5 !important; background: rgba(79,70,229,0.06) !important; }
.stTabs [aria-selected="true"] { background: linear-gradient(135deg, #4f46e5, #7c3aed) !important; color: white !important; font-weight: 600 !important; }
.metric-card {
    background: #ffffff;
    border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.4rem; margin: 0.5rem 0;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.metric-card h4 { margin-bottom: 0.5rem !important; }
.metric-card p { margin: 0.4rem 0 !important; }
.metric-card small { color: #94a3b8 !important; font-size: 0.78rem !important; }
.sidebar-logo {
    font-size: 1.5rem; font-weight: 800; letter-spacing: -0.5px;
    background: linear-gradient(135deg, #4f46e5, #7c3aed);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 0.1rem;
}
.sidebar-tagline { font-size: 0.72rem; color: #94a3b8; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 1.5rem; }
.stProgress > div > div { background: linear-gradient(90deg, #4f46e5, #7c3aed) !important; }
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: #f1f5f9; }
::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
div[data-testid="stSelectbox"] > div > div { background: #ffffff !important; color: #1e293b !important; }
.stCaption, .caption { color: #94a3b8 !important; font-size: 0.8rem !important; }
/* hide Streamlit heading anchor links */
h1 a, h2 a, h3 a, h4 a { display: none !important; }
/* light mode cards - override inline dark border color */
[data-testid="stMarkdownContainer"] div[style*="border:1px solid #2d2d5e"] { border-color: #e2e8f0 !important; background: #ffffff !important; color: #1e293b !important; }
</style>
"""

def apply_theme():
    theme = st.session_state.get("theme", "dark")
    css = DARK_CSS if theme == "dark" else LIGHT_CSS
    st.markdown(css, unsafe_allow_html=True)

# ── Lazy imports (avoid crashing on missing optional packages) ──────────────
def _import_db():
    from database import (
        init_db, get_all_clients, get_client_by_id, create_client,
        delete_client, get_research_for_client, get_latest_research,
        save_research, save_proposal, get_proposals_for_client,
        save_agent_run, save_workflow_run,
    )
    return dict(
        init_db=init_db, get_all_clients=get_all_clients,
        get_client_by_id=get_client_by_id, create_client=create_client,
        delete_client=delete_client,
        get_research_for_client=get_research_for_client,
        get_latest_research=get_latest_research,
        save_research=save_research, save_proposal=save_proposal,
        get_proposals_for_client=get_proposals_for_client,
        save_agent_run=save_agent_run, save_workflow_run=save_workflow_run,
    )

@st.cache_resource
def get_db_fns():
    fns = _import_db()
    fns["init_db"]()
    return fns

DB = get_db_fns()

# ── Session state defaults ──────────────────────────────────────────────────
DEFAULTS = {
    "active_client_id": None,
    "active_client_name": "",
    "research_result": None,
    "proposal_markdown": "",
    "proposal_id": None,
    "last_url": "",
    "workflow_results": None,
    "agent_outputs": {},
    "cost_log": [],
    "theme": "dark",
}
for k, v in DEFAULTS.items():
    if k not in st.session_state:
        st.session_state[k] = v

# ── Helper: format large numbers ────────────────────────────────────────────
def fmt_num(n):
    if n >= 1_000_000:
        return f"{n/1_000_000:.1f}M"
    if n >= 1_000:
        return f"{n/1_000:.1f}K"
    return str(n)

# ═══════════════════════════════════════════════════════════════════════════
#  SIDEBAR
# ═══════════════════════════════════════════════════════════════════════════
def render_sidebar():
    with st.sidebar:
        st.markdown('<div class="sidebar-logo"><span style="-webkit-text-fill-color:#1e293b;background:none;">Snappy</span><span>marketer</span></div>', unsafe_allow_html=True)
        st.markdown('<div class="sidebar-tagline">AI Marketing Platform</div>', unsafe_allow_html=True)
        st.divider()

        # ── Client selector ────────────────────────────────────────────────
        st.markdown("**Active Client**")
        clients = DB["get_all_clients"]()

        if clients:
            client_options = {f"{c['name']} ({c['website_url'][:30]}...)": c["id"] for c in clients}
            client_labels = ["— Select client —"] + list(client_options.keys())
            selected = st.selectbox("Client", client_labels, label_visibility="collapsed")
            if selected != "— Select client —":
                cid = client_options[selected]
                st.session_state.active_client_id = cid
                st.session_state.active_client_name = selected.split(" (")[0]
        else:
            st.info("No clients yet. Add one in Research.")

        if st.session_state.active_client_id:
            st.success(f"{st.session_state.active_client_name}  ✓")

        st.divider()

        # ── Cost Tracker (collapsible) ────────────────────────────────────
        with st.expander(f"Session Usage", expanded=False):
            try:
                from utils import get_cost_summary
                costs = get_cost_summary()
                col1, col2 = st.columns(2)
                with col1:
                    st.metric("Claude", f"${costs['claude_cost_usd']}")
                    st.metric("Tokens", fmt_num(costs["claude_input_tokens"] + costs["claude_output_tokens"]))
                with col2:
                    st.metric("Firecrawl", f"${costs['firecrawl_cost_usd']}")
                    st.metric("Credits", costs["firecrawl_credits"])
                st.caption(f"Total: **${costs['total_cost_usd']}** | {costs['calls']} calls")
            except Exception:
                st.caption("Cost tracking unavailable")

        st.divider()
        st.caption("snappymarketer · Powered by Claude + Firecrawl")

# ═══════════════════════════════════════════════════════════════════════════
#  TAB 1 – DASHBOARD
# ═══════════════════════════════════════════════════════════════════════════
def tab_dashboard():
    st.header("Dashboard")
    st.caption("Your all-in-one AI marketing command centre.")

    clients = DB["get_all_clients"]()
    total_clients = len(clients)

    # ── KPI Row ────────────────────────────────────────────────────────────
    c1, c2, c3, c4 = st.columns(4)
    with c1:
        st.metric("Total Clients", total_clients)
    with c2:
        try:
            from utils import get_cost_summary
            costs = get_cost_summary()
            st.metric("Session Cost", f"${costs['total_cost_usd']}")
        except Exception:
            st.metric("Session Cost", "$0.00")
    with c3:
        st.metric("Agents Available", "8")
    with c4:
        st.metric("Workflow Templates", "5")

    st.divider()

    # ── Recent clients table ───────────────────────────────────────────────
    col_left, col_right = st.columns([2, 1])

    with col_left:
        st.markdown("### Recent Clients")
        if not clients:
            st.info("No clients yet. Head to the **Research** tab to add your first one!")
        else:
            import pandas as pd
            df = pd.DataFrame(clients)[["name", "website_url", "industry", "created_at"]].copy()
            df.columns = ["Client", "Website", "Industry", "Added"]
            df["Added"] = df["Added"].str[:10]
            st.dataframe(df, use_container_width=True, hide_index=True)

    with col_right:
        st.markdown("### Quick Actions")
        if st.button("New Research", use_container_width=True):
            st.session_state["_nav"] = "Research"
            st.rerun()
        if st.button("Generate Proposal", use_container_width=True):
            st.session_state["_nav"] = "Proposal"
            st.rerun()
        if st.button("Run Agent", use_container_width=True):
            st.session_state["_nav"] = "Agents"
            st.rerun()
        if st.button("Run Workflow", use_container_width=True):
            st.session_state["_nav"] = "Workflows"
            st.rerun()

    st.divider()

    # ── Platform overview cards ────────────────────────────────────────────
    st.markdown("### Platform Overview")
    c1, c2, c3 = st.columns(3)

    with c1:
        st.markdown("""
<div class="metric-card">
<h4>Research Engine</h4>
<p>Scrape any website with Firecrawl, then get a full AI marketing audit including keywords, gaps, competitors & quick wins.</p>
<small>Powered by Firecrawl + Claude</small>
</div>""", unsafe_allow_html=True)

    with c2:
        st.markdown("""
<div class="metric-card">
<h4>Proposal Generator</h4>
<p>Turn your audit into a polished client proposal with custom pricing, PDF export, and follow-up email.</p>
<small>One-click PDF download</small>
</div>""", unsafe_allow_html=True)

    with c3:
        st.markdown("""
<div class="metric-card">
<h4>AI Agent Squad</h4>
<p>8 specialist agents: Content, SEO, Ads, Lead Gen, Email, Social, Reviews & Custom. Chain them into powerful workflows.</p>
<small>Powered by Claude AI</small>
</div>""", unsafe_allow_html=True)

# ═══════════════════════════════════════════════════════════════════════════
#  TAB 2 - RESEARCH
# ═══════════════════════════════════════════════════════════════════════════
def tab_research():
    st.header("Research & Audit")
    st.caption("Scrape any website with Firecrawl then get a full marketing intelligence report powered by Claude.")

    col1, col2 = st.columns([3, 1])
    with col1:
        url = st.text_input(
            "Website URL",
            value=st.session_state.get("last_url", ""),
            placeholder="https://empyreanservices.com/",
        )
    with col2:
        deep_crawl = st.checkbox("Deep Crawl", help="Crawl up to 10 pages (uses ~10 Firecrawl credits)")

    col3, col4 = st.columns([2, 2])
    with col3:
        client_name = st.text_input("Client Name (for saving)", placeholder="e.g. Empyrean Services")
    with col4:
        crawl_limit = st.slider("Max pages (deep crawl)", 5, 20, 10) if deep_crawl else 10

    st.caption("Credit usage: ~1 Firecrawl credit per page. Deep crawl = up to 10 credits.")

    # ── API key diagnostics ────────────────────────────────────────────────
    _missing_keys = []
    if not os.getenv("ANTHROPIC_API_KEY", "").strip():
        _missing_keys.append("ANTHROPIC_API_KEY")
    if not os.getenv("FIRECRAWL_API_KEY", "").strip():
        _missing_keys.append("FIRECRAWL_API_KEY")
    if _missing_keys:
        st.error(
            f"Missing environment variable(s): **{', '.join(_missing_keys)}**  \n"
            "Go to your Railway project → **Settings → Variables**, add them, then redeploy."
        )

    run_btn = st.button(
        "Run AI Research Audit", type="primary",
        use_container_width=True, disabled=bool(_missing_keys)
    )

    if run_btn:
        if not url or not url.startswith("http"):
            st.error("Please enter a valid URL starting with http:// or https://")
            return

        client_id = None
        if client_name:
            client = DB["create_client"](name=client_name, website_url=url)
            client_id = client.id
            st.session_state.active_client_id = client_id
            st.session_state.active_client_name = client_name

        st.session_state.last_url = url
        progress_bar = st.progress(0)
        status_box = st.empty()
        log_msgs = []

        def progress_cb(msg):
            log_msgs.append(msg)
            status_box.info(f"Running: {msg}")

        with st.spinner("Running research pipeline..."):
            try:
                from research_agent import run_research
                progress_bar.progress(10)
                result = run_research(
                    url=url,
                    deep_crawl=deep_crawl,
                    crawl_limit=crawl_limit,
                    progress_callback=progress_cb,
                )
                progress_bar.progress(90)
                if result.get("success"):
                    st.session_state.research_result = result
                    if client_id:
                        DB["save_research"](
                            client_id=client_id,
                            url=url,
                            scraped_markdown=result.get("scraped_markdown", ""),
                            research_data=result.get("research", {}),
                            deep_crawl=deep_crawl,
                            pages_crawled=result.get("pages_crawled", 1),
                            credits_used=result.get("credits_used", 1),
                            scrape_source=result.get("scrape_source", "firecrawl"),
                        )
                    progress_bar.progress(100)
                    status_box.success("Research complete!")
                    st.rerun()
                else:
                    progress_bar.progress(100)
                    st.error(f"Research failed: {result.get('error', 'Unknown error')}")
            except Exception as e:
                st.error(f"Error: {e}")

    result = st.session_state.get("research_result")

    if not result and st.session_state.active_client_id:
        saved = DB["get_latest_research"](st.session_state.active_client_id)
        if saved:
            result = {
                "success": True,
                "research": saved["research_data"],
                "scraped_markdown": saved.get("scraped_markdown", ""),
                "pages_crawled": saved.get("pages_crawled", 1),
                "scrape_source": saved.get("scrape_source", "db"),
            }

    if result and result.get("success"):
        data = result.get("research", {})
        _render_research_results(data, result)


def _build_summary_markdown(data: dict) -> str:
    """Build a clean human-readable Markdown report from research JSON."""
    biz = data.get("business_name", "Business")
    score = data.get("overall_marketing_score", {})
    score_val = score.get("score", 0) if isinstance(score, dict) else 0

    lines = []
    lines.append(f"# Marketing Audit Report: {biz}")
    lines.append(f"**Industry:** {data.get('industry','N/A')}  |  **Location:** {data.get('location','N/A')}  |  **Score:** {score_val}/100")
    lines.append("")

    # Services
    services = data.get("services_offered", [])
    if services:
        lines.append("## Services Offered")
        for s in services:
            lines.append(f"- {s}")
        lines.append("")

    # Gaps
    gaps = data.get("current_marketing_gaps", [])
    if gaps:
        lines.append("## Marketing Gaps")
        for g in gaps:
            lines.append(f"- {g}")
        lines.append("")

    # Strengths
    strengths = data.get("current_marketing_strengths", [])
    if strengths:
        lines.append("## Strengths")
        for s in strengths:
            lines.append(f"- {s}")
        lines.append("")

    # Target Audience
    personas = data.get("target_audience", [])
    if personas:
        lines.append("## Target Audience")
        for i, p in enumerate(personas):
            if isinstance(p, dict):
                lines.append(f"### Persona {i+1}: {p.get('persona_name','Segment')}")
                lines.append(f"**Demographics:** {p.get('demographics','N/A')}  ")
                lines.append("")
                lines.append(f"**Where to reach:** {p.get('where_to_reach','N/A')}  ")
                lines.append("")
                pains = p.get("pain_points", [])
                if pains:
                    lines.append("**Pain Points:**")
                    for pain in pains:
                        lines.append(f"- {pain}")
            else:
                lines.append(f"- {p}")
        lines.append("")

    # Keywords
    keywords = data.get("top_10_longtail_keywords", [])
    if keywords:
        lines.append("## Top Keywords")
        for kw in keywords:
            if isinstance(kw, dict):
                lines.append(f"- **{kw.get('keyword','')}** — {kw.get('intent','')} intent, {kw.get('difficulty','')} difficulty")
            else:
                lines.append(f"- {kw}")
        lines.append("")

    # Competitors
    competitors = data.get("competitor_analysis", [])
    if competitors:
        lines.append("## Competitor Analysis")
        for comp in competitors:
            if isinstance(comp, dict):
                lines.append(f"### {comp.get('name','Competitor')}")
                lines.append(f"**Strengths:** {comp.get('strengths','N/A')}")
                lines.append(f"**Weaknesses:** {comp.get('weaknesses','N/A')}")
                lines.append(f"**Est. Traffic:** {comp.get('estimated_traffic','N/A')}")
            else:
                lines.append(f"- {comp}")
        lines.append("")

    # Quick Wins
    wins = data.get("quick_win_opportunities", [])
    if wins:
        lines.append("## Quick Wins")
        for i, win in enumerate(wins):
            if isinstance(win, dict):
                effort = win.get("effort","medium")
                lines.append(f"### {i+1}. {win.get('tactic','Tactic')} [{effort} effort]")
                lines.append(f"**Timeline:** {win.get('timeline','N/A')}  |  **Impact:** {win.get('expected_impact','N/A')}")
            else:
                lines.append(f"- {win}")
        lines.append("")

    # Suggested workflow
    workflow = data.get("suggested_agent_workflow", {})
    if workflow:
        lines.append("## Suggested Agent Workflow")
        for phase, desc in workflow.items():
            lines.append(f"**{phase.replace('_',' ').title()}:** {desc}")
        lines.append("")

    # Contact
    contact = data.get("key_contact_info", {})
    if contact:
        lines.append("## Contact Info")
        for k, v in contact.items():
            if v:
                lines.append(f"- **{k.replace('_',' ').title()}:** {v}")
        lines.append("")

    # Score breakdown
    if isinstance(score, dict) and "breakdown" in score:
        lines.append("## Score Breakdown")
        for k, v in score["breakdown"].items():
            lines.append(f"- **{k.title()}:** {v}/100")
        if score.get("summary"):
            lines.append(f"\n_{score['summary']}_")

    return "\n".join(lines)


def _render_research_results(data: dict, result: dict):
    biz_name = data.get("business_name", "Business")
    score = data.get("overall_marketing_score", {})
    score_val = score.get("score", 0) if isinstance(score, dict) else 0

    st.markdown(f"### Audit Results: **{biz_name}**")

    c1, c2, c3, c4 = st.columns(4)
    with c1:
        st.metric("Marketing Score", f"{score_val}/100")
    with c2:
        st.metric("Pages Scraped", result.get("pages_crawled", 1))
    with c3:
        st.metric("Services Found", len(data.get("services_offered", [])))
    with c4:
        st.metric("Quick Wins", len(data.get("quick_win_opportunities", [])))

    st.success("Research complete! Go to the Proposal tab to generate a client proposal.")

    t0, t1, t2, t3, t4, t5, t6 = st.tabs([
        "Summary", "Overview", "Audience", "SEO & Keywords",
        "Competitors", "Quick Wins", "Export"
    ])

    # ── SUMMARY TAB ──────────────────────────────────────────────────────────
    with t0:
        summary_md = _build_summary_markdown(data)
        st.markdown(summary_md)
        st.divider()
        st.markdown("**Download Report**")
        dl1, dl2, dl3 = st.columns(3)
        with dl1:
            st.download_button(
                "Download Markdown",
                data=summary_md,
                file_name=f"audit_{biz_name.replace(' ','_')}.md",
                mime="text/markdown",
                use_container_width=True,
            )
        with dl2:
            st.download_button(
                "Download JSON",
                data=json.dumps(data, indent=2),
                file_name=f"audit_{biz_name.replace(' ','_')}.json",
                mime="application/json",
                use_container_width=True,
            )
        with dl3:
            if st.button("Download PDF", use_container_width=True, key="summary_pdf"):
                with st.spinner("Generating PDF..."):
                    try:
                        from utils import markdown_to_pdf, read_pdf_bytes
                        import tempfile, os
                        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
                        tmp.close()
                        path = markdown_to_pdf(summary_md, output_path=tmp.name)
                        if path:
                            pdf_bytes = read_pdf_bytes(path)
                            if pdf_bytes:
                                st.session_state["_audit_pdf"] = pdf_bytes
                                st.session_state["_audit_pdf_name"] = biz_name
                                try: os.unlink(path)
                                except: pass
                    except Exception as e:
                        st.error(f"PDF error: {e}")
            if st.session_state.get("_audit_pdf"):
                st.download_button(
                    "Save PDF",
                    data=st.session_state["_audit_pdf"],
                    file_name=f"audit_{st.session_state.get('_audit_pdf_name','report').replace(' ','_')}.pdf",
                    mime="application/pdf",
                    use_container_width=True,
                    key="save_audit_pdf",
                )

    # ── OVERVIEW TAB ─────────────────────────────────────────────────────────
    with t1:
        col1, col2 = st.columns(2)
        with col1:
            st.markdown("**Business Details**")
            st.markdown(f"- **Name:** {data.get('business_name', 'N/A')}")
            st.markdown(f"- **Industry:** {data.get('industry', 'N/A')}")
            st.markdown(f"- **Location:** {data.get('location', 'N/A')}")
            services = data.get("services_offered", [])
            if services:
                st.markdown("**Services Offered**")
                for s in services:
                    st.markdown(f"- {s}")
            contact = data.get("key_contact_info", {})
            if contact:
                st.markdown("**Contact Info**")
                for k, v in contact.items():
                    if v and str(v).strip() not in ("", "N/A", "[]", "{}"):
                        st.markdown(f"- **{k.replace('_',' ').title()}:** {v}")
        with col2:
            gaps = data.get("current_marketing_gaps", [])
            if gaps:
                st.markdown("**Marketing Gaps**")
                for gap in gaps:
                    st.markdown(f"- {gap}")
            strengths = data.get("current_marketing_strengths", [])
            if strengths:
                st.markdown("**Strengths**")
                for s in strengths:
                    st.markdown(f"- {s}")
        if isinstance(score, dict) and "breakdown" in score:
            st.markdown("**Score Breakdown**")
            import pandas as pd
            bd = score["breakdown"]
            df = pd.DataFrame([bd])
            st.bar_chart(df.T)
            if score.get("summary"):
                st.caption(score["summary"])

    # ── AUDIENCE TAB ─────────────────────────────────────────────────────────
    with t2:
        personas = data.get("target_audience", [])
        if not personas:
            st.info("No audience data found.")
        else:
            for i, p in enumerate(personas):
                if isinstance(p, dict):
                    name = p.get("persona_name", f"Segment {i+1}")
                    demo = p.get("demographics", "")
                    reach = p.get("where_to_reach", "")
                    pains = p.get("pain_points", [])
                    pain_html = "".join(f"<li>{x}</li>" for x in pains) if pains else "<li>N/A</li>"
                    st.markdown(f"""
<div style="border:1px solid #2d2d5e;border-radius:10px;padding:1.1rem 1.2rem;margin:0.6rem 0;">
  <div style="font-weight:700;font-size:0.95rem;margin-bottom:0.8rem;color:#7c3aed;">{i+1}. {name}</div>
  <table style="width:100%;border-collapse:collapse;font-size:0.85rem;margin-bottom:0.7rem;">
    <tr><td style="padding:4px 0;width:130px;font-weight:600;vertical-align:top;">Demographics</td><td style="padding:4px 0;">{demo}</td></tr>
    <tr><td style="padding:4px 0;font-weight:600;vertical-align:top;">Where to reach</td><td style="padding:4px 0;">{reach}</td></tr>
  </table>
  <div style="font-size:0.83rem;font-weight:600;margin-bottom:0.3rem;">Pain Points</div>
  <ul style="margin:0;padding-left:1.2rem;font-size:0.83rem;">{pain_html}</ul>
</div>""", unsafe_allow_html=True)
                else:
                    st.markdown(f"- {p}")

    # ── SEO & KEYWORDS TAB ───────────────────────────────────────────────────
    with t3:
        keywords = data.get("top_10_longtail_keywords", [])
        if keywords:
            import pandas as pd
            rows = []
            for kw in keywords:
                if isinstance(kw, dict):
                    rows.append({
                        "Keyword": kw.get("keyword", ""),
                        "Intent": kw.get("intent", "").capitalize(),
                        "Difficulty": kw.get("difficulty", "").capitalize(),
                    })
                else:
                    rows.append({"Keyword": str(kw), "Intent": "", "Difficulty": ""})
            df = pd.DataFrame(rows)
            st.dataframe(df, use_container_width=True, hide_index=True)
            st.download_button(
                "Download Keywords CSV",
                data=df.to_csv(index=False),
                file_name=f"keywords_{biz_name.replace(' ','_')}.csv",
                mime="text/csv",
            )
        else:
            st.info("No keyword data found.")

    # ── COMPETITORS TAB ──────────────────────────────────────────────────────
    with t4:
        competitors = data.get("competitor_analysis", [])
        if not competitors:
            st.info("No competitor data found.")
        else:
            for comp in competitors:
                if isinstance(comp, dict):
                    name = comp.get("name", "Competitor")
                    strengths = comp.get("strengths", "N/A")
                    weaknesses = comp.get("weaknesses", "N/A")
                    traffic = comp.get("estimated_traffic", "N/A")
                    st.markdown(f"""
<div style="border:1px solid #2d2d5e;border-radius:10px;padding:1rem 1.2rem;margin:0.6rem 0;">
  <div style="font-weight:700;font-size:1rem;margin-bottom:0.6rem;">{name}</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.8rem;font-size:0.85rem;">
    <div><strong>Strengths:</strong><br>{strengths}</div>
    <div><strong>Weaknesses:</strong><br>{weaknesses}</div>
  </div>
  <div style="margin-top:0.6rem;font-size:0.82rem;color:#64748b;">Est. Traffic: {traffic}</div>
</div>""", unsafe_allow_html=True)
                else:
                    st.markdown(f"- {comp}")

    # ── QUICK WINS TAB ───────────────────────────────────────────────────────
    with t5:
        wins = data.get("quick_win_opportunities", [])
        if not wins:
            st.info("No quick wins found.")
        else:
            effort_colors = {"low": "#166534", "medium": "#854d0e", "high": "#7f1d1d"}
            effort_bg = {"low": "#052e16", "medium": "#1c1917", "high": "#1c0e0e"}
            for i, win in enumerate(wins):
                if isinstance(win, dict):
                    effort = win.get("effort", "medium").lower()
                    tactic = win.get("tactic", "Tactic")
                    timeline = win.get("timeline", "N/A")
                    impact = win.get("expected_impact", "N/A")
                    ec = effort_colors.get(effort, "#475569")
                    eb = effort_bg.get(effort, "#1e293b")
                    st.markdown(f"""
<div style="border:1px solid #2d2d5e;border-radius:10px;padding:1rem 1.2rem;margin:0.6rem 0;">
  <div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:0.5rem;">
    <span style="background:#1e1e3f;color:#a78bfa;border-radius:50%;width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:0.8rem;">{i+1}</span>
    <span style="font-weight:600;font-size:0.95rem;">{tactic}</span>
    <span style="margin-left:auto;background:{eb};color:{ec};border:1px solid {ec};border-radius:20px;padding:2px 10px;font-size:0.75rem;font-weight:600;">{effort.upper()}</span>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;font-size:0.85rem;">
    <div><strong>Timeline:</strong> {timeline}</div>
    <div><strong>Impact:</strong> {impact}</div>
  </div>
</div>""", unsafe_allow_html=True)
                else:
                    st.markdown(f"- {win}")

    # ── EXPORT TAB ──────────────────────────────────────────────────────────
    with t6:
        st.markdown("**Raw JSON Data**")
        st.json(data)

# =============================================================================
#  TAB 3 - PROPOSAL
# =============================================================================
def tab_proposal():
    st.header("Client Proposal Generator")
    st.caption("Turn your research audit into a professional, ready-to-send client proposal.")

    # Pull research from session or DB
    result = st.session_state.get("research_result")
    if not result and st.session_state.active_client_id:
        saved = DB["get_latest_research"](st.session_state.active_client_id)
        if saved:
            result = {"success": True, "research": saved["research_data"]}

    research_data = result.get("research", {}) if result else {}
    biz_name = research_data.get("business_name", "Your Client")

    if not research_data:
        st.warning("No research data found. Run a Research Audit first, then come back here.")
        if st.button("Go to Research"):
            st.session_state["_nav"] = "Research"
            st.rerun()
        return

    st.success(f"Using research data for: **{biz_name}**")

    # Settings
    col1, col2 = st.columns(2)
    with col1:
        from utils import get_agency_info
        agency_defaults = get_agency_info()
        agency_name = st.text_input("Agency Name", value=agency_defaults["name"])
        setup_fee = st.text_input("One-Time Setup Fee ($)", value="2,500")
    with col2:
        monthly_retainer = st.text_input("Monthly Retainer ($)", value="1,500")
        performance_bonus = st.text_input("Performance Bonus", value="10% of incremental revenue")

    custom_notes = st.text_area(
        "Custom Notes (optional)",
        placeholder="Add any specific details, timeline constraints, or special offers...",
        height=80,
    )

    generate_btn = st.button("Generate Client Proposal", type="primary", use_container_width=True)

    if generate_btn:
        with st.spinner("Generating proposal with Claude..."):
            try:
                from proposal_agent import ProposalAgent
                agent = ProposalAgent()
                proposal_result = agent.generate(
                    research_data=research_data,
                    setup_fee=setup_fee,
                    monthly_retainer=monthly_retainer,
                    performance_bonus=performance_bonus,
                    custom_notes=custom_notes,
                    agency_name_override=agency_name,
                    max_tokens=3500,
                )
                if proposal_result.get("success"):
                    st.session_state.proposal_markdown = proposal_result["markdown"]
                    # Save to DB
                    if st.session_state.active_client_id:
                        saved_p = DB["save_proposal"](
                            client_id=st.session_state.active_client_id,
                            content_markdown=proposal_result["markdown"],
                            agency_name=agency_name,
                            setup_fee=setup_fee,
                            monthly_retainer=monthly_retainer,
                            performance_bonus=performance_bonus,
                            custom_notes=custom_notes,
                        )
                        st.session_state.proposal_id = saved_p.id
                    st.rerun()
                else:
                    st.error(f"Proposal generation failed: {proposal_result.get('error')}")
            except Exception as e:
                st.error(f"Error: {e}")

    # Display proposal
    proposal_md = st.session_state.get("proposal_markdown", "")

    if not proposal_md and st.session_state.active_client_id:
        saved_proposals = DB["get_proposals_for_client"](st.session_state.active_client_id)
        if saved_proposals:
            proposal_md = saved_proposals[0]["content_markdown"]
            st.session_state.proposal_markdown = proposal_md

    if proposal_md:
        st.divider()
        t1, t2, t3 = st.tabs(["Preview", "Edit", "Download & Export"])

        with t1:
            st.markdown(proposal_md)

        with t2:
            edited = st.text_area("Edit Proposal Markdown", value=proposal_md, height=600)
            if st.button("Save Edits", use_container_width=True):
                st.session_state.proposal_markdown = edited
                st.success("Saved to session.")

        with t3:
            st.markdown("### Download Options")
            col1, col2, col3 = st.columns(3)

            with col1:
                st.download_button(
                    "Download Markdown",
                    data=st.session_state.proposal_markdown,
                    file_name=f"proposal_{biz_name.replace(' ','_')}.md",
                    mime="text/markdown",
                    use_container_width=True,
                )

            with col2:
                if st.button("Generate PDF", use_container_width=True):
                    with st.spinner("Generating PDF..."):
                        try:
                            from proposal_agent import ProposalAgent
                            agent = ProposalAgent()
                            pdf_bytes = agent.generate_pdf(
                                st.session_state.proposal_markdown,
                                business_name=biz_name,
                            )
                            if pdf_bytes:
                                st.session_state["_pdf_bytes"] = pdf_bytes
                                st.session_state["_pdf_name"] = biz_name
                                st.success("PDF ready! Click Download PDF.")
                            else:
                                st.error("PDF generation failed. Try downloading Markdown instead.")
                        except Exception as e:
                            st.error(f"PDF error: {e}")

                if st.session_state.get("_pdf_bytes"):
                    st.download_button(
                        "Download PDF",
                        data=st.session_state["_pdf_bytes"],
                        file_name=f"proposal_{st.session_state.get('_pdf_name','client').replace(' ','_')}.pdf",
                        mime="application/pdf",
                        use_container_width=True,
                    )

            with col3:
                if st.button("Generate Follow-up Email", use_container_width=True):
                    with st.spinner("Writing email..."):
                        try:
                            from proposal_agent import ProposalAgent
                            agent = ProposalAgent()
                            email_text = agent.generate_executive_summary_email(
                                research_data, st.session_state.proposal_markdown
                            )
                            st.session_state["_followup_email"] = email_text
                        except Exception as e:
                            st.error(f"Error: {e}")

            if st.session_state.get("_followup_email"):
                st.markdown("### Follow-up Email")
                st.text_area("", value=st.session_state["_followup_email"], height=300)

        # Saved proposals
        if st.session_state.active_client_id:
            saved_proposals = DB["get_proposals_for_client"](st.session_state.active_client_id)
            if len(saved_proposals) > 1:
                st.divider()
                st.markdown("### Previous Proposals")
                for p in saved_proposals[1:]:
                    with st.expander(f"Proposal from {p['created_at'][:10]}"):
                        st.markdown(p["content_markdown"][:500] + "...")
                        if st.button(f"Load this proposal", key=f"load_p_{p['id']}"):
                            st.session_state.proposal_markdown = p["content_markdown"]
                            st.rerun()

# =============================================================================
#  TAB 4 - AGENTS
# =============================================================================
def tab_agents():
    st.header("AI Agent Builder")
    st.caption("Run specialist AI agents powered by Claude. Each agent is loaded with your client context.")

    from agents import get_agent_list, run_agent, AGENT_REGISTRY

    # Get research context
    result = st.session_state.get("research_result")
    if not result and st.session_state.active_client_id:
        saved = DB["get_latest_research"](st.session_state.active_client_id)
        if saved:
            result = {"success": True, "research": saved["research_data"]}

    research_data = result.get("research", {}) if result else {}
    biz_name = research_data.get("business_name", "")

    if research_data:
        st.info(f"Context loaded for: **{biz_name}** | All agents will use this research data.")
    else:
        st.warning("No client research loaded. Agents will run without client context. Run Research first for best results.")

    agent_list = get_agent_list()

    # Agent selector
    col1, col2 = st.columns([1, 2])
    with col1:
        st.markdown("### Select Agent")
        agent_names = [a['name'] for a in agent_list]
        selected_idx = st.radio("", agent_names, label_visibility="collapsed")
        selected_agent_meta = agent_list[agent_names.index(selected_idx)]

    with col2:
        st.markdown(f"### {selected_agent_meta['name']}")
        st.caption(selected_agent_meta["description"])

        agent_id = selected_agent_meta["id"]
        default_tasks = AGENT_REGISTRY.get(agent_id, {}).get("default_tasks", [])

        # Task input
        if default_tasks:
            task_options = ["Custom task..."] + default_tasks
            task_select = st.selectbox("Quick task", task_options)
            if task_select == "Custom task...":
                task = st.text_area("Custom Task", placeholder="Describe exactly what you want the agent to do...", height=100)
            else:
                task = st.text_area("Task (editable)", value=task_select, height=100)
        else:
            task = st.text_area("Task", placeholder="Describe the task...", height=100)

        max_tokens = st.slider("Response length", 500, 4000, 2000, step=500)

        run_btn = st.button(f"Run {selected_agent_meta['name']}", type="primary", use_container_width=True)

        if run_btn:
            if not task.strip():
                st.error("Please enter a task.")
                return

            with st.spinner(f"Running {selected_agent_meta['name']}..."):
                try:
                    result_agent = run_agent(
                        agent_id=agent_id,
                        task=task,
                        research_data=research_data if research_data else None,
                        max_tokens=max_tokens,
                    )
                    if result_agent.get("success"):
                        # Store output
                        if "agent_outputs" not in st.session_state:
                            st.session_state.agent_outputs = {}
                        st.session_state.agent_outputs[agent_id] = {
                            "output": result_agent["output"],
                            "task": task,
                            "timestamp": datetime.now().strftime("%H:%M:%S"),
                        }
                        # Save to DB
                        if st.session_state.active_client_id:
                            DB["save_agent_run"](
                                agent_type=agent_id,
                                agent_name=selected_agent_meta["name"],
                                output=result_agent["output"],
                                input_data={"task": task},
                                client_id=st.session_state.active_client_id,
                            )
                        st.rerun()
                    else:
                        st.error(f"Agent failed: {result_agent.get('error')}")
                except Exception as e:
                    st.error(f"Error: {e}")

    # Output area
    agent_outputs = st.session_state.get("agent_outputs", {})
    if agent_id in agent_outputs:
        st.divider()
        out = agent_outputs[agent_id]
        st.markdown(f"### Output ({out['timestamp']})")
        st.markdown(f"**Task:** {out['task']}")
        st.markdown(out["output"])
        col1, col2 = st.columns(2)
        with col1:
            st.download_button(
                "Download Output",
                data=out["output"],
                file_name=f"{agent_id}_output.md",
                mime="text/markdown",
                use_container_width=True,
            )
        with col2:
            st.download_button(
                "Download Markdown",
                data=out["output"],
                file_name=f"{agent_id}_output.md",
                mime="text/markdown",
                use_container_width=True,
                key=f"dl2_{agent_id}",
            )
        st.divider()
        st.markdown("**Output Preview:**")
        st.markdown(out["output"])

    # All recent outputs
    if len(agent_outputs) > 1:
        st.divider()
        st.markdown("### All Agent Outputs This Session")
        for aid, out_data in agent_outputs.items():
            meta = AGENT_REGISTRY.get(aid, {})
            with st.expander(f"{meta.get('name', aid)}  ·  {out_data['timestamp']}"):
                st.caption(f"Task: {out_data['task']}")
                st.markdown(out_data["output"][:800] + "..." if len(out_data["output"]) > 800 else out_data["output"])

# =============================================================================
#  TAB 5 - WORKFLOWS
# =============================================================================
def tab_workflows():
    st.header("AI Workflow Engine")
    st.caption("Chain agents together into powerful multi-step marketing pipelines. Research feeds each agent automatically.")

    from workflow import WorkflowRunner, list_workflow_templates, WORKFLOW_TEMPLATES
    from agents import get_agent_list, AGENT_REGISTRY

    # Pull research context
    result = st.session_state.get("research_result")
    if not result and st.session_state.active_client_id:
        saved = DB["get_latest_research"](st.session_state.active_client_id)
        if saved:
            result = {"success": True, "research": saved["research_data"]}

    research_data = result.get("research", {}) if result else {}
    biz_name = research_data.get("business_name", "Client")

    wf_tab1, wf_tab2 = st.tabs(["Workflow Templates", "Custom Workflow Builder"])

    # ---- TEMPLATES ----
    with wf_tab1:
        st.markdown("### Workflow Templates")
        st.caption("One-click workflows that chain research, proposals, and agents together.")

        templates = list_workflow_templates()
        cols = st.columns(2)

        for i, tpl in enumerate(templates):
            with cols[i % 2]:
                st.markdown(f"""
<div style="border:1px solid #2d2d5e;border-radius:10px;padding:1rem 1.2rem;margin:0.4rem 0;">
  <div style="font-weight:700;font-size:0.95rem;margin-bottom:0.3rem;">{tpl['name']}</div>
  <div style="font-size:0.82rem;color:#64748b;margin-bottom:0.5rem;">{tpl['description']}</div>
  <div style="font-size:0.8rem;"><strong>Steps:</strong> {' › '.join(tpl['steps'])}</div>
  <div style="font-size:0.8rem;"><strong>Time:</strong> {tpl['estimated_time']} &nbsp;|&nbsp; <strong>Cost:</strong> {tpl['credits']}</div>
</div>""", unsafe_allow_html=True)
                tpl_url = st.text_input(
                    "URL",
                    value=st.session_state.get("last_url", ""),
                    key=f"tpl_url_{tpl['id']}",
                    placeholder="https://example.com",
                    label_visibility="collapsed",
                )
                col1, col2 = st.columns(2)
                with col1:
                    tpl_setup_fee = st.text_input("Setup Fee $", value="2,500", key=f"fee_{tpl['id']}")
                with col2:
                    tpl_retainer = st.text_input("Monthly $", value="1,500", key=f"ret_{tpl['id']}")
                if st.button(f"Run: {tpl['name']}", key=f"run_tpl_{tpl['id']}", type="primary", use_container_width=True):
                    if not tpl_url or not tpl_url.startswith("http"):
                        st.error("Enter a valid URL first.")
                    else:
                        _run_workflow_template(tpl, tpl_url, tpl_setup_fee, tpl_retainer)

    # ---- CUSTOM BUILDER ----
    with wf_tab2:
        st.markdown("### Custom Builder")
        st.caption("Select agents, define their tasks, and run them in sequence.")

        agent_list = get_agent_list()

        custom_url = st.text_input(
            "Website URL (leave blank to use existing research)",
            value=st.session_state.get("last_url", ""),
            placeholder="https://example.com",
        )

        run_research_first = st.checkbox("Run Research First", value=bool(not research_data))
        run_proposal = st.checkbox("Generate Proposal After Research", value=False)

        st.markdown("#### Select Agents")
        selected_agents = []
        for agent in agent_list:
            agent_id = agent["id"]
            checked = st.checkbox(
                agent['name'],
                key=f"wf_check_{agent_id}",
                help=agent["description"],
            )
            if checked:
                default_tasks = AGENT_REGISTRY.get(agent_id, {}).get("default_tasks", [])
                default_task = default_tasks[0] if default_tasks else f"Provide marketing recommendations for {biz_name}"
                task = st.text_area(
                    f"Task for {agent['name']}",
                    value=default_task,
                    key=f"wf_task_{agent_id}",
                    height=80,
                )
                selected_agents.append({"agent_id": agent_id, "task": task})

        if not selected_agents:
            st.info("Select at least one agent above to build your workflow.")
        else:
            st.markdown(f"**Workflow: {len(selected_agents)} agent(s) selected**")
            if run_research_first:
                st.caption(f"Pipeline: Research > {'Proposal > ' if run_proposal else ''}{' > '.join([a['agent_id'] for a in selected_agents])}")
            else:
                st.caption(f"Pipeline: {' > '.join([a['agent_id'] for a in selected_agents])}")

        col1, col2 = st.columns(2)
        with col1:
            custom_setup_fee = st.text_input("Setup Fee $", value="2,500", key="custom_fee")
        with col2:
            custom_retainer = st.text_input("Monthly $", value="1,500", key="custom_ret")

        if selected_agents and st.button("Run Custom Workflow", type="primary", use_container_width=True):
            url_to_use = custom_url if custom_url and custom_url.startswith("http") else None
            if run_research_first and not url_to_use:
                st.error("Please enter a URL to run research first.")
            else:
                _run_custom_workflow(
                    url=url_to_use,
                    agent_sequence=selected_agents,
                    run_research_first=run_research_first,
                    run_proposal=run_proposal,
                    setup_fee=custom_setup_fee,
                    monthly_retainer=custom_retainer,
                    existing_research=research_data if not run_research_first else None,
                )

    # ---- Display workflow results ----
    wf_results = st.session_state.get("workflow_results")
    if wf_results:
        _render_workflow_results(wf_results)


def _run_workflow_template(tpl, url, setup_fee, retainer):
    progress_box = st.empty()
    log_list = []

    def log(msg):
        log_list.append(msg)
        progress_box.info(f"Running: {msg}")

    with st.spinner(f"Running {tpl['name']}..."):
        try:
            from workflow import WorkflowRunner
            runner = WorkflowRunner(progress_callback=log)
            results = runner.run_full_pipeline(
                url=url,
                deep_crawl=False,
                run_proposal="proposal" in tpl.get("steps", []),
                agent_sequence=tpl.get("agent_sequence", []),
                setup_fee=setup_fee,
                monthly_retainer=retainer,
            )
            st.session_state.workflow_results = results
            if results.get("research", {}).get("success"):
                st.session_state.research_result = results["research"]
            if results.get("proposal", {}).get("success"):
                st.session_state.proposal_markdown = results["proposal"]["markdown"]
            progress_box.success(f"{tpl['name']} complete!")
            st.rerun()
        except Exception as e:
            progress_box.error(f"Error: {e}")


def _run_custom_workflow(url, agent_sequence, run_research_first, run_proposal,
                          setup_fee, monthly_retainer, existing_research):
    progress_box = st.empty()
    log_list = []

    def log(msg):
        log_list.append(msg)
        progress_box.info(f"Running: {msg}")

    with st.spinner("Running custom workflow..."):
        try:
            from workflow import WorkflowRunner
            runner = WorkflowRunner(progress_callback=log)

            if run_research_first and url:
                results = runner.run_full_pipeline(
                    url=url,
                    deep_crawl=False,
                    run_proposal=run_proposal,
                    agent_sequence=agent_sequence,
                    setup_fee=setup_fee,
                    monthly_retainer=monthly_retainer,
                )
            else:
                results = runner.run_agents_only(
                    agent_sequence=agent_sequence,
                    research_data=existing_research,
                )

            st.session_state.workflow_results = results
            if results.get("research", {}) and results["research"].get("success"):
                st.session_state.research_result = results["research"]
            if results.get("proposal", {}) and results["proposal"].get("success"):
                st.session_state.proposal_markdown = results["proposal"]["markdown"]

            progress_box.success("Workflow complete!")
            st.rerun()
        except Exception as e:
            progress_box.error(f"Error: {e}")


def _render_workflow_results(results: dict):
    st.divider()
    st.header("Workflow Results")

    status = results.get("status", "unknown")
    if status == "completed":
        st.success("Workflow completed successfully!")
    elif status == "partial":
        st.warning(f"Workflow completed with some issues. Errors: {results.get('errors', [])}")
    else:
        st.error(f"Workflow status: {status}")

    # Cost summary
    cost = results.get("cost_summary", {})
    if cost:
        c1, c2, c3 = st.columns(3)
        with c1:
            st.metric("Total Cost", f"${cost.get('total_cost_usd', 0)}")
        with c2:
            st.metric("Claude Tokens", cost.get("claude_input_tokens", 0) + cost.get("claude_output_tokens", 0))
        with c3:
            st.metric("Firecrawl Credits", cost.get("firecrawl_credits", 0))

    tabs_list = []
    if results.get("research"):
        tabs_list.append("Research")
    if results.get("proposal"):
        tabs_list.append("Proposal")
    agent_outputs = results.get("agent_outputs", [])
    if agent_outputs:
        tabs_list.append("Agent Outputs")

    if not tabs_list:
        st.info("No results to display yet.")
        return

    result_tabs = st.tabs(tabs_list)
    tab_idx = 0

    if results.get("research"):
        with result_tabs[tab_idx]:
            research = results["research"]
            if research.get("success"):
                st.success(f"Scraped {research.get('pages_crawled', 1)} page(s)")
                st.json(research.get("research", {}))
            else:
                st.error(research.get("error", "Research failed"))
        tab_idx += 1

    if results.get("proposal"):
        with result_tabs[tab_idx]:
            proposal = results["proposal"]
            if proposal.get("success"):
                st.markdown(proposal.get("markdown", ""))
                st.download_button(
                    "Download Proposal Markdown",
                    data=proposal.get("markdown", ""),
                    file_name="workflow_proposal.md",
                    mime="text/markdown",
                )
            else:
                st.error(proposal.get("error", "Proposal failed"))
        tab_idx += 1

    if agent_outputs:
        with result_tabs[tab_idx]:
            for out in agent_outputs:
                with st.expander(f"Step {out.get('step','')} - {out.get('agent_name', out.get('agent_id',''))}"):
                    st.caption(f"Task: {out.get('task','')}")
                    if out.get("success"):
                        st.markdown(out.get("output", ""))
                        st.download_button(
                            "Download",
                            data=out.get("output", ""),
                            file_name=f"agent_{out.get('agent_id','')}_output.md",
                            mime="text/markdown",
                            key=f"dl_wf_{out.get('step',0)}_{out.get('agent_id','')}",
                        )
                    else:
                        st.error(out.get("error", "Agent failed"))

# =============================================================================
#  MAIN ENTRY POINT
# =============================================================================
def main():
    apply_theme()
    render_sidebar()

    st.markdown('<h1 style="font-size:2rem;font-weight:800;margin-bottom:0"><span style="color:#1e293b">Snappy</span><span style="color:#7c3aed">marketer</span></h1>', unsafe_allow_html=True)
    st.caption("AI-Powered Marketing Platform | Research · Propose · Automate · Grow")
    st.divider()

    tab1, tab2, tab3, tab4, tab5 = st.tabs([
        "Dashboard",
        "Research",
        "Proposal",
        "Agents",
        "Workflows",
    ])

    with tab1:
        tab_dashboard()
    with tab2:
        tab_research()
    with tab3:
        tab_proposal()
    with tab4:
        tab_agents()
    with tab5:
        tab_workflows()


if __name__ == "__main__":
    main()
