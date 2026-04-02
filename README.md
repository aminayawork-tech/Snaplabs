# ⚡ SnapLabs – AI-Powered Marketing Intelligence Platform

SnapLabs is a full-stack AI marketing platform for agency owners. Scrape any business website, generate a deep marketing audit, produce a client-ready proposal PDF, and run autonomous AI agents — all in one dark-themed Streamlit app.

---

## Features

| Feature | Description |
|---|---|
| 🔍 **AI Research Engine** | Scrape any URL with Firecrawl → Claude generates full business intelligence report |
| 💼 **Proposal Generator** | Turn research into a professional PDF proposal with pricing + custom notes |
| 🤖 **8 AI Agents** | Content, SEO, Paid Ads, Lead Gen, Email/SMS, Social Media, Reviews, Custom |
| ⚙️ **Workflow Builder** | Chain agents together — research → proposal → full marketing plan |
| 💾 **Client CRM** | Save clients, research history, proposals to local SQLite DB |
| 💰 **Cost Tracker** | Live Claude token + Firecrawl credit usage tracking |

---

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/aminayawork-tech/snaplabs.git
cd snaplabs
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
ANTHROPIC_API_KEY=sk-ant-...your key...
FIRECRAWL_API_KEY=fc-...your key...

AGENCY_NAME=Your Agency Name
AGENCY_EMAIL=hello@youragency.com
AGENCY_PHONE=+1 (555) 000-0000
AGENCY_WEBSITE=https://youragency.com
```

### 3. Run

```bash
streamlit run app.py
```

Open [http://localhost:8501](http://localhost:8501)

---

## Project Structure

```
snaplabs/
├── app.py               # Main Streamlit app (all 5 tabs)
├── agents.py            # 8 pre-built AI agent definitions
├── research_agent.py    # Firecrawl + Claude audit engine
├── proposal_agent.py    # Proposal generator + PDF export
├── workflow.py          # Workflow runner + 5 templates
├── database.py          # SQLAlchemy models + CRUD
├── utils.py             # Firecrawl wrapper, PDF, cost tracker
├── requirements.txt
├── .env                 # Your API keys (not committed)
└── .env.example         # Template
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | Claude API key (Anthropic Console) |
| `FIRECRAWL_API_KEY` | ✅ | Firecrawl API key (firecrawl.dev) |
| `AGENCY_NAME` | optional | Your agency name (default: SnapLabs) |
| `AGENCY_EMAIL` | optional | Your contact email |
| `AGENCY_PHONE` | optional | Your phone number |
| `AGENCY_WEBSITE` | optional | Your website URL |
| `CLAUDE_MODEL` | optional | Model ID (default: claude-sonnet-4-6) |
| `DATABASE_URL` | optional | SQLite path (default: sqlite:///snaplabs.db) |

---

## The 5 Tabs

### 1. Dashboard
Overview of all clients, recent activity, and quick-start shortcuts.

### 2. Research (AI Audit)
- Enter any business URL
- Toggle **Deep Crawl** for multi-page sites (10–15 pages, uses more Firecrawl credits)
- Claude returns: business intel, personas, keyword gaps, competitor analysis, quick wins
- Export as JSON or Markdown

### 3. Proposal Generator
- Loaded from latest research automatically
- Edit: agency name, setup fee, monthly retainer, performance bonus, custom notes
- Preview rendered Markdown in real-time
- Download as PDF or copy Markdown

### 4. Agent Builder
8 pre-built agents, each with strong system prompts:

| Agent | What it does |
|---|---|
| ✍️ Content Engine | Blog posts, content calendars, social copy |
| 💰 Paid Ads | Meta + Google campaign strategy + copy |
| 🔍 SEO | Technical audit, keyword clusters, backlink plan |
| 🎯 Lead Gen | ICP definition, LinkedIn outreach, cold email |
| 📧 Email/SMS | Nurture sequences, drip campaigns |
| 📱 Social Media | Platform-specific posts, hashtags, calendars |
| ⭐ Review & Referral | Review campaigns, referral programs |
| ⚡ Custom | Any open-ended marketing task |

### 5. Workflows
5 pre-built templates + custom workflow builder:

| Template | Agents |
|---|---|
| 🚀 Quick Audit & Proposal | Research → Proposal |
| 🎯 Full Marketing Plan | Research → Proposal → SEO + Content + Lead Gen |
| 📱 Social Media Blitz | Research → Social + Content + Reviews |
| 💰 Lead Gen Machine | Research → Lead Gen + Email + Paid Ads |
| 👑 Complete Domination | Research → Proposal → All 6 core agents |

---

## Firecrawl Credit Usage

| Mode | Credits Used |
|---|---|
| Single page scrape | ~1 credit |
| Deep crawl (10 pages) | ~10 credits |
| Deep crawl (15 pages) | ~15 credits |
| Competitor scrape | ~1 credit each |

Get credits at [firecrawl.dev](https://firecrawl.dev)

---

## Claude Token Usage (Approximate)

| Operation | Tokens |
|---|---|
| Research audit | ~3,000–5,000 |
| Proposal generation | ~5,000–7,000 |
| Single agent run | ~2,000–3,000 |
| Full workflow (6 agents) | ~20,000–30,000 |

---

## Dependencies

- `streamlit` — UI framework
- `anthropic` — Claude API
- `firecrawl-py` — Web scraping
- `langgraph` — Workflow orchestration
- `sqlalchemy` — Database ORM
- `weasyprint` / `reportlab` — PDF generation
- `python-dotenv` — Env management

---

## Quick Test

Click **"⚡ Test: Empyrean Services"** in the sidebar to instantly load `https://empyreanservices.com/` and run a live demo.

---

## License

MIT — build freely, deploy anywhere.

---

*Built with ⚡ by SnapLabs*
