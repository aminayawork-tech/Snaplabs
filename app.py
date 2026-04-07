"""
app.py - snappymarketer: AI Marketing Platform
Main Streamlit application: Dashboard | Research | Proposal | Agents | Workflows | Clients | Recordings
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
APP_CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
@import url('https://fonts.googleapis.com/icon?family=Material+Icons+Round');
* { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important; }
[data-testid="stAppViewContainer"] { background: #f8fafc; color: #1e293b; }
[data-testid="stSidebar"] { background: #ffffff; border-right: 1px solid #e2e8f0; }
h1 { color: #4f46e5 !important; font-size: 2rem !important; font-weight: 800 !important; letter-spacing: -0.5px !important; }
h2 { color: #4f46e5 !important; font-size: 1.5rem !important; font-weight: 700 !important; }
h3 { color: #4338ca !important; font-size: 1.15rem !important; font-weight: 600 !important; }
h4 { color: #6366f1 !important; font-size: 1rem !important; font-weight: 600 !important; }
p, li { color: #475569 !important; font-size: 0.9rem !important; line-height: 1.6 !important; }
label { color: #64748b !important; font-size: 0.82rem !important; font-weight: 500 !important; letter-spacing: 0.02em !important; }

/* ── Primary buttons (active nav + action buttons) ── */
.stButton > button[kind="primary"] {
    background: linear-gradient(135deg, #4f46e5, #7c3aed) !important;
    color: #ffffff !important; border: none !important; border-radius: 8px !important;
    font-weight: 600 !important; font-size: 0.8rem !important;
    letter-spacing: 0.01em !important; padding: 0.5rem 0.75rem !important;
    line-height: 1.3 !important; transition: all 0.2s !important;
    white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important;
}
.stButton > button[kind="primary"]:hover {
    background: linear-gradient(135deg, #6366f1, #8b5cf6) !important;
    box-shadow: 0 4px 15px rgba(99,102,241,0.3) !important;
}
.stButton > button[kind="primary"] p,
.stButton > button[kind="primary"] span { color: #ffffff !important; font-size: 0.8rem !important; font-weight: 600 !important; }

/* ── Secondary buttons (inactive nav) ── */
.stButton > button[kind="secondary"] {
    background: #ffffff !important; color: #64748b !important;
    border: 1.5px solid #e2e8f0 !important; border-radius: 8px !important;
    font-weight: 500 !important; font-size: 0.8rem !important;
    padding: 0.5rem 0.75rem !important; line-height: 1.3 !important;
    transition: all 0.2s !important; box-shadow: none !important;
    white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important;
}
.stButton > button[kind="secondary"]:hover {
    background: #f5f3ff !important; color: #4f46e5 !important;
    border-color: #a5b4fc !important;
}
.stButton > button[kind="secondary"] p,
.stButton > button[kind="secondary"] span { color: inherit !important; font-size: 0.8rem !important; font-weight: 500 !important; }

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
.stTabs [data-baseweb="tab"] {
    border-radius: 8px; font-weight: 500; font-size: 0.875rem; padding: 8px 18px;
    color: #1e293b !important;
}
.stTabs [data-baseweb="tab"] p,
.stTabs [data-baseweb="tab"] span,
.stTabs [data-baseweb="tab"] div { color: #1e293b !important; font-size: 0.875rem !important; }
.stTabs [data-baseweb="tab"]:hover { color: #4f46e5 !important; background: rgba(79,70,229,0.06) !important; }
.stTabs [data-baseweb="tab"]:hover p,
.stTabs [data-baseweb="tab"]:hover span { color: #4f46e5 !important; }
.stTabs [aria-selected="true"] {
    background: linear-gradient(135deg, #4f46e5, #7c3aed) !important;
    color: #ffffff !important; font-weight: 600 !important;
}
.stTabs [aria-selected="true"] p,
.stTabs [aria-selected="true"] span,
.stTabs [aria-selected="true"] div { color: #ffffff !important; font-weight: 600 !important; }
.metric-card {
    background: #ffffff;
    border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.4rem; margin: 0.5rem 0;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.metric-card h4 { margin-bottom: 0.5rem !important; }
.metric-card p { margin: 0.4rem 0 !important; }
.metric-card small { color: #94a3b8 !important; font-size: 0.78rem !important; }
.sidebar-logo {
    font-size: 1.4rem; font-weight: 800; letter-spacing: -0.5px;
    background: linear-gradient(135deg, #4f46e5, #7c3aed);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 0.1rem;
}
.sidebar-logo-icon {
    display:inline-flex; align-items:center; justify-content:center;
    width:34px; height:34px; border-radius:8px;
    background:linear-gradient(135deg,#4f46e5,#7c3aed);
    color:#fff; font-weight:800; font-size:1rem; flex-shrink:0;
}
.sidebar-brand-row { display:flex; align-items:center; gap:0.6rem; margin-bottom:0.1rem; }
.sidebar-tagline { font-size:0.68rem; color:#94a3b8; letter-spacing:0.05em; text-transform:uppercase; margin-bottom:0.75rem; padding-left:2px; }
.sidebar-section-label { font-size:0.65rem; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.09em; padding:0.5rem 0 0.2rem 0.2rem; margin-top:0.25rem; }
/* Sidebar nav buttons – left-aligned, no gradient */
[data-testid="stSidebar"] .stButton > button {
    justify-content: flex-start !important; text-align: left !important;
    padding: 0.45rem 0.75rem !important; font-size: 0.875rem !important;
    font-weight: 500 !important; border-radius: 8px !important;
    transition: all 0.15s !important; margin-bottom: 1px !important;
}
[data-testid="stSidebar"] .stButton > button[kind="secondary"] {
    background: transparent !important; color: #64748b !important;
    border: none !important; box-shadow: none !important;
}
[data-testid="stSidebar"] .stButton > button[kind="secondary"]:hover {
    background: #f1f5f9 !important; color: #4f46e5 !important; border: none !important;
}
[data-testid="stSidebar"] .stButton > button[kind="primary"] {
    background: #ede9fe !important; color: #4f46e5 !important;
    border: none !important; font-weight: 600 !important; box-shadow: none !important;
}
[data-testid="stSidebar"] .stButton > button p,
[data-testid="stSidebar"] .stButton > button span {
    color: inherit !important; font-size: inherit !important; font-weight: inherit !important;
}
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
/* hide "Made with Streamlit" footer */
footer { display: none !important; }
footer + div { display: none !important; }
[data-testid="stStatusWidget"] { display: none !important; }
/* ── Sidebar toggle buttons – always visible, icon text hidden ── */
[data-testid="stSidebarToggleButton"],
[data-testid="stSidebarCollapsedControl"],
[data-testid="stSidebarCollapsedControl"] button {
    opacity: 1 !important; visibility: visible !important;
    background: #f1f5f9 !important; border: 1.5px solid #e2e8f0 !important;
    border-radius: 50% !important; width: 32px !important; height: 32px !important;
    display: flex !important; align-items: center !important; justify-content: center !important;
    overflow: hidden !important; cursor: pointer !important;
}
[data-testid="stSidebarToggleButton"]:hover,
[data-testid="stSidebarCollapsedControl"] button:hover {
    background: #ede9fe !important; border-color: #a5b4fc !important;
}
/* Nuke ALL text/spans inside these buttons */
[data-testid="stSidebarToggleButton"] *,
[data-testid="stSidebarCollapsedControl"] * {
    font-size: 0 !important; line-height: 0 !important; color: transparent !important;
    width: 0 !important; height: 0 !important; overflow: hidden !important;
}
/* Inject clean arrow via ::after on the button itself */
[data-testid="stSidebarToggleButton"]::after {
    content: "‹" !important; font-size: 1.2rem !important; font-weight: 700 !important;
    color: #4f46e5 !important; line-height: 1 !important;
    width: auto !important; height: auto !important; display: block !important;
}
[data-testid="stSidebarCollapsedControl"] button::after {
    content: "›" !important; font-size: 1.2rem !important; font-weight: 700 !important;
    color: #4f46e5 !important; line-height: 1 !important;
    width: auto !important; height: auto !important; display: block !important;
}
/* Catch-all */
button[data-testid="stBaseButton-headerNoPadding"] span,
button[data-testid="stBaseButton-headerNoPadding"] p { font-size: 0 !important; color: transparent !important; }
</style>
"""

