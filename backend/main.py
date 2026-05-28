"""
Snappymarketer – FastAPI backend
Endpoints: /clients, /audit (SSE), /agents, /chat (SSE)
"""
import os, sys, json, asyncio, queue, threading
from datetime import datetime
from typing import Optional, AsyncGenerator

# Root-level Python modules (database, research_agent, agents) live one dir up
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

app = FastAPI(title="Snappymarketer API", version="2.0.0")

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── DB helpers ───────────────────────────────────────────────────────────────

def _db():
    from database import (
        init_db, get_all_clients, get_client_by_id, create_client,
        delete_client, get_latest_research, save_research,
        save_agent_run, get_agent_runs_by_client,
    )
    init_db()
    return dict(
        get_all_clients=get_all_clients,
        get_client_by_id=get_client_by_id,
        create_client=create_client,
        delete_client=delete_client,
        get_latest_research=get_latest_research,
        save_research=save_research,
        save_agent_run=save_agent_run,
        get_agent_runs_by_client=get_agent_runs_by_client,
    )


# ── Agent metadata ───────────────────────────────────────────────────────────

AGENT_META = {
    "content_engine":  {"label": "Content"},
    "seo":             {"label": "SEO"},
    "paid_ads":        {"label": "Paid Ads"},
    "social_media":    {"label": "Social Media"},
    "email_sms":       {"label": "Email / SMS"},
    "lead_gen":        {"label": "Lead Gen"},
    "review_referral": {"label": "Reviews"},
}


def _agent_task(aid: str, biz_name: str) -> str:
    biz = biz_name or "this business"
    tasks = {
        "content_engine":  f"Create a comprehensive content strategy for {biz}: 3 blog post outlines targeting the top SEO keywords, a 30-day content calendar, and key messaging for each audience segment.",
        "seo":             f"Provide a complete SEO improvement plan for {biz}: fix critical technical issues, target the top 10 keywords, and outline a 90-day backlink strategy based on the competitor analysis.",
        "paid_ads":        f"Design a Google Ads + Meta Ads campaign for {biz}: campaign structure, ad groups, 5 headline variants, ad copy for each service, and recommended monthly budget allocation.",
        "social_media":    f"Create a 30-day social media content calendar for {biz}: posts for LinkedIn, Instagram and Facebook using the brand story, services, and audience insights.",
        "email_sms":       f"Write a 5-email welcome + nurture sequence for {biz} new leads: subject lines, preview text, body copy, and a clear CTA for each email.",
        "lead_gen":        f"Design a lead generation funnel for {biz}: landing page headline + copy, lead magnet idea, form fields, and a follow-up sequence outline.",
        "review_referral": f"Build a review acquisition and referral program for {biz}: outreach templates for past clients, a referral incentive structure, and a review request script.",
    }
    return tasks.get(aid, f"Run marketing analysis for {biz}.")


# ── SSE helper ───────────────────────────────────────────────────────────────

def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"


SSE_HEADERS = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}


# ── Request models ───────────────────────────────────────────────────────────

class AuditRequest(BaseModel):
    url: str
    biz_name: str = ""
    deep_crawl: bool = False


class AgentRunRequest(BaseModel):
    agent_id: str
    research_data: dict
    biz_name: str = ""
    client_id: Optional[int] = None


class AgentRunAllRequest(BaseModel):
    research_data: dict
    biz_name: str = ""
    client_id: Optional[int] = None


class ChatRequest(BaseModel):
    message: str
    research_data: dict
    history: list = []


# ── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0.0"}


@app.get("/clients")
def list_clients():
    db = _db()
    result = []
    for c in db["get_all_clients"]():
        research = db["get_latest_research"](c["id"])
        score, industry = 0, ""
        if research:
            rd = research.get("research_data", {})
            sv = rd.get("overall_marketing_score", {})
            score = sv.get("score", 0) if isinstance(sv, dict) else 0
            industry = rd.get("industry", "") or ""
        result.append({**c, "score": score, "industry": industry})
    return result


