"""
app.py - snappymarketer: AI Marketing Platform
Mobile-first redesign: Home → Audit → Results + Chat + Agents → Saved Audits
"""

import os
import json
import time
from datetime import datetime
from typing import Optional, Dict, Any, List

import streamlit as st
from dotenv import load_dotenv

load_dotenv()

st.set_page_config(
    page_title="snappymarketer",
    page_icon="S",
    layout="centered",
    initial_sidebar_state="collapsed",
)

APP_CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
* { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important; }

/* ── Hide Streamlit sidebar + toggle completely ── */
[data-testid="stSidebar"],
[data-testid="stSidebarToggleButton"],
[data-testid="stSidebarCollapsedControl"],
button[data-testid="stBaseButton-headerNoPadding"] { display: none !important; }

/* ══════════════════════════════════════════════════
   DESKTOP: fixed left sidebar nav (≥769px)
══════════════════════════════════════════════════ */
@media (min-width: 769px) {
  .nav-bottom { display: none !important; }
  .nav-sidebar {
    position: fixed; left: 0; top: 0; width: 220px; height: 100vh;
    background: #ffffff; border-right: 1px solid #e2e8f0;
    z-index: 9999; padding: 1.4rem 0.85rem 1.4rem;
    display: flex; flex-direction: column; overflow-y: auto;
    box-shadow: 1px 0 0 #e2e8f0;
  }
  /* Push main content right of the sidebar */
  .block-container {
    margin-left: 230px !important;
    max-width: 720px !important;
    padding-top: 1.5rem !important;
  }
}

/* ══════════════════════════════════════════════════
   MOBILE: fixed bottom tab bar (≤768px)
══════════════════════════════════════════════════ */
@media (max-width: 768px) {
  .nav-sidebar { display: none !important; }
  .nav-bottom {
    position: fixed; bottom: 0; left: 0; right: 0;
    height: 62px; background: #ffffff;
    border-top: 1.5px solid #e2e8f0; z-index: 9999;
    display: flex !important; align-items: stretch;
    box-shadow: 0 -2px 12px rgba(0,0,0,0.07);
  }
  .block-container { padding-bottom: 74px !important; max-width: 100% !important; }
}

/* ── Nav shared ── */
.nav-sidebar a, .nav-bottom a { text-decoration: none !important; color: inherit !important; }