# ── Lazy imports (avoid crashing on missing optional packages) ──────────────
def _import_db():
    from database import (
        init_db, get_all_clients, get_client_by_id, create_client,
        delete_client, get_research_for_client, get_latest_research,
        save_research, save_proposal, get_proposals_for_client,
        save_agent_run, get_agent_runs_by_client, save_workflow_run,
    )
    return dict(
        init_db=init_db, get_all_clients=get_all_clients,
        get_client_by_id=get_client_by_id, create_client=create_client,
        delete_client=delete_client,
        get_research_for_client=get_research_for_client,
        get_latest_research=get_latest_research,
        save_research=save_research, save_proposal=save_proposal,
        get_proposals_for_client=get_proposals_for_client,
        save_agent_run=save_agent_run,
        get_agent_runs_by_client=get_agent_runs_by_client,
        save_workflow_run=save_workflow_run,
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
    "current_page": "Dashboard",
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
        # ── Brand header with icon ─────────────────────────────────────────
        st.markdown("""
<div class="sidebar-brand-row">
  <div class="sidebar-logo-icon">S</div>
  <div class="sidebar-logo">
    <span style="-webkit-text-fill-color:#1e293b;background:none;">Snappy</span><span>marketer</span>
  </div>
</div>
<div class="sidebar-tagline">AI Marketing Platform</div>""", unsafe_allow_html=True)

        cur = st.session_state.get("current_page", "Dashboard")

        # ── MAIN MENU ─────────────────────────────────────────────────────
        st.markdown('<div class="sidebar-section-label">Main Menu</div>', unsafe_allow_html=True)
        for page, icon in MAIN_PAGES.items():
            is_active = cur == page
            if st.button(f"{icon}  {page}", key=f"sidenav_{page}",
                         use_container_width=True,
                         type="primary" if is_active else "secondary"):
                st.session_state.current_page = page
                st.rerun()

        # ── WORKFLOWS ─────────────────────────────────────────────────────
        st.markdown('<div class="sidebar-section-label">Workflows</div>', unsafe_allow_html=True)
        for page, icon in WORKFLOW_PAGES.items():
            is_active = cur == page
            if st.button(f"{icon}  {page}", key=f"sidenav_{page}",
                         use_container_width=True,
                         type="primary" if is_active else "secondary"):
                st.session_state.current_page = page
                st.rerun()

        st.divider()

        # ── Active Client selector ─────────────────────────────────────────
        st.markdown('<div style="font-size:0.75rem;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:0.3rem;">Active Client</div>', unsafe_allow_html=True)
        clients = DB["get_all_clients"]()
        if clients:
            client_options = {c["name"]: c["id"] for c in clients}
            client_labels = ["— Select client —"] + list(client_options.keys())
            selected = st.selectbox("Client", client_labels, label_visibility="collapsed")
            if selected != "— Select client —":
                st.session_state.active_client_id = client_options[selected]
                st.session_state.active_client_name = selected
        else:
            st.caption("No clients yet. Add one in Research.")

        if st.session_state.active_client_id:
            st.success(f"{st.session_state.active_client_name}  ✓")
            _, col_del = st.columns([4, 1])
            with col_del:
                if st.button("✕", key="delete_client_btn", help="Remove this client"):
                    st.session_state["_confirm_delete"] = True
            if st.session_state.get("_confirm_delete"):
                st.warning(f"Delete **{st.session_state.active_client_name}**?")
                c1, c2 = st.columns(2)
                with c1:
                    if st.button("Delete", key="confirm_del", type="primary"):
                        try:
                            DB["delete_client"](st.session_state.active_client_id)
                        except Exception:
                            pass
                        st.session_state.active_client_id = None
                        st.session_state.active_client_name = ""
                        st.session_state.research_result = None
                        st.session_state.proposal_markdown = ""
                        st.session_state["_confirm_delete"] = False
                        st.rerun()
                with c2:
                    if st.button("Cancel", key="cancel_del"):
                        st.session_state["_confirm_delete"] = False
                        st.rerun()

        st.divider()
        st.caption("snappymarketer · Claude + Firecrawl")

# ═══════════════════════════════════════════════════════════════════════════
#  TAB 1 – DASHBOARD
# ═══════════════════════════════════════════════════════════════════════════
def tab_dashboard():
    st.header("Dashboard")
    st.caption("Your all-in-one AI marketing command centre.")

    clients = DB["get_all_clients"]()
    total_clients = len(clients)

    # ── KPI Row ────────────────────────────────────────────────────────────
    c1, c2, c3 = st.columns(3)
    with c1:
        st.metric("Total Clients", total_clients)
    with c2:
        st.metric("Agents Available", "8")
    with c3:
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
            st.session_state.current_page = "Research"
            st.rerun()
        if st.button("Generate Proposal", use_container_width=True):
            st.session_state.current_page = "Proposal"
            st.rerun()
        if st.button("Run Agent", use_container_width=True):
            st.session_state.current_page = "Agents"
            st.rerun()
        if st.button("Run Workflow", use_container_width=True):
            st.session_state.current_page = "Workflows"
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
            lines.append(f"**{phase.replace('_',' ').title()}**")
            lines.append(f"{desc}")
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
            try:
                import plotly.graph_objects as go
                bd = score["breakdown"]
                labels = [k.replace("_", " ").title() for k in bd.keys()]
                values = list(bd.values())
                total = sum(values) if sum(values) > 0 else 1
                palette = ["#4f46e5", "#7c3aed", "#a78bfa", "#6366f1", "#818cf8"]
                colors = palette[:len(values)]
                fig = go.Figure(go.Pie(
                    labels=labels,
                    values=values,
                    hole=0.58,
                    marker=dict(colors=colors, line=dict(color="#ffffff", width=3)),
                    textinfo="none",  # hide slice labels — use legend only to prevent cutoff
                    hovertemplate="<b>%{label}</b><br>Score: %{value}<br>%{percent}<extra></extra>",
                ))
                center_score = score.get("score", sum(values))
                max_score = score.get("max_score", 100)
                fig.update_layout(
                    paper_bgcolor="rgba(0,0,0,0)",
                    margin=dict(t=20, b=20, l=20, r=120), height=240,
                    showlegend=True,
                    legend=dict(
                        orientation="v", x=1.02, y=0.5,
                        font=dict(size=11, color="#475569"),
                        bgcolor="rgba(0,0,0,0)",
                    ),
                    annotations=[dict(
                        text=f"<b>{center_score}</b><br>/ {max_score}",
                        x=0.38, y=0.5, font=dict(size=20, color="#1e293b"),
                        showarrow=False, align="center",
                    )],
                )
                st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})
            except ImportError:
                import pandas as pd
                bd = score["breakdown"]
                st.bar_chart(pd.DataFrame([bd]).T)
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
<div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:1.1rem 1.3rem;margin:0.55rem 0;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
  <div style="font-weight:700;font-size:1rem;color:#1e293b;margin-bottom:0.8rem;">{name}</div>
  <div style="margin-bottom:0.55rem;">
    <div style="font-size:0.75rem;font-weight:700;color:#4f46e5;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.25rem;">Strengths</div>
    <div style="font-size:0.87rem;color:#475569;line-height:1.5;">{strengths}</div>
  </div>
  <div style="margin-bottom:0.55rem;">
    <div style="font-size:0.75rem;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.25rem;">Weaknesses</div>
    <div style="font-size:0.87rem;color:#475569;line-height:1.5;">{weaknesses}</div>
  </div>
  <div style="display:inline-block;background:#f1f5f9;border-radius:20px;padding:3px 12px;font-size:0.78rem;font-weight:600;color:#64748b;">
    Est. Traffic: {traffic}
  </div>
