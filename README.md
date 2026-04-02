# SnapLabs — AI Marketing Platform

> A production-ready, all-in-one AI marketing platform for agency owners. Research any business, generate client proposals, and run AI agents — all powered by Claude + Firecrawl.

---

## Features

| Module | Description |
|--------|-------------|
| **Research Engine** | Scrape any website with Firecrawl → full AI audit (keywords, gaps, personas, competitors) |
| **Proposal Generator** | Turn audit data into a polished client proposal with PDF export |
| **Agent Builder** | 8 specialist AI agents: Content, SEO, Ads, Lead Gen, Email, Social, Reviews, Custom |
| **Workflow Engine** | Chain agents into multi-step pipelines with 5 pre-built templates |
| **Client Database** | SQLite-backed storage for clients, research, proposals, and agent runs |
| **Cost Tracker** | Real-time Claude token + Firecrawl credit usage monitor |

---

## Quick Start

### 1. Clone & Install

```bash
git clone <repo-url>
cd Snaplabs
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your API keys
```

Your `.env` should contain:

```env
ANTHROPIC_API_KEY=sk-ant-...
FIRECRAWL_API_KEY=fc-...
AGENCY_NAME=Your Agency Name
AGENCY_EMAIL=hello@youragency.com
AGENCY_PHONE=+1 (555) 000-0000
AGENCY_WEBSITE=https://youragency.com
CLAUDE_MODEL=claude-sonnet-4-6
```

### 3. Run

```bash
streamlit run app.py
```

Open [http://localhost:8501](http://localhost:8501)

---

## API Keys

| Service | Get it at |
|---------|-----------|
| Anthropic (Claude) | https://console.anthropic.com |
| Firecrawl | https://firecrawl.dev |

---

## Project Structure

```
Snaplabs/
├── app.py              # Main Streamlit app (5 tabs)
├── utils.py            # Firecrawl wrapper, PDF helper, cost tracker
├── database.py         # SQLAlchemy/SQLite models & CRUD
├── research_agent.py   # Website scrape → AI marketing audit
├── proposal_agent.py   # Audit → professional client proposal + PDF
├── agents.py           # 8 pre-built AI marketing agents
├── workflow.py         # LangGraph workflow engine + 5 templates
├── requirements.txt
├── .env                # Your API keys (never commit this)
└── .env.example        # Template for .env
```

---

## Tabs Overview

### Dashboard
- KPI overview (clients, costs, agents)
- Recent clients table
- Quick action buttons

### Research
- Enter any URL → Firecrawl scrape → Claude analysis
- Optional **Deep Crawl** (up to 15 pages)
- Results displayed in tabs: Overview, Audience, Keywords, Competitors, Quick Wins
- Export as JSON or Markdown
- Quick Test button: loads `https://empyreanservices.com/`

### Proposal
- Auto-loads latest research for active client
- Configure: agency name, setup fee, monthly retainer, performance bonus
- One-click proposal generation via Claude
- Preview → Edit → Download (Markdown or PDF)
- Follow-up email generator

### Agents
- Select from 8 specialist agents
- Pre-loaded with quick task suggestions
- Context-aware (uses active client research)
- All outputs saved to database

### Workflows
- **Templates:** Quick Audit, Full Marketing Plan, Social Blitz, Lead Gen Machine, Complete Domination
- **Custom Builder:** Select any agents, define tasks, configure pipeline
- Results displayed with per-agent output tabs + download buttons

---

## Workflow Templates

| Template | Agents | Est. Time |
|----------|--------|-----------|
| Quick Audit & Proposal | Research + Proposal | 3-5 min |
| Full Marketing Plan | Research + Proposal + SEO + Content + Lead Gen | 8-12 min |
| Social Media Blitz | Research + Social + Content + Reviews | 6-8 min |
| Lead Gen Machine | Research + Lead Gen + Email + Ads | 6-10 min |
| Complete Domination | Research + Proposal + All 6 core agents | 15-20 min |

---

## Cost Estimates

| Operation | Approx. Cost |
|-----------|-------------|
| Single page scrape | ~1 Firecrawl credit (~$0.001) |
| Deep crawl (10 pages) | ~10 credits (~$0.01) |
| Research audit (Claude) | ~3-5K tokens (~$0.05) |
| Proposal generation | ~5-8K tokens (~$0.10) |
| Single agent run | ~2-3K tokens (~$0.04) |
| Full workflow (all agents) | ~30K tokens (~$0.50) |

---

## Tech Stack

- **Frontend:** Streamlit with custom dark CSS theme
- **AI:** Anthropic Claude (claude-sonnet-4-6)
- **Scraping:** Firecrawl SDK with requests/BeautifulSoup fallback
- **Workflows:** LangGraph (with pure-Python fallback)
- **Database:** SQLAlchemy + SQLite
- **PDF:** WeasyPrint → ReportLab fallback
- **Other:** pandas, plotly, python-dotenv, markdown

---

## Troubleshooting

**`ANTHROPIC_API_KEY not set`** — Make sure `.env` exists and has the key.

**Firecrawl returns empty content** — The site may block bots. Try enabling Deep Crawl or the fallback scraper will activate automatically.

**PDF generation fails** — WeasyPrint requires system dependencies. Install with:
```bash
# Ubuntu/Debian
sudo apt-get install -y weasyprint libpango-1.0-0 libharfbuzz0b libpangoft2-1.0-0
# macOS
brew install weasyprint
```
The platform falls back to ReportLab automatically if WeasyPrint is unavailable.

**LangGraph not found** — The platform uses a pure-Python fallback automatically. Install optionally: `pip install langgraph`

---

## License

MIT