/* ── Sidebar brand ── */
.nav-brand-row {
  display: flex; align-items: center; gap: 0.55rem; margin-bottom: 0.2rem;
}
.nav-brand-icon {
  width: 33px; height: 33px; border-radius: 9px;
  background: linear-gradient(135deg,#4f46e5,#7c3aed);
  color: #fff; font-weight: 800; font-size: 1rem;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.nav-brand-name { font-weight: 800; font-size: 1.05rem; color: #1e293b; line-height: 1.2; }
.nav-brand-name span { color: #4f46e5; }
.nav-tagline {
  font-size: 0.63rem; color: #94a3b8; text-transform: uppercase;
  letter-spacing: 0.09em; margin-bottom: 1.25rem; padding-left: 2px;
}
.nav-divider { height: 1px; background: #f1f5f9; margin: 0.5rem 0 0.75rem; }

/* ── Sidebar nav items ── */
.nav-item {
  display: flex; align-items: center; gap: 0.65rem;
  padding: 0.55rem 0.75rem; border-radius: 9px; margin-bottom: 2px;
  font-size: 0.875rem; font-weight: 500; color: #64748b;
  transition: background 0.13s, color 0.13s; cursor: pointer;
}
.nav-item:hover { background: #f1f5f9 !important; color: #4f46e5 !important; }
.nav-item-active { background: #ede9fe !important; color: #4f46e5 !important; font-weight: 700 !important; }
.nav-item-icon {
  width: 20px; height: 20px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.nav-item-icon svg { width: 18px; height: 18px; stroke: currentColor; }
.nav-footer {
  margin-top: auto; padding-top: 1rem;
  font-size: 0.68rem; color: #cbd5e1; line-height: 1.6;
}

/* ── Bottom tab items ── */
.nav-tab {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 3px;
  font-size: 0.68rem; font-weight: 500; color: #94a3b8;
  transition: color 0.13s; padding: 6px 4px 8px; cursor: pointer;
}
.nav-tab:hover { color: #4f46e5; }
.nav-tab-active { color: #4f46e5 !important; font-weight: 700 !important; }
.nav-tab-icon {
  width: 22px; height: 22px;
  display: flex; align-items: center; justify-content: center;
}
.nav-tab-icon svg { width: 22px; height: 22px; stroke: currentColor; }
.nav-tab-label { font-size: 0.65rem; }

/* ── App background ── */
[data-testid="stAppViewContainer"] { background: #f8fafc !important; }
[data-testid="stHeader"] { background: transparent !important; box-shadow: none !important; }

/* ── Max width / centered ── */
.main .block-container {
    max-width: 740px !important;
    padding: 1rem 1.25rem 4rem !important;
}

/* ── Typography ── */
h1 { color: #4f46e5 !important; font-size: 1.7rem !important; font-weight: 800 !important; letter-spacing: -0.5px !important; }
h2 { color: #1e293b !important; font-size: 1.25rem !important; font-weight: 700 !important; margin-top: 0 !important; }
h3 { color: #1e293b !important; font-size: 1.05rem !important; font-weight: 600 !important; margin-top: 0 !important; }
p, li { color: #475569 !important; font-size: 0.9rem !important; line-height: 1.65 !important; }
label { color: #64748b !important; font-size: 0.82rem !important; font-weight: 500 !important; }
h1 a, h2 a, h3 a, h4 a { display: none !important; }

/* ── Buttons ── */
.stButton > button {
    border-radius: 10px !important;
    font-weight: 600 !important;
    font-size: 0.875rem !important;
    min-height: 44px !important;
    transition: all 0.15s ease !important;
    cursor: pointer !important;
}
/* Primary buttons — use data-testid since Streamlit doesn't expose kind as attr */
button[data-testid="stBaseButton-primary"],
[data-testid="stFormSubmitButton"] button {
    background: linear-gradient(135deg, #4f46e5, #7c3aed) !important;
    color: #ffffff !important;
    border: none !important;
    box-shadow: 0 2px 8px rgba(79,70,229,0.25) !important;
}
button[data-testid="stBaseButton-primary"]:hover,
[data-testid="stFormSubmitButton"] button:hover {
    box-shadow: 0 4px 16px rgba(79,70,229,0.4) !important;
    transform: translateY(-1px) !important;
}
button[data-testid="stBaseButton-primary"] *,
[data-testid="stFormSubmitButton"] button * { color: #ffffff !important; }
/* Secondary buttons */
button[data-testid="stBaseButton-secondary"] {
    background: #ffffff !important;
    color: #475569 !important;
    border: 1.5px solid #e2e8f0 !important;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05) !important;
}
button[data-testid="stBaseButton-secondary"]:hover {
    background: #f5f3ff !important;
    color: #4f46e5 !important;
    border-color: #a5b4fc !important;
}
/* Fallback for older Streamlit attribute selectors */
.stButton > button[kind="primary"] {
    background: linear-gradient(135deg, #4f46e5, #7c3aed) !important;
    color: #ffffff !important; border: none !important;
}
.stButton > button[kind="secondary"] {
    background: #ffffff !important; color: #475569 !important;
    border: 1.5px solid #e2e8f0 !important;
}
.stButton > button[kind="primary"]:hover {
    box-shadow: 0 4px 16px rgba(79,70,229,0.4) !important;
    transform: translateY(-1px) !important;
}
.stButton > button[kind="secondary"] {
    background: #ffffff !important;
    color: #475569 !important;
    border: 1.5px solid #e2e8f0 !important;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05) !important;
}
.stButton > button[kind="secondary"]:hover {
    background: #f5f3ff !important;
    color: #4f46e5 !important;
    border-color: #a5b4fc !important;
}
.stButton > button p,
.stButton > button span,
.stButton > button div { color: inherit !important; font-weight: inherit !important; font-size: inherit !important; }

/* ── Inputs ── */
.stTextInput > div > div > input {
    background: #ffffff !important;
    color: #1e293b !important;
    border: 1.5px solid #e2e8f0 !important;
    border-radius: 10px !important;
    font-size: 0.9rem !important;
    min-height: 44px !important;
    padding: 0.5rem 0.75rem !important;
}
.stTextInput > div > div > input:focus {
    border-color: #a5b4fc !important;
    box-shadow: 0 0 0 3px rgba(165,180,252,0.25) !important;
}
.stTextArea > div > div > textarea {
    background: #ffffff !important;
    color: #1e293b !important;
    border: 1.5px solid #e2e8f0 !important;
    border-radius: 10px !important;
    font-size: 0.9rem !important;
}

/* ── Metrics ── */
[data-testid="stMetric"] {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 0.85rem 1rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
[data-testid="stMetricValue"] { color: #4f46e5 !important; font-weight: 700 !important; font-size: 1.4rem !important; }
[data-testid="stMetricLabel"] { color: #94a3b8 !important; font-size: 0.72rem !important; font-weight: 600 !important; text-transform: uppercase !important; letter-spacing: 0.06em !important; }
[data-testid="stMetricDelta"] { font-size: 0.75rem !important; }

/* ── Expanders ── */
.streamlit-expanderHeader {
    background: #ffffff !important;
    border: 1.5px solid #e2e8f0 !important;
    border-radius: 10px !important;
    font-weight: 600 !important;
    color: #1e293b !important;
    font-size: 0.9rem !important;
    padding: 0.7rem 1rem !important;
}
.streamlit-expanderHeader:hover { border-color: #a5b4fc !important; background: #faf5ff !important; }
[data-testid="stExpander"] details[open] summary {
    border-bottom-left-radius: 0 !important;
    border-bottom-right-radius: 0 !important;
}
[data-testid="stExpanderDetails"] {
    border: 1.5px solid #e2e8f0 !important;
    border-top: none !important;
    border-radius: 0 0 10px 10px !important;
    padding: 1rem !important;
}

/* ── Select box ── */
div[data-testid="stSelectbox"] > div > div {
    background: #ffffff !important;
    border-radius: 10px !important;
    border: 1.5px solid #e2e8f0 !important;
}

/* ── Progress bar ── */
.stProgress > div > div { background: linear-gradient(90deg, #4f46e5, #7c3aed) !important; }

/* ── Chat messages ── */
[data-testid="stChatMessage"] { border-radius: 12px !important; margin-bottom: 0.5rem !important; }
[data-testid="stChatInput"] > div {
    border-radius: 12px !important;
    border: 1.5px solid #e2e8f0 !important;
    background: #ffffff !important;
}
[data-testid="stChatInput"] > div:focus-within { border-color: #a5b4fc !important; }

/* ── Divider ── */
hr { border-color: #e2e8f0 !important; margin: 1.25rem 0 !important; }

/* ── Caption ── */
.stCaption, [data-testid="stCaptionContainer"] { color: #94a3b8 !important; font-size: 0.8rem !important; }

/* ── Alert/info boxes ── */
[data-testid="stAlert"] { border-radius: 10px !important; }

/* ── Form ── */
[data-testid="stForm"] {
    background: #ffffff;
    border: 1.5px solid #e2e8f0;
    border-radius: 14px;
    padding: 1.25rem !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

/* ── Scrollbar ── */
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: #f1f5f9; }
::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }

/* ── Custom section headers (replaces st.expander entirely) ── */
.sec-hdr { margin-bottom: 0 !important; }
.sec-hdr > div > button[data-testid="stBaseButton-secondary"] {
    background: #ffffff !important;
    border: 1.5px solid #e2e8f0 !important;
    border-radius: 10px !important;
    color: #1e293b !important;
    font-weight: 600 !important;
    font-size: 0.875rem !important;
    text-align: left !important;
    justify-content: flex-start !important;
    padding: 0.65rem 1rem !important;
    min-height: 46px !important;
    width: 100% !important;
    box-shadow: none !important;
}
.sec-hdr > div > button[data-testid="stBaseButton-secondary"]:hover {
    background: #faf5ff !important;
    border-color: #a5b4fc !important;
    color: #4f46e5 !important;
    transform: none !important;
}
.sec-body {
    border: 1.5px solid #e2e8f0 !important;
    border-top: none !important;
    border-radius: 0 0 10px 10px !important;
    padding: 1rem !important;
    margin-bottom: 0.6rem !important;
    background: #ffffff !important;
}
/* When section is open, square the bottom of the header button */
.sec-hdr-open > div > button[data-testid="stBaseButton-secondary"] {
    border-radius: 10px 10px 0 0 !important;
    border-color: #a5b4fc !important;
    color: #4f46e5 !important;
}

/* ── Chat input: align with content area on desktop ── */
@media (min-width: 769px) {
  [data-testid="stBottom"],
  .stChatFloatingInputContainer { padding-left: 230px !important; }
}

/* ── Hide Streamlit footer ── */
footer, [data-testid="stStatusWidget"] { display: none !important; }
</style>
"""

# ── DB lazy loading ──────────────────────────────────────────────────────────
def _import_db():
    from database import (
        init_db, get_all_clients, get_client_by_id, create_client,
        delete_client, get_research_for_client, get_latest_research,
        save_research, save_agent_run, get_agent_runs_by_client, get_all_agent_runs,
    )
    return dict(
        init_db=init_db,
        get_all_clients=get_all_clients,
        get_client_by_id=get_client_by_id,
        create_client=create_client,
        delete_client=delete_client,
        get_research_for_client=get_research_for_client,
        get_latest_research=get_latest_research,
        save_research=save_research,
        save_agent_run=save_agent_run,
        get_agent_runs_by_client=get_agent_runs_by_client,
        get_all_agent_runs=get_all_agent_runs,
    )

@st.cache_resource
def get_db_fns():
    fns = _import_db()
    fns["init_db"]()
    return fns

DB = get_db_fns()

# ── Session state defaults ───────────────────────────────────────────────────
DEFAULTS: Dict[str, Any] = {
    "view": "home",
    "active_client_id": None,
    "active_client_name": "",
    "research_result": None,
    "last_url": "",
    "chat_messages": [],
    "agent_outputs": {},
    "_agent_outputs_loaded_for": -1,
    "_pending_audit": {},
    "_form_biz_name": "",
}
for _k, _v in DEFAULTS.items():
    if _k not in st.session_state:
        st.session_state[_k] = _v

# ── Agent config ─────────────────────────────────────────────────────────────
_SVG_PENCIL  = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>'
_SVG_SEARCH  = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'
_SVG_MEGAPHONE = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>'
_SVG_SHARE   = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>'
_SVG_MAIL    = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>'
_SVG_TARGET  = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>'
_SVG_STAR    = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'

AGENT_META = {
    "content_engine":  {"label": "Content",     "svg": _SVG_PENCIL},
    "seo":             {"label": "SEO",          "svg": _SVG_SEARCH},
    "paid_ads":        {"label": "Paid Ads",     "svg": _SVG_MEGAPHONE},
    "social_media":    {"label": "Social Media", "svg": _SVG_SHARE},
    "email_sms":       {"label": "Email / SMS",  "svg": _SVG_MAIL},
    "lead_gen":        {"label": "Lead Gen",     "svg": _SVG_TARGET},
    "review_referral": {"label": "Reviews",      "svg": _SVG_STAR},
}

def _agent_task(aid: str, biz_name: str) -> str:
    tasks = {
        "content_engine":  f"Create a comprehensive content strategy for {biz_name}: 3 blog post outlines targeting the top SEO keywords, a 30-day content calendar, and key messaging for each audience segment.",
        "seo":             f"Provide a complete SEO improvement plan for {biz_name}: fix critical technical issues, target the top 10 keywords, and outline a 90-day backlink strategy based on the competitor analysis.",
        "paid_ads":        f"Design a Google Ads + Meta Ads campaign for {biz_name}: campaign structure, ad groups, 5 headline variants, ad copy for each service, and recommended monthly budget allocation.",
        "social_media":    f"Create a 30-day social media content calendar for {biz_name}: posts for LinkedIn, Instagram and Facebook using the brand story, services, and audience insights.",
        "email_sms":       f"Write a 5-email welcome + nurture sequence for {biz_name} new leads: subject lines, preview text, body copy, and a clear CTA for each email.",
        "lead_gen":        f"Design a lead generation funnel for {biz_name}: landing page headline + copy, lead magnet idea, form fields, and a follow-up sequence outline.",
        "review_referral": f"Build a review acquisition and referral program for {biz_name}: outreach templates for past clients, a referral incentive structure, and a review request script.",
    }
    return tasks.get(aid, f"Run marketing analysis for {biz_name}.")


# ════════════════════════════════════════════════════════════════════════════
#  NAV  (desktop left sidebar + mobile bottom tab bar)
# ════════════════════════════════════════════════════════════════════════════
_SVG_HOME = (
    '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    '<path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z"/>'
    '<path d="M9 21V12h6v9"/>'
    '</svg>'
)
_SVG_AUDIT = (
    '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    '<line x1="18" y1="20" x2="18" y2="10"/>'
    '<line x1="12" y1="20" x2="12" y2="4"/>'
    '<line x1="6" y1="20" x2="6" y2="14"/>'
    '</svg>'
)
_SVG_SAVED = (
    '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>'
    '</svg>'
)


def render_nav(current_view: str):
    client_id = st.session_state.active_client_id
    audit_href = f"?nav=results&client={client_id}" if client_id else "?nav=home"

    def _si(svg, label, href, view_key):
        active = "nav-item-active" if current_view == view_key else ""
        return (
            f'<a href="{href}" target="_self" class="nav-item {active}">'
            f'<span class="nav-item-icon">{svg}</span>{label}</a>'
        )

    def _tab(svg, label, href, view_key):
        active = "nav-tab-active" if current_view == view_key else ""
        return (
            f'<a href="{href}" target="_self" class="nav-tab {active}">'
            f'<span class="nav-tab-icon">{svg}</span>'
            f'<span class="nav-tab-label">{label}</span></a>'
        )

    sidebar_items = (
        _si(_SVG_HOME,  "Home",  "?nav=home",  "home")
        + _si(_SVG_AUDIT, "Audit",  audit_href,   "results")
        + _si(_SVG_SAVED, "Saved",  "?nav=saved", "saved")
    )
    bottom_tabs = (
        _tab(_SVG_HOME,  "Home",  "?nav=home",  "home")
        + _tab(_SVG_AUDIT, "Audit",  audit_href,   "results")
        + _tab(_SVG_SAVED, "Saved",  "?nav=saved", "saved")
    )

    st.markdown(f"""
<!-- Desktop left sidebar -->
<div class="nav-sidebar">
  <div class="nav-brand-row">
    <div class="nav-brand-icon">S</div>
    <div class="nav-brand-name">Snappy<span>marketer</span></div>
  </div>
  <div class="nav-tagline">AI Marketing Platform</div>
  <div class="nav-divider"></div>
  {sidebar_items}
  <div class="nav-footer">snappymarketer<br>Powered by Claude + Firecrawl</div>
</div>

<!-- Mobile bottom tab bar -->
<div class="nav-bottom">{bottom_tabs}</div>
""", unsafe_allow_html=True)


# ════════════════════════════════════════════════════════════════════════════
#  SILENT CLIENT LOADER  (used when arriving via URL query param)
# ════════════════════════════════════════════════════════════════════════════
def _load_client_silent(client_id: int):
    """Load client research from DB into session state without calling st.rerun()."""
    clients = DB["get_all_clients"]()
    client = next((c for c in clients if c["id"] == client_id), None)
    if not client:
        return
    saved = DB["get_latest_research"](client_id)
    if saved:
        st.session_state.research_result = {
            "success": True,
            "research": saved["research_data"],
            "scraped_markdown": saved.get("scraped_markdown", ""),
            "pages_crawled": saved.get("pages_crawled", 1),
        }
        st.session_state.active_client_id = client_id
        st.session_state.active_client_name = client["name"]
        st.session_state.agent_outputs = {}
        st.session_state._agent_outputs_loaded_for = -1


# ════════════════════════════════════════════════════════════════════════════
#  VIEW: HOME
# ════════════════════════════════════════════════════════════════════════════
# ════════════════════════════════════════════════════════════════════════════
#  CUSTOM SECTION (replaces st.expander — no Streamlit icon dependency)
#  Uses two adjacent columns: left = HTML title, right = chevron button.
#  CSS glues them together into one seamless header bar.
# ════════════════════════════════════════════════════════════════════════════
_CHEV_DOWN  = "▾"
_CHEV_RIGHT = "▸"


def _section(title: str, key: str, default_open: bool = False) -> bool:
    """Render a collapsible section header. Returns True when open."""
    is_open  = st.session_state.get(f"_s_{key}", default_open)
    chev_css = '"▾"' if is_open else '"▸"'
    bc   = "#a5b4fc" if is_open else "#e2e8f0"
    bg   = "#faf5ff" if is_open else "#ffffff"
    tc   = "#4f46e5" if is_open else "#1e293b"
    cc   = "#4f46e5" if is_open else "#94a3b8"

    # Single full-width button; CSS places title left + chevron right via ::after
    st.markdown(
        f'<style>'
        f'button[title="sec_{key}"] {{'
        f'  display:flex!important; flex-direction:row!important;'
        f'  justify-content:space-between!important; align-items:center!important;'
        f'  width:100%!important; height:46px!important;'
        f'  padding:0 0.85rem!important;'
        f'  background:{bg}!important; border:1.5px solid {bc}!important;'
        f'  border-radius:10px!important; box-shadow:none!important;'
        f'  text-align:left!important;'
        f'}}'
        f'button[title="sec_{key}"] p {{'
        f'  margin:0!important; text-align:left!important; flex:1!important;'
        f'  font-weight:600!important; font-size:0.875rem!important; color:{tc}!important;'
        f'}}'
        f'button[title="sec_{key}"]::after {{'
        f'  content:{chev_css}; color:{cc}!important;'
        f'  font-size:1.1rem!important; flex-shrink:0!important;'
        f'}}'
        f'button[title="sec_{key}"]:hover {{'
        f'  background:#ede9fe!important;'
        f'}}'
        f'button[title="sec_{key}"]:hover p,'
        f'button[title="sec_{key}"]:hover::after {{'
        f'  color:#4f46e5!important;'
        f'}}'
        f'</style>',
        unsafe_allow_html=True,
    )
    if st.button(title, key=f"_sec_{key}", help=f"sec_{key}", use_container_width=True):
        st.session_state[f"_s_{key}"] = not is_open
        st.rerun()

    return is_open


def view_home():
    # Hero
    st.markdown("""
<div style="text-align:center;padding:1.75rem 1rem 1.5rem;">
  <div style="font-size:2rem;font-weight:800;color:#1e293b;letter-spacing:-0.5px;line-height:1.25;margin-bottom:0.6rem;">
    Your AI <span style="color:#4f46e5;">Marketing Analyst</span>
  </div>
  <div style="font-size:1rem;color:#64748b;max-width:460px;margin:0 auto;line-height:1.65;">
    Enter your website URL and get a full marketing audit —
    SEO, competitors, content gaps, and quick wins — in under 60 seconds.
  </div>
</div>""", unsafe_allow_html=True)

    # API key warning
    missing = []
    if not os.getenv("ANTHROPIC_API_KEY", "").strip():
        missing.append("ANTHROPIC_API_KEY")
    if not os.getenv("FIRECRAWL_API_KEY", "").strip():
        missing.append("FIRECRAWL_API_KEY")
    if missing:
        st.error(
            f"Missing API keys: **{', '.join(missing)}**  \n"
            "Set them in Railway → Settings → Variables, then redeploy."
        )

    # Audit form
    with st.form("audit_form", clear_on_submit=False):
        biz_name = st.text_input(
            "Business Name",
            placeholder="e.g. My Coffee Shop (optional)",
            value=st.session_state.get("_form_biz_name", ""),
        )
        url = st.text_input(
            "Website URL",
            placeholder="https://yourbusiness.com/",
            value=st.session_state.get("last_url", ""),
        )
        deep_crawl = st.checkbox(
            "Deep crawl (scrape up to 10 pages for richer data)",
            value=False,
        )
        st.markdown('<div style="height:0.25rem"></div>', unsafe_allow_html=True)
        run_btn = st.form_submit_button(
            "Audit My Website",
            type="primary",
            use_container_width=True,
            disabled=bool(missing),
        )

    if run_btn:
        if not url or not url.startswith("http"):
            st.error("Please enter a valid URL starting with http:// or https://")
            return
        st.session_state.last_url = url
        st.session_state._form_biz_name = biz_name
        st.session_state._pending_audit = {
            "url": url,
            "biz_name": biz_name,
            "deep_crawl": deep_crawl,
        }
        st.session_state.view = "running"
        st.rerun()

    # Recent audits
    clients = DB["get_all_clients"]()
    if clients:
        st.markdown(
            '<div style="margin-top:2rem;font-size:0.72rem;font-weight:700;color:#94a3b8;'
            'text-transform:uppercase;letter-spacing:0.09em;margin-bottom:0.6rem;">'
            'Recent Audits</div>',
            unsafe_allow_html=True,
        )
        for c in clients[:5]:
            research = DB["get_latest_research"](c["id"])
            score_val = 0
            if research:
                sv = research.get("research_data", {}).get("overall_marketing_score", {})
                score_val = sv.get("score", 0) if isinstance(sv, dict) else 0
            color = "#22c55e" if score_val >= 70 else "#f59e0b" if score_val >= 50 else "#ef4444"
            score_html = (
                f'<span style="background:{color};color:#fff;border-radius:6px;'
                f'padding:1px 8px;font-size:0.73rem;font-weight:700;">{score_val}</span>'
                if score_val else ""
            )
            date_str = c.get("created_at", "")[:10]

            col_info, col_open = st.columns([4, 1])
            with col_info:
                st.markdown(f"""
<div style="padding:0.65rem 0.9rem;background:#fff;border:1px solid #e2e8f0;
     border-radius:10px;margin-bottom:0.3rem;cursor:pointer;">
  <div style="display:flex;align-items:center;gap:0.5rem;">
    <span style="font-weight:600;color:#1e293b;font-size:0.88rem;">{c['name']}</span>
    {score_html}
    <span style="font-size:0.73rem;color:#94a3b8;margin-left:auto;">{date_str}</span>
  </div>
  <div style="font-size:0.73rem;color:#94a3b8;margin-top:2px;">
    {c.get('website_url','')[:60]}
  </div>
</div>""", unsafe_allow_html=True)
            with col_open:
                st.markdown('<div style="height:0.35rem"></div>', unsafe_allow_html=True)
                if st.button("Open →", key=f"home_open_{c['id']}", use_container_width=True):
                    _load_client(c["id"], c["name"])


# ════════════════════════════════════════════════════════════════════════════
#  VIEW: RUNNING (audit in progress)
# ════════════════════════════════════════════════════════════════════════════
def view_running():
    pending = st.session_state.get("_pending_audit", {})
    url = pending.get("url", "")
    biz_name = pending.get("biz_name", "")
    deep_crawl = pending.get("deep_crawl", False)
    crawl_limit = 10 if deep_crawl else 1

    # ── Loading UI ───────────────────────────────────────────────────────────
    st.markdown(f"""
<style>
@keyframes spin {{ to {{ transform: rotate(360deg); }} }}
@keyframes pulse {{ 0%,100%{{opacity:1}} 50%{{opacity:.4}} }}
.audit-spinner {{
  width:48px;height:48px;border-radius:50%;
  border:3px solid #ede9fe;border-top-color:#4f46e5;
  animation:spin 0.9s linear infinite;margin:0 auto 1.25rem;
}}
.audit-step {{
  display:flex;align-items:center;gap:0.75rem;
  padding:0.6rem 1rem;border-radius:10px;margin-bottom:0.4rem;
  background:#fff;border:1px solid #e2e8f0;font-size:0.88rem;
}}
.audit-step-icon {{
  width:24px;height:24px;border-radius:50%;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;font-size:0.7rem;
}}
.step-waiting {{ background:#f8fafc;color:#94a3b8; }}
.step-active  {{ background:#faf5ff;border-color:#a5b4fc;color:#4f46e5;animation:pulse 1.5s ease-in-out infinite; }}
.step-active .audit-step-icon {{ background:#4f46e5;color:#fff; }}
.step-done    {{ background:#f0fdf4;border-color:#86efac;color:#166534; }}
.step-done .audit-step-icon {{ background:#22c55e;color:#fff; }}
</style>
<div style="max-width:460px;margin:3rem auto 0;text-align:center;">
  <div class="audit-spinner"></div>
  <div style="font-size:1.4rem;font-weight:700;color:#1e293b;margin-bottom:0.3rem;">Auditing your website</div>
  <div style="font-size:0.85rem;color:#94a3b8;margin-bottom:1.75rem;">{url}</div>
</div>""", unsafe_allow_html=True)

    STEPS = [
        "Scraping website content",
        "Extracting pages & structure",
        "Running AI marketing analysis",
        "Building your audit report",
    ]

    step_box = st.empty()

    def render_steps(active_idx: int, done_up_to: int):
        html = '<div style="max-width:460px;margin:0 auto;">'
        for i, label in enumerate(STEPS):
            if i < done_up_to:
                cls, icon = "step-done", "✓"
            elif i == active_idx:
                cls, icon = "step-active", str(i + 1)
            else:
                cls, icon = "step-waiting", str(i + 1)
            html += (
                f'<div class="audit-step {cls}">'
                f'<div class="audit-step-icon">{icon}</div>'
                f'<span>{label}</span></div>'
            )
        html += '</div>'
        step_box.markdown(html, unsafe_allow_html=True)

    render_steps(0, 0)

    progress_bar = st.progress(10)

    # Map raw progress messages to step indices
    def _on_progress(msg: str):
        m = msg.lower()
        if "scraped" in m or "fallback" in m:
            render_steps(1, 1)
            progress_bar.progress(35)
        elif "analysis" in m or "claude" in m or "sending" in m:
            render_steps(2, 2)
            progress_bar.progress(60)

    client_id = None
    if biz_name:
        try:
            client = DB["create_client"](name=biz_name, website_url=url)
            client_id = client.id
            st.session_state.active_client_id = client_id
            st.session_state.active_client_name = biz_name
        except Exception:
            pass

    try:
        from research_agent import run_research

        result = run_research(
            url=url,
            deep_crawl=deep_crawl,
            crawl_limit=crawl_limit,
            progress_callback=_on_progress,
        )

        render_steps(3, 3)
        progress_bar.progress(95)

        if result.get("success"):
            st.session_state.research_result = result
            st.session_state.chat_messages = []
            st.session_state.agent_outputs = {}
            st.session_state._agent_outputs_loaded_for = -1

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

            render_steps(4, 4)
            progress_bar.progress(100)
            time.sleep(0.3)
            st.session_state._pending_audit = {}
            st.session_state.view = "results"
            st.rerun()
        else:
            st.error(f"Audit failed: {result.get('error', 'Unknown error')}")
            st.markdown('<div style="height:0.5rem"></div>', unsafe_allow_html=True)
            if st.button("← Go Back"):
                st.session_state.view = "home"
                st.rerun()
    except Exception as e:
        st.error(f"Error running audit: {e}")
        st.markdown('<div style="height:0.5rem"></div>', unsafe_allow_html=True)
        if st.button("← Go Back"):
            st.session_state.view = "home"
            st.rerun()


# ════════════════════════════════════════════════════════════════════════════
#  HELPER: load a saved client into the results view
# ════════════════════════════════════════════════════════════════════════════
def _load_client(client_id: int, client_name: str):
    saved = DB["get_latest_research"](client_id)
    if saved:
        st.session_state.research_result = {
            "success": True,
            "research": saved["research_data"],
            "scraped_markdown": saved.get("scraped_markdown", ""),
            "pages_crawled": saved.get("pages_crawled", 1),
        }
        st.session_state.active_client_id = client_id
        st.session_state.active_client_name = client_name
        st.session_state.chat_messages = []
        st.session_state.agent_outputs = {}
        st.session_state._agent_outputs_loaded_for = -1
        st.session_state.view = "results"
        st.rerun()
    else:
        st.warning("No audit data found for this website.")


# ════════════════════════════════════════════════════════════════════════════
#  VIEW: RESULTS
# ════════════════════════════════════════════════════════════════════════════
def view_results():
    result = st.session_state.get("research_result")
    if not result or not result.get("success"):
        st.session_state.view = "home"
        st.rerun()
        return

    data = result.get("research", {})
    biz_name = data.get("business_name") or st.session_state.active_client_name or "Your Business"
    score = data.get("overall_marketing_score", {})
    score_val = score.get("score", 0) if isinstance(score, dict) else 0
    score_color = "#22c55e" if score_val >= 70 else "#f59e0b" if score_val >= 50 else "#ef4444"

    # ── Business card + score ────────────────────────────────────────────────
    industry = data.get("industry", "") or ""
    location = data.get("location", "") or ""
    sub = " · ".join(x for x in [industry, location] if x)

    st.markdown(f"""
<div style="display:flex;align-items:center;justify-content:space-between;
     background:#fff;border:1.5px solid #e2e8f0;border-radius:14px;
     padding:1rem 1.25rem;margin-bottom:1rem;
     box-shadow:0 2px 8px rgba(0,0,0,0.05);">
  <div style="min-width:0;">
    <div style="font-size:1.2rem;font-weight:800;color:#1e293b;
         white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{biz_name}</div>
    {"<div style='font-size:0.78rem;color:#94a3b8;margin-top:3px;'>"+sub+"</div>" if sub else ""}
  </div>
  <div style="text-align:center;flex-shrink:0;margin-left:1rem;">
    <div style="width:58px;height:58px;border-radius:50%;background:{score_color};
         display:flex;align-items:center;justify-content:center;
         font-size:1.2rem;font-weight:800;color:#fff;
         box-shadow:0 2px 8px {score_color}66;">{score_val}</div>
    <div style="font-size:0.65rem;color:#94a3b8;margin-top:3px;
         text-transform:uppercase;letter-spacing:0.06em;">Score /100</div>
  </div>
</div>""", unsafe_allow_html=True)

    # ── KPI row ──────────────────────────────────────────────────────────────
    pages       = result.get("pages_crawled", 1)
    services    = len(data.get("services_offered", []) or [])
    quick_wins  = len(data.get("quick_win_opportunities", []) or [])
    competitors = len(
        data.get("competitor_analysis", [])
        or data.get("competitors", [])
        or []
    )
    c1, c2, c3, c4 = st.columns(4)
    with c1: st.metric("Pages", pages)
    with c2: st.metric("Services", services)
    with c3: st.metric("Quick Wins", quick_wins)
    with c4: st.metric("Competitors", competitors)

    st.markdown('<div style="height:0.75rem"></div>', unsafe_allow_html=True)

    # ── Audit sections ───────────────────────────────────────────────────────
    if _section("Overview — Business, Gaps & Strengths", "overview", default_open=True):
        with st.container():
            st.markdown('<div class="sec-body">', unsafe_allow_html=True)
            col1, col2 = st.columns(2)
            with col1:
                services_list = data.get("services_offered", []) or []
                if services_list:
                    st.markdown("**Services**")
                    for s in services_list:
                        st.markdown(f"- {s}")
                strengths = data.get("current_marketing_strengths", []) or []
                if strengths:
                    st.markdown("**Strengths**")
                    for s in strengths:
                        st.markdown(f"- {s}")
            with col2:
                gaps = data.get("current_marketing_gaps", []) or []
                if gaps:
                    st.markdown("**Marketing Gaps**")
                    for g in gaps:
                        st.markdown(f"- {g}")
            st.markdown('</div>', unsafe_allow_html=True)

    if _section("SEO & Keywords", "seo"):
        seo = data.get("seo_analysis", {}) or {}
        keywords = (
            data.get("top_10_longtail_keywords", [])
            or data.get("target_keywords", [])
            or seo.get("target_keywords", [])
            or []
        )
        tech_issues = (
            data.get("technical_seo_issues", [])
            or seo.get("technical_issues", [])
            or []
        )
        if keywords:
            st.markdown("**Target Keywords**")
            kw_html = ""
            for kw in keywords[:15]:
                if isinstance(kw, dict):
                    txt = kw.get("keyword", str(kw))
                else:
                    txt = str(kw)
                kw_html += (
                    f'<span style="background:#ede9fe;color:#4f46e5;border-radius:6px;'
                    f'padding:2px 9px;font-size:0.8rem;display:inline-block;margin:3px;">'
                    f'{txt}</span>'
                )
            st.markdown(
                f'<div style="line-height:2;">{kw_html}</div>',
                unsafe_allow_html=True,
            )
        if tech_issues:
            st.markdown("**Technical Issues to Fix**")
            for t in tech_issues[:8]:
                st.markdown(f"- {t}")
        if not keywords and not tech_issues:
            st.caption("No SEO data found in audit.")

    if _section("Competitors", "competitors"):
        comp_list = (
            data.get("competitor_analysis", [])
            or data.get("competitors", [])
            or []
        )
        if comp_list:
            for comp in comp_list[:6]:
                if isinstance(comp, dict):
                    name = comp.get("name") or comp.get("competitor_name") or "Competitor"
                    url_c = comp.get("url") or comp.get("website") or ""
                    strength = comp.get("strengths") or comp.get("key_strength") or comp.get("strength") or ""
                    weakness = comp.get("weaknesses") or comp.get("weakness") or ""
                    st.markdown(f"""
<div style="padding:0.65rem 0.9rem;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:0.4rem;">
  <span style="font-weight:700;color:#1e293b;">{name}</span>
  {"<span style='font-size:0.73rem;color:#94a3b8;margin-left:0.5rem;'>" + url_c + "</span>" if url_c else ""}
  {"<div style='font-size:0.82rem;color:#475569;margin-top:4px;'><b>Strength:</b> " + str(strength)[:120] + "</div>" if strength else ""}
  {"<div style='font-size:0.82rem;color:#475569;'><b>Weakness:</b> " + str(weakness)[:120] + "</div>" if weakness else ""}
</div>""", unsafe_allow_html=True)
                else:
                    st.markdown(f"- {comp}")
        else:
            st.caption("No competitor data found.")

    if _section("Quick Wins — Actionable Opportunities", "quickwins"):
        wins = data.get("quick_win_opportunities", []) or []
        if wins:
            for i, w in enumerate(wins, 1):
                if isinstance(w, dict):
                    title  = w.get("tactic") or w.get("title") or w.get("opportunity") or f"Win #{i}"
                    effort = (w.get("effort") or "").lower()
                    impact = w.get("expected_impact") or w.get("impact") or ""
                    timeline = w.get("timeline") or ""
                    effort_color = "#22c55e" if "low" in effort else "#f59e0b" if "medium" in effort else "#ef4444"
                    badges = ""
                    if effort:
                        badges += f'<span style="background:{effort_color};color:#fff;border-radius:5px;padding:1px 7px;font-size:0.72rem;font-weight:700;margin-right:4px;">{effort} effort</span>'
                    if timeline:
                        badges += f'<span style="background:#ede9fe;color:#4f46e5;border-radius:5px;padding:1px 7px;font-size:0.72rem;font-weight:600;">{timeline}</span>'
                    st.markdown(f"""
<div style="padding:0.65rem 0.9rem;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:0.4rem;">
  <div style="font-weight:600;color:#1e293b;font-size:0.88rem;margin-bottom:4px;">{i}. {title}</div>
  {"<div style='font-size:0.82rem;color:#475569;margin-bottom:5px;'>"+str(impact)[:160]+"</div>" if impact else ""}
  {badges}
</div>""", unsafe_allow_html=True)
                else:
                    st.markdown(f"- {w}")
        else:
            st.caption("No quick wins identified.")

    if _section("Target Audience", "audience"):
        personas = data.get("target_audience", []) or []
        if personas:
            for p in personas[:4]:
                if isinstance(p, dict):
                    pname = p.get("persona_name", "Audience Segment")
                    demo  = p.get("demographics", "")
                    pains = p.get("pain_points", []) or []
                    reach = p.get("where_to_reach", "")
                    st.markdown(f"**{pname}**")
                    if demo:
                        st.caption(demo)
                    if pains:
                        st.markdown("Pain points: " + " · ".join(str(x) for x in pains[:4]))
                    if reach:
                        st.markdown(f"Where to reach: {reach}")
                    st.markdown("---")
        else:
            st.caption("No audience data found.")

    if _section("Download Report", "download"):
        summary_md = _build_summary_markdown(data)
        dl1, dl2 = st.columns(2)
        with dl1:
            st.download_button(
                "Download Markdown",
                data=summary_md,
                file_name=f"audit_{biz_name.replace(' ', '_')}.md",
                mime="text/markdown",
                use_container_width=True,
            )
        with dl2:
            st.download_button(
                "Download JSON",
                data=json.dumps(data, indent=2),
                file_name=f"audit_{biz_name.replace(' ', '_')}.json",
                mime="application/json",
                use_container_width=True,
            )

    st.divider()

    # ── AI Agents ────────────────────────────────────────────────────────────
    st.markdown("### Activate AI Agents")
    st.caption(
        "Each agent uses your audit data as context and generates ready-to-use marketing content. "
        "Results are saved automatically."
    )

    client_id = st.session_state.active_client_id

    # Load saved runs from DB when client changes
    loaded_for = st.session_state.get("_agent_outputs_loaded_for", -1)
    if client_id and client_id != loaded_for:
        saved_runs = DB["get_agent_runs_by_client"](client_id, limit=30)
        for run in saved_runs:
            aid = run["agent_type"]
            if not st.session_state.agent_outputs.get(aid):
                st.session_state.agent_outputs[aid] = {
                    "output": run["output"],
                    "task": run["task"],
                    "timestamp": run["timestamp"],
                    "saved": True,
                }
        st.session_state._agent_outputs_loaded_for = client_id

    agent_ids = list(AGENT_META.keys())
    cols = st.columns(3)
    for i, aid in enumerate(agent_ids):
        meta = AGENT_META[aid]
        has_output = bool(st.session_state.agent_outputs.get(aid))
        done_badge = " ✓" if has_output else ""
        label = f"{meta['label']}{done_badge}"
        with cols[i % 3]:
            if st.button(label, key=f"agent_btn_{aid}", use_container_width=True):
                task = _agent_task(aid, biz_name)
                with st.spinner(f"Running {meta['label']} agent..."):
                    try:
                        from agents import run_agent, AGENT_REGISTRY
                        res = run_agent(
                            agent_id=aid,
                            task=task,
                            research_data=data,
                            max_tokens=2000,
                        )
                        if res.get("success"):
                            ts = datetime.now().strftime("%b %d, %H:%M")
                            st.session_state.agent_outputs[aid] = {
                                "output": res["output"],
                                "task": task,
                                "timestamp": ts,
                            }
                            if client_id:
                                agent_name = AGENT_REGISTRY.get(aid, {}).get("name", meta["label"])
                                DB["save_agent_run"](
                                    agent_type=aid,
                                    agent_name=agent_name,
                                    output=res["output"],
                                    input_data={"task": task},
                                    client_id=client_id,
                                )
                            st.rerun()
                        else:
                            st.error(f"Agent error: {res.get('error', 'Unknown error')}")
                    except Exception as e:
                        st.error(f"Error: {e}")

    # "Run All" button
    st.markdown('<div style="height:0.5rem"></div>', unsafe_allow_html=True)
    if st.button("Run All 7 Agents — Do It For Me", type="primary", use_container_width=True):
        _run_all_agents(data, biz_name, client_id)
        st.rerun()

    # Agent output cards
    outputs = st.session_state.agent_outputs
    if outputs:
        st.markdown('<div style="height:0.5rem"></div>', unsafe_allow_html=True)
        for aid, out in outputs.items():
            meta = AGENT_META.get(aid, {"label": aid})
            ts = out.get("timestamp", "")
            if _section(f"{meta['label']} Agent — {ts}", f"agent_out_{aid}"):
                st.markdown(out.get("output", ""))

    st.divider()

    # ── Chat ─────────────────────────────────────────────────────────────────
    st.markdown("### Ask About Your Audit")
    st.caption(
        "Your full audit data is loaded as context. Ask anything about your marketing strategy, "
        "SEO, competitors, or what to prioritise."
    )

    for msg in st.session_state.chat_messages:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])

    if prompt := st.chat_input("Ask anything about your marketing audit..."):
        st.session_state.chat_messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)
        with st.chat_message("assistant"):
            response_text = st.write_stream(
                _chat_stream(prompt, data, st.session_state.chat_messages[:-1])
            )
        st.session_state.chat_messages.append({"role": "assistant", "content": response_text})


# ════════════════════════════════════════════════════════════════════════════
#  RUN ALL AGENTS
# ════════════════════════════════════════════════════════════════════════════
def _run_all_agents(data: dict, biz_name: str, client_id: Optional[int]):
    from agents import run_agent, AGENT_REGISTRY

    progress = st.empty()
    agent_ids = list(AGENT_META.keys())

    for i, aid in enumerate(agent_ids):
        meta = AGENT_META[aid]
        progress.info(f"Running {i+1}/{len(agent_ids)}: {meta['label']} agent...")
        task = _agent_task(aid, biz_name)
        try:
            res = run_agent(agent_id=aid, task=task, research_data=data, max_tokens=2000)
            if res.get("success"):
                ts = datetime.now().strftime("%b %d, %H:%M")
                st.session_state.agent_outputs[aid] = {
                    "output": res["output"],
                    "task": task,
                    "timestamp": ts,
                }
                if client_id:
                    agent_name = AGENT_REGISTRY.get(aid, {}).get("name", meta["label"])
                    DB["save_agent_run"](
                        agent_type=aid,
                        agent_name=agent_name,
                        output=res["output"],
                        input_data={"task": task},
                        client_id=client_id,
                    )
        except Exception:
            pass

    progress.success(f"All {len(agent_ids)} agents complete!")
    st.session_state._agent_outputs_loaded_for = -1


# ════════════════════════════════════════════════════════════════════════════
#  CHAT STREAM
# ════════════════════════════════════════════════════════════════════════════
def _chat_stream(user_message: str, research_data: dict, history: list):
    import anthropic

    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        yield "API key not configured. Please set ANTHROPIC_API_KEY in your Railway environment."
        return

    system = f"""You are an AI marketing analyst for Snappymarketer. The user has audited their website and you have full access to their audit data below.

Audit Data:
{json.dumps(research_data, indent=2)[:8000]}

Answer questions about their marketing strategy, SEO, competitors, content gaps, and growth opportunities. Be specific — reference their actual business name, services, competitors, and data points from the audit. Give direct, actionable advice. Keep responses concise and practical."""

    messages = []
    for m in history[-8:]:
        messages.append({"role": m["role"], "content": m["content"]})
    messages.append({"role": "user", "content": user_message})

    try:
        client = anthropic.Anthropic(api_key=api_key)
        with client.messages.stream(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            system=system,
            messages=messages,
        ) as stream:
            for text in stream.text_stream:
                yield text
    except Exception as e:
        yield f"Error: {e}"


# ════════════════════════════════════════════════════════════════════════════
#  VIEW: SAVED AUDITS
# ════════════════════════════════════════════════════════════════════════════
def view_saved():
    st.markdown("## My Saved Audits")
    st.caption("All your past website audits. Open one to continue working with AI agents and chat.")

    clients = DB["get_all_clients"]()

    if not clients:
        st.markdown("""
<div style="text-align:center;padding:3rem 1rem;background:#faf5ff;
     border:2px dashed #c4b5fd;border-radius:14px;color:#6d28d9;">
  <div style="font-size:1.1rem;font-weight:700;margin-bottom:0.5rem;">No audits yet</div>
  <div style="font-size:0.88rem;opacity:0.8;">
    Audit your first website to get started.
  </div>
</div>""", unsafe_allow_html=True)
        st.markdown('<div style="height:0.75rem"></div>', unsafe_allow_html=True)
        if st.button("← Audit My Website", type="primary"):
            st.session_state.view = "home"
            st.rerun()
        return

    for c in clients:
        research = DB["get_latest_research"](c["id"])
        score_val = 0
        industry = ""
        if research:
            rd = research.get("research_data", {})
            sv = rd.get("overall_marketing_score", {})
            score_val = sv.get("score", 0) if isinstance(sv, dict) else 0
            industry = rd.get("industry", "") or ""

        score_color = "#22c55e" if score_val >= 70 else "#f59e0b" if score_val >= 50 else "#ef4444"
        date_str = c.get("created_at", "")[:10] if c.get("created_at") else ""
        sub = " · ".join(x for x in [industry, date_str] if x)

        col_card, col_open, col_del = st.columns([4, 1, 1])
        with col_card:
            st.markdown(f"""
<div style="padding:0.8rem 1rem;background:#fff;border:1.5px solid #e2e8f0;
     border-radius:12px;margin-bottom:0.1rem;box-shadow:0 1px 4px rgba(0,0,0,0.04);">
  <div style="display:flex;align-items:center;gap:0.75rem;">
    <div style="width:46px;height:46px;border-radius:50%;background:{score_color};
         display:flex;align-items:center;justify-content:center;
         font-size:1rem;font-weight:800;color:#fff;flex-shrink:0;">{score_val or "?"}</div>
    <div style="min-width:0;">
      <div style="font-weight:700;color:#1e293b;font-size:0.95rem;">{c['name']}</div>
      <div style="font-size:0.73rem;color:#94a3b8;">{sub}</div>
      <div style="font-size:0.72rem;color:#94a3b8;margin-top:1px;
           white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
        {c.get('website_url','')[:55]}
      </div>
    </div>
  </div>
</div>""", unsafe_allow_html=True)
        with col_open:
            st.markdown('<div style="height:0.4rem"></div>', unsafe_allow_html=True)
            if st.button("Open", key=f"saved_open_{c['id']}", type="primary", use_container_width=True):
                _load_client(c["id"], c["name"])
        with col_del:
            st.markdown('<div style="height:0.4rem"></div>', unsafe_allow_html=True)
            if st.button("Delete", key=f"saved_del_{c['id']}", use_container_width=True):
                st.session_state[f"_confirm_del_{c['id']}"] = True

        if st.session_state.get(f"_confirm_del_{c['id']}"):
            warn_col, yes_col, no_col = st.columns([3, 1, 1])
            with warn_col:
                st.warning(f"Remove **{c['name']}**? This cannot be undone.")
            with yes_col:
                if st.button("Remove", key=f"confirm_del_{c['id']}", type="primary"):
                    try:
                        DB["delete_client"](c["id"])
                    except Exception:
                        pass
                    if st.session_state.active_client_id == c["id"]:
                        st.session_state.active_client_id = None
                        st.session_state.active_client_name = ""
                        st.session_state.research_result = None
                    st.session_state[f"_confirm_del_{c['id']}"] = False
                    st.rerun()
            with no_col:
                if st.button("Cancel", key=f"cancel_del_{c['id']}"):
                    st.session_state[f"_confirm_del_{c['id']}"] = False
                    st.rerun()

        st.markdown('<div style="height:0.35rem"></div>', unsafe_allow_html=True)


# ════════════════════════════════════════════════════════════════════════════
#  SUMMARY MARKDOWN (for downloads)
# ════════════════════════════════════════════════════════════════════════════
def _build_summary_markdown(data: dict) -> str:
    biz   = data.get("business_name", "Business")
    score = data.get("overall_marketing_score", {})
    sv    = score.get("score", 0) if isinstance(score, dict) else 0

    lines = [
        f"# Marketing Audit Report: {biz}",
        f"**Score:** {sv}/100  |  **Industry:** {data.get('industry','N/A')}  |  **Location:** {data.get('location','N/A')}",
        "",
    ]

    services = data.get("services_offered", []) or []
    if services:
        lines += ["## Services Offered"] + [f"- {s}" for s in services] + [""]

    gaps = data.get("current_marketing_gaps", []) or []
    if gaps:
        lines += ["## Marketing Gaps"] + [f"- {g}" for g in gaps] + [""]

    strengths = data.get("current_marketing_strengths", []) or []
    if strengths:
        lines += ["## Strengths"] + [f"- {s}" for s in strengths] + [""]

    keywords = (
        data.get("top_10_longtail_keywords", [])
        or data.get("target_keywords", [])
        or []
    )
    if keywords:
        lines += ["## Target Keywords"]
        for kw in keywords[:15]:
            if isinstance(kw, dict):
                lines.append(f"- **{kw.get('keyword','')}** — {kw.get('intent','')} intent")
            else:
                lines.append(f"- {kw}")
        lines.append("")

    competitors = data.get("competitor_analysis", []) or data.get("competitors", []) or []
    if competitors:
        lines += ["## Competitor Analysis"]
        for comp in competitors:
            if isinstance(comp, dict):
                name = comp.get("name") or comp.get("competitor_name") or "Competitor"
                lines.append(f"### {name}")
                if comp.get("strengths"):
                    lines.append(f"**Strengths:** {comp['strengths']}")
                if comp.get("weaknesses"):
                    lines.append(f"**Weaknesses:** {comp['weaknesses']}")
            else:
                lines.append(f"- {comp}")
        lines.append("")

    wins = data.get("quick_win_opportunities", []) or []
    if wins:
        lines += ["## Quick Wins"]
        for w in wins:
            if isinstance(w, dict):
                title = w.get("tactic") or w.get("title") or w.get("opportunity") or ""
                impact = w.get("expected_impact") or w.get("impact") or ""
                lines.append(f"### {title}")
                if impact:
                    lines.append(str(impact))
            else:
                lines.append(f"- {w}")
        lines.append("")

    personas = data.get("target_audience", []) or []
    if personas:
        lines += ["## Target Audience"]
        for i, p in enumerate(personas):
            if isinstance(p, dict):
                lines.append(f"### Persona {i+1}: {p.get('persona_name','Segment')}")
                if p.get("demographics"):
                    lines.append(f"**Demographics:** {p['demographics']}")
                pains = p.get("pain_points", []) or []
                if pains:
                    lines.append("**Pain Points:**")
                    for pain in pains:
                        lines.append(f"- {pain}")
                if p.get("where_to_reach"):
                    lines.append(f"**Where to reach:** {p['where_to_reach']}")
            else:
                lines.append(f"- {p}")
        lines.append("")

    return "\n".join(lines)


# ════════════════════════════════════════════════════════════════════════════
#  MAIN
# ════════════════════════════════════════════════════════════════════════════
def main():
    st.markdown(APP_CSS, unsafe_allow_html=True)

    # ── Query-param routing (used by nav <a href> links) ──────────────────
    # Only process params when they actually change (i.e. a real nav click or
    # fresh page load). Comparing to _last_nav_param prevents the params from
    # overriding in-session view changes (e.g. view="running" during an audit).
    nav_param    = st.query_params.get("nav")
    client_param = st.query_params.get("client")

    last_nav    = st.session_state.get("_last_nav_param",    "__unset__")
    last_client = st.session_state.get("_last_client_param", "__unset__")

    if nav_param != last_nav or client_param != last_client:
        st.session_state._last_nav_param    = nav_param
        st.session_state._last_client_param = client_param

        if client_param:
            try:
                cid = int(client_param)
                if (st.session_state.active_client_id != cid
                        or not st.session_state.get("research_result")):
                    _load_client_silent(cid)
            except (ValueError, TypeError):
                pass

        if nav_param in ("home", "results", "saved"):
            want = nav_param
            if want == "results" and not st.session_state.get("research_result"):
                want = "home"
            st.session_state.view = want

    view = st.session_state.get("view", "home")

    render_nav(view)

    if view == "home":
        view_home()
    elif view == "running":
        view_running()
    elif view == "results":
        view_results()
    elif view == "saved":
        view_saved()
    else:
        st.session_state.view = "home"
        view_home()


if __name__ == "__main__":
    main()