</div>""", unsafe_allow_html=True)
                else:
                    st.markdown(f"- {comp}")

    # ── QUICK WINS TAB ───────────────────────────────────────────────────────
    with t5:
        wins = data.get("quick_win_opportunities", [])
        if not wins:
            st.info("No quick wins found.")
        else:
            effort_map = {
                "low":    {"bg": "#f0fdf4", "border": "#86efac", "color": "#15803d"},
                "medium": {"bg": "#fffbeb", "border": "#fcd34d", "color": "#92400e"},
                "high":   {"bg": "#fef2f2", "border": "#fca5a5", "color": "#b91c1c"},
            }
            for i, win in enumerate(wins):
                if isinstance(win, dict):
                    effort = win.get("effort", "medium").lower()
                    tactic = win.get("tactic", "Tactic")
                    timeline = win.get("timeline", "N/A")
                    impact = win.get("expected_impact", "N/A")
                    es = effort_map.get(effort, effort_map["medium"])
                    card_col, btn_col = st.columns([5, 1])
                    with card_col:
                        st.markdown(f"""
<div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:1rem 1.2rem;margin:0.5rem 0;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
  <div style="display:flex;align-items:flex-start;gap:0.75rem;">
    <span style="background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;border-radius:50%;min-width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:0.78rem;margin-top:2px;flex-shrink:0;">{i+1}</span>
    <div style="flex:1;min-width:0;">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:0.75rem;flex-wrap:wrap;">
        <span style="font-weight:600;font-size:0.92rem;color:#1e293b;line-height:1.4;">{tactic}</span>
        <span style="background:{es['bg']};color:{es['color']};border:1.5px solid {es['border']};border-radius:20px;padding:3px 12px;font-size:0.72rem;font-weight:700;white-space:nowrap;flex-shrink:0;">{effort.upper()}</span>
      </div>
      <div style="display:flex;gap:2rem;margin-top:0.45rem;flex-wrap:wrap;">
        <span style="font-size:0.82rem;"><span style="font-weight:600;color:#4f46e5;">Timeline:</span> <span style="color:#64748b;">{timeline}</span></span>
        <span style="font-size:0.82rem;"><span style="font-weight:600;color:#4f46e5;">Impact:</span> <span style="color:#64748b;">{impact}</span></span>
      </div>
    </div>
  </div>