@app.get("/clients/{client_id}")
def get_client(client_id: int):
    db = _db()
    client = db["get_client_by_id"](client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    research = db["get_latest_research"](client_id)
    agent_runs = db["get_agent_runs_by_client"](client_id, limit=30)
    return {"client": client, "research": research, "agent_runs": agent_runs}


@app.delete("/clients/{client_id}")
def delete_client_endpoint(client_id: int):
    _db()["delete_client"](client_id)
    return {"success": True}


@app.post("/audit")
async def run_audit(req: AuditRequest):
    """Start an audit. Streams SSE events: progress → result | error → [DONE]"""

    async def generate() -> AsyncGenerator[str, None]:
        db = _db()
        client_id: Optional[int] = None

        try:
            # Create client record
            if req.biz_name:
                try:
                    c = db["create_client"](name=req.biz_name, website_url=req.url)
                    client_id = c.id
                    yield _sse({"type": "client_id", "client_id": client_id})
                except Exception:
                    pass

            yield _sse({"type": "progress", "step": 0, "label": "Scraping website content"})

            from research_agent import run_research

            q: queue.Queue = queue.Queue()

            def _on_progress(msg: str):
                m = msg.lower()
                if "scraped" in m or "fallback" in m:
                    q.put({"type": "progress", "step": 1, "label": "Extracting pages & structure"})
                elif "analysis" in m or "claude" in m or "sending" in m:
                    q.put({"type": "progress", "step": 2, "label": "Running AI analysis"})

            def _run():
                result = run_research(
                    url=req.url,
                    deep_crawl=req.deep_crawl,
                    crawl_limit=10 if req.deep_crawl else 1,
                    progress_callback=_on_progress,
                )
                q.put({"__result__": result})

            thread = threading.Thread(target=_run, daemon=True)
            thread.start()

            result = None
            while True:
                await asyncio.sleep(0.1)
                try:
                    item = q.get_nowait()
                except queue.Empty:
                    if not thread.is_alive() and q.empty():
                        break
                    continue
                if "__result__" in item:
                    result = item["__result__"]
                    break
                yield _sse(item)

            yield _sse({"type": "progress", "step": 3, "label": "Building your report"})

            if result and result.get("success"):
                if client_id:
                    try:
                        db["save_research"](
                            client_id=client_id,
                            url=req.url,
                            scraped_markdown=result.get("scraped_markdown", ""),
                            research_data=result.get("research", {}),
                            deep_crawl=req.deep_crawl,
                            pages_crawled=result.get("pages_crawled", 1),
                            credits_used=result.get("credits_used", 1),
                            scrape_source=result.get("scrape_source", "firecrawl"),
                        )
                    except Exception:
                        pass
                yield _sse({
                    "type": "result",
                    "data": result.get("research", {}),
                    "pages_crawled": result.get("pages_crawled", 1),
                    "client_id": client_id,
                })
            else:
                err = result.get("error", "Unknown error") if result else "Research failed"
                yield _sse({"type": "error", "message": err})

        except Exception as e:
            yield _sse({"type": "error", "message": str(e)})

        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream", headers=SSE_HEADERS)


@app.post("/agents/run")
async def run_single_agent(req: AgentRunRequest):
    loop = asyncio.get_event_loop()
    task = _agent_task(req.agent_id, req.biz_name)

    def _run():
        from agents import run_agent, AGENT_REGISTRY
        res = run_agent(agent_id=req.agent_id, task=task, research_data=req.research_data, max_tokens=2000)
        if res.get("success") and req.client_id:
            db = _db()
            agent_name = AGENT_REGISTRY.get(req.agent_id, {}).get("name", req.agent_id)
            db["save_agent_run"](
                agent_type=req.agent_id,
                agent_name=agent_name,
                output=res["output"],
                input_data={"task": task},
                client_id=req.client_id,
            )
        return res

    return await loop.run_in_executor(None, _run)


@app.post("/agents/run-all")
async def run_all_agents(req: AgentRunAllRequest):
    """Stream agent outputs one by one via SSE."""

    async def generate() -> AsyncGenerator[str, None]:
        from agents import run_agent, AGENT_REGISTRY
        db = _db()
        agent_ids = list(AGENT_META.keys())
        loop = asyncio.get_event_loop()

        for i, aid in enumerate(agent_ids):
            yield _sse({"type": "agent_start", "agent_id": aid, "index": i, "total": len(agent_ids)})
            task = _agent_task(aid, req.biz_name)

            try:
                res = await loop.run_in_executor(
                    None,
                    lambda a=aid, t=task: run_agent(agent_id=a, task=t, research_data=req.research_data, max_tokens=2000),
                )
                if res.get("success"):
                    ts = datetime.now().strftime("%b %d, %H:%M")
                    if req.client_id:
                        agent_name = AGENT_REGISTRY.get(aid, {}).get("name", aid)
                        db["save_agent_run"](
                            agent_type=aid,
                            agent_name=agent_name,
                            output=res["output"],
                            input_data={"task": task},
                            client_id=req.client_id,
                        )
                    yield _sse({"type": "agent_done", "agent_id": aid, "output": res["output"], "timestamp": ts})
                else:
                    yield _sse({"type": "agent_error", "agent_id": aid, "error": res.get("error", "Unknown")})
            except Exception as e:
                yield _sse({"type": "agent_error", "agent_id": aid, "error": str(e)})

        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream", headers=SSE_HEADERS)


@app.post("/chat")
async def chat_stream(req: ChatRequest):
    """Stream Claude chat response via SSE."""

    async def generate() -> AsyncGenerator[str, None]:
        import anthropic as ant

        api_key = os.getenv("ANTHROPIC_API_KEY", "")
        if not api_key:
            yield _sse({"type": "text", "text": "API key not configured."})
            yield "data: [DONE]\n\n"
            return

        system = (
            "You are an AI marketing analyst for Snappymarketer. "
            "The user has audited their website and you have full access to their audit data.\n\n"
            f"Audit Data:\n{json.dumps(req.research_data, indent=2)[:8000]}\n\n"
            "Answer questions about marketing strategy, SEO, competitors, content gaps, and growth. "
            "Be specific — reference their actual business name, services, and data points. "
            "Give direct, actionable advice. Keep responses concise and practical."
        )

        messages = [{"role": m["role"], "content": m["content"]} for m in req.history[-8:]]
        messages.append({"role": "user", "content": req.message})

        q: queue.Queue = queue.Queue()

        def _stream():
            try:
                client = ant.Anthropic(api_key=api_key)
                with client.messages.stream(
                    model="claude-sonnet-4-6",
                    max_tokens=1024,
                    system=system,
                    messages=messages,
                ) as stream:
                    for text in stream.text_stream:
                        q.put(("text", text))
            except Exception as e:
                q.put(("error", str(e)))
            finally:
                q.put(("done", None))

        thread = threading.Thread(target=_stream, daemon=True)
        thread.start()

        while True:
            await asyncio.sleep(0.02)
            try:
                kind, data = q.get_nowait()
            except queue.Empty:
                continue
            if kind == "done":
                break
            yield _sse({"type": kind, "text": data})

        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream", headers=SSE_HEADERS)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)), reload=True)