</div>""", unsafe_allow_html=True)
                    with btn_col:
                        st.markdown("<div style='margin-top:0.9rem;'></div>", unsafe_allow_html=True)
                        if st.button("Run Agent →", key=f"qw_agent_{i}", type="primary", use_container_width=True):
                            st.session_state.agent_prefill_task = f"{tactic}\n\nExpected Impact: {impact}\nTimeline: {timeline}"
                            st.session_state.agent_prefill_id = "content"
                            st.session_state.current_page = "Agents"
                            st.rerun()
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
            st.session_state.current_page = "Research"
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
                    max_tokens=2000,
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

    # ── Load saved agent runs from DB ─────────────────────────────────────────
    # Reload whenever the active client changes (track which client we loaded for).
    client_id = st.session_state.active_client_id
    loaded_for = st.session_state.get("_agent_outputs_loaded_for", -1)
    if client_id and client_id != loaded_for:
        saved_runs = DB["get_agent_runs_by_client"](client_id, limit=30)
        for run in saved_runs:
            aid = run["agent_type"]
            # Fresh in-session runs take priority over DB-loaded ones
            existing = st.session_state.agent_outputs.get(aid, {})
            if not existing or existing.get("saved"):
                st.session_state.agent_outputs[aid] = {
                    "output":    run["output"],
                    "task":      run["task"],
                    "timestamp": run["timestamp"],
                    "saved":     True,
                }
        st.session_state._agent_outputs_loaded_for = client_id

    research_data = result.get("research", {}) if result else {}
    biz_name = research_data.get("business_name", "")

    if research_data:
        st.info(f"Context loaded for: **{biz_name}** | All agents will use this research data.")
    else:
        st.warning("No client research loaded. Agents will run without client context. Run Research first for best results.")

    agent_list = get_agent_list()

    # ── Handle prefill from Quick Wins ────────────────────────────────────────
    # When Quick Wins sends a prefill, move it into a keyed session state entry
    # BEFORE rendering any widgets. Using pop() on every rerun would clear the
    # value on the button-click rerun, losing the task text.
    if "agent_prefill_task" in st.session_state:
        st.session_state["_agent_task_value"] = st.session_state.pop("agent_prefill_task")
        st.session_state["_agent_prefill_id"] = st.session_state.pop("agent_prefill_id", "content")
        st.session_state["_agent_auto_run"]   = True

    # ── Agent selector ─────────────────────────────────────────────────────────
    col1, col2 = st.columns([1, 2])
    with col1:
        st.markdown("### Select Agent")
        agent_names = [a['name'] for a in agent_list]
        default_agent_idx = 0
        pinned_id = st.session_state.get("_agent_prefill_id")
        if pinned_id:
            for idx, a in enumerate(agent_list):
                if a["id"] == pinned_id:
                    default_agent_idx = idx
                    break
        selected_idx = st.radio("", agent_names, index=default_agent_idx, label_visibility="collapsed")
        selected_agent_meta = agent_list[agent_names.index(selected_idx)]

    with col2:
        st.markdown(f"### {selected_agent_meta['name']}")
        st.caption(selected_agent_meta["description"])

        agent_id = selected_agent_meta["id"]
        default_tasks = AGENT_REGISTRY.get(agent_id, {}).get("default_tasks", [])

        # ── Task input ─────────────────────────────────────────────────────────
        # Keyed text_area: value lives in st.session_state["_agent_task_value"]
        # so it persists across all reruns (including the "Run Agent" click rerun).
        if "_agent_task_value" in st.session_state:
            task = st.text_area("Task (from Quick Win)", key="_agent_task_value", height=120)
        elif default_tasks:
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

        # Auto-run flag set when coming from Quick Wins
        auto_run = st.session_state.pop("_agent_auto_run", False)

        if run_btn or auto_run:
            if not task.strip():
                st.error("Please enter a task.")
                return

            # Clear prefill state so next manual visit to Agents is clean
            st.session_state.pop("_agent_task_value", None)
            st.session_state.pop("_agent_prefill_id", None)

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
                        st.session_state._scroll_to_output = True
                        st.rerun()
                    else:
                        st.error(f"Agent failed: {result_agent.get('error')}")
                except Exception as e:
                    st.error(f"Error: {e}")

    # ── Scroll to output after run ────────────────────────────────────────────
    if st.session_state.pop("_scroll_to_output", False):
        import streamlit.components.v1 as _c
        _c.html("""
<script>
setTimeout(function() {
    var el = window.parent.document.getElementById('agent-output-anchor');
    if (el) { el.scrollIntoView({behavior: 'smooth', block: 'start'}); }
}, 200);
</script>""", height=0)

    # ── Current agent output ──────────────────────────────────────────────────
    agent_outputs = st.session_state.get("agent_outputs", {})
    if agent_id in agent_outputs:
        st.markdown('<div id="agent-output-anchor"></div>', unsafe_allow_html=True)
        st.divider()
        out = agent_outputs[agent_id]
        saved_label = " · saved" if out.get("saved") else ""
        st.markdown(f"### Output ({out['timestamp']}{saved_label})")
        st.caption(f"Task: {out['task']}")
        st.markdown(out["output"])
        st.download_button(
            "Download Output",
            data=out["output"],
            file_name=f"{agent_id}_output.md",
            mime="text/markdown",
            use_container_width=True,
        )

    # ── Prior Agent Outputs ───────────────────────────────────────────────────
    st.divider()
    st.markdown("### Prior Agent Outputs")

    prior_runs = [(aid, od) for aid, od in agent_outputs.items() if aid != agent_id]

    if not prior_runs:
        st.caption("No other agent outputs yet for this client.")
    else:
        st.caption(f"{len(prior_runs)} saved run(s) — click to expand.")
        for aid, out_data in prior_runs:
            meta = AGENT_REGISTRY.get(aid, {})
            label = f"{meta.get('name', aid)}  ·  {out_data['timestamp']}"
            with st.expander(label):
                st.caption(f"Task: {out_data['task']}")
                st.markdown(out_data["output"])
                st.download_button(
                    "Download",
                    data=out_data["output"],
                    file_name=f"{aid}_output.md",
                    mime="text/markdown",
                    key=f"dl_prior_{aid}",
                )


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

    wf_tab1, wf_tab2, wf_tab3 = st.tabs(["Workflow Templates", "Custom Workflow Builder", "Integrations"])

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

    # ---- INTEGRATIONS ----
    with wf_tab3:
        st.markdown("### Platform Integrations")
        st.caption("Connect external platforms so agents can push changes and sync data automatically.")

        # GitHub Integration
        st.markdown("#### GitHub")
        st.markdown("""
<div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:1.2rem 1.4rem;margin:0.5rem 0;">
  <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem;">
    <span style="font-size:1.5rem;">&#9654;</span>
    <span style="font-weight:700;font-size:1rem;color:#1e293b;">GitHub</span>
    <span style="background:#fef2f2;color:#b91c1c;border:1px solid #fca5a5;border-radius:20px;padding:2px 10px;font-size:0.72rem;font-weight:700;">Not Connected</span>
  </div>
  <p style="color:#64748b;font-size:0.85rem;margin:0;">Connect your GitHub repository to let agents push website copy, blog posts, and code improvements directly to your repo — just like Claude Code does.</p>
</div>""", unsafe_allow_html=True)
        gh_col1, gh_col2 = st.columns(2)
        with gh_col1:
            gh_repo = st.text_input("Repository (owner/repo)", value=st.session_state.get("gh_repo", ""), placeholder="yourname/your-website", key="gh_repo_input")
        with gh_col2:
            gh_token = st.text_input("GitHub Personal Access Token", value=st.session_state.get("gh_token", ""), type="password", placeholder="ghp_...", key="gh_token_input")
        gh_branch = st.text_input("Branch", value=st.session_state.get("gh_branch", "main"), key="gh_branch_input")
        if st.button("Save GitHub Connection", type="primary", key="gh_save"):
            if gh_repo and gh_token:
                st.session_state.gh_repo   = gh_repo
                st.session_state.gh_token  = gh_token
                st.session_state.gh_branch = gh_branch
                st.success(f"GitHub connected: {gh_repo} (branch: {gh_branch})")
            else:
                st.error("Please enter both a repository and a personal access token.")

        st.markdown("---")

        # Slack Integration
        st.markdown("#### Slack")
        st.markdown("""
<div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:1.2rem 1.4rem;margin:0.5rem 0;">
  <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem;">
    <span style="font-size:1.5rem;">&#128172;</span>
    <span style="font-weight:700;font-size:1rem;color:#1e293b;">Slack</span>
    <span style="background:#fef2f2;color:#b91c1c;border:1px solid #fca5a5;border-radius:20px;padding:2px 10px;font-size:0.72rem;font-weight:700;">Not Connected</span>
  </div>
  <p style="color:#64748b;font-size:0.85rem;margin:0;">Send agent reports, workflow completions, and audit results directly to a Slack channel.</p>
</div>""", unsafe_allow_html=True)
        slack_webhook = st.text_input("Slack Webhook URL", value=st.session_state.get("slack_webhook", ""), type="password", placeholder="https://hooks.slack.com/services/...", key="slack_webhook_input")
        slack_channel = st.text_input("Channel name", value=st.session_state.get("slack_channel", "#marketing"), key="slack_channel_input")
        if st.button("Save Slack Connection", type="primary", key="slack_save"):
            if slack_webhook:
                st.session_state.slack_webhook = slack_webhook
                st.session_state.slack_channel = slack_channel
                st.success(f"Slack connected to {slack_channel}")
            else:
                st.error("Please enter a Slack webhook URL.")

        st.markdown("---")

        # Email Integration
        st.markdown("#### Email")
        st.markdown("""
<div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:1.2rem 1.4rem;margin:0.5rem 0;">
  <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem;">
    <span style="font-size:1.5rem;">&#9993;</span>
    <span style="font-weight:700;font-size:1rem;color:#1e293b;">Email (SMTP)</span>
    <span style="background:#fef2f2;color:#b91c1c;border:1px solid #fca5a5;border-radius:20px;padding:2px 10px;font-size:0.72rem;font-weight:700;">Not Connected</span>
  </div>
  <p style="color:#64748b;font-size:0.85rem;margin:0;">Send agent reports and proposals directly to clients via email. Works with Gmail, Outlook, or any SMTP provider.</p>
</div>""", unsafe_allow_html=True)
        em_col1, em_col2 = st.columns(2)
        with em_col1:
            smtp_host = st.text_input("SMTP Host", value=st.session_state.get("smtp_host", ""), placeholder="smtp.gmail.com", key="smtp_host_input")
            smtp_user = st.text_input("Email Address", value=st.session_state.get("smtp_user", ""), placeholder="you@gmail.com", key="smtp_user_input")
        with em_col2:
            smtp_port = st.text_input("Port", value=st.session_state.get("smtp_port", "587"), key="smtp_port_input")
            smtp_pass = st.text_input("Password / App Password", value=st.session_state.get("smtp_pass", ""), type="password", placeholder="Gmail app password", key="smtp_pass_input")
        smtp_from = st.text_input("From Name", value=st.session_state.get("smtp_from", ""), placeholder="SnapLabs Marketing", key="smtp_from_input")
        if st.button("Save Email Connection", type="primary", key="smtp_save"):
            if smtp_host and smtp_user and smtp_pass:
                st.session_state.smtp_host = smtp_host
                st.session_state.smtp_port = smtp_port
                st.session_state.smtp_user = smtp_user
                st.session_state.smtp_pass = smtp_pass
                st.session_state.smtp_from = smtp_from
                st.success(f"Email connected: {smtp_user} via {smtp_host}:{smtp_port}")
            else:
                st.error("Please fill in Host, Email, and Password.")

        st.markdown("---")

        # Google Search Console (info only)
        st.markdown("#### More Integrations (Coming Soon)")
        st.markdown("""
<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-top:0.5rem;">
  <div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:10px;padding:1rem;text-align:center;color:#94a3b8;font-size:0.85rem;">Google Search Console</div>
  <div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:10px;padding:1rem;text-align:center;color:#94a3b8;font-size:0.85rem;">Meta Ads Manager</div>
  <div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:10px;padding:1rem;text-align:center;color:#94a3b8;font-size:0.85rem;">Google Ads</div>
  <div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:10px;padding:1rem;text-align:center;color:#94a3b8;font-size:0.85rem;">Mailchimp / ActiveCampaign</div>
</div>""", unsafe_allow_html=True)

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
MAIN_PAGES = {
    "Dashboard": "⊞",
    "Research":  "◎",
    "Clients":   "◉",
}
WORKFLOW_PAGES = {
    "Proposal":   "◻",
    "Agents":     "◈",
    "Workflows":  "⟳",
}
PAGES = {**MAIN_PAGES, **WORKFLOW_PAGES}  # for any code still referencing PAGES


# ─────────────────────────────────────────────────────────────────────────────
#  CLIENTS PAGE
# ─────────────────────────────────────────────────────────────────────────────
def tab_clients():
    st.header("Clients")
    st.caption("Manage all your clients and their research history.")

    clients = DB["get_all_clients"]()

    if not clients:
        st.info("No clients yet. Run a Research Audit to add your first client.")
        if st.button("Go to Research", type="primary"):
            st.session_state.current_page = "Research"
            st.rerun()
        return

    for c in clients:
        with st.container():
            col1, col2, col3 = st.columns([3, 2, 1])
            with col1:
                st.markdown(f"**{c['name']}**")
                st.caption(c.get("website_url", ""))
            with col2:
                st.caption(f"Industry: {c.get('industry','—')}")
                st.caption(f"Added: {str(c.get('created_at',''))[:10]}")
            with col3:
                if st.button("Select", key=f"sel_{c['id']}"):
                    st.session_state.active_client_id = c["id"]
                    st.session_state.active_client_name = c["name"]
                    st.session_state.current_page = "Research"
                    st.rerun()
            st.divider()


# ─────────────────────────────────────────────────────────────────────────────
#  RECORDINGS PAGE
# ─────────────────────────────────────────────────────────────────────────────
def tab_recordings():
    st.header("Recordings")
    st.caption("Upload audit screen recordings to share with clients.")

    st.info("Upload a screen recording of a client's audit results to share with them.")

    uploaded = st.file_uploader(
        "Upload recording (MP4, WebM, MOV)",
        type=["mp4", "webm", "mov"],
        key="rec_upload",
    )
    if uploaded:
        st.video(uploaded)
        st.download_button(
            "Download to share",
            data=uploaded.getvalue(),
            file_name=uploaded.name,
            mime=uploaded.type,
            type="primary",
        )

    st.divider()
    st.markdown("### How to record an audit for your client")
    st.markdown("""
**On Mac / Windows:**
1. Open the client's audit results in snappymarketer
2. Press `Cmd+Shift+5` (Mac) or use the Xbox Game Bar `Win+G` (Windows)
3. Select **Record screen** and enable **Microphone**
4. Walk through the audit results, explain the findings
5. Stop recording, upload the file above

**Enable audio in Chrome screen recording:**
- When the recording prompt appears, look for the microphone icon in the toolbar
- Click it to toggle audio on before starting
- Make sure Chrome has microphone permission: `chrome://settings/content/microphone`

**Share with client:** Download the file above and attach it to an email, or upload to Google Drive / Loom and share the link.
""")


def main():
    st.markdown(APP_CSS, unsafe_allow_html=True)

    if st.session_state.get("_nav"):
        st.session_state.current_page = st.session_state.pop("_nav")

    render_sidebar()
    cur = st.session_state.current_page

    if cur == "Dashboard":
        tab_dashboard()
    elif cur == "Research":
        tab_research()
    elif cur == "Clients":
        tab_clients()
    elif cur == "Proposal":
        tab_proposal()
    elif cur == "Agents":
        tab_agents()
    elif cur == "Workflows":
        tab_workflows()


if __name__ == "__main__":
    main()
