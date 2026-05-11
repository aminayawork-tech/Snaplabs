"""
database.py - MarketingOS Database Layer
SQLAlchemy + SQLite models and CRUD helpers for clients, research, proposals, workflows.
"""

import os
import json
from datetime import datetime
from typing import Optional, List, Dict, Any

from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Text,
    DateTime,
    Boolean,
    ForeignKey,
    JSON,
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship, Session
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///snaplabs.db")

engine = create_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    website_url = Column(String(500), nullable=False)
    industry = Column(String(255), default="")
    location = Column(String(255), default="")
    contact_email = Column(String(255), default="")
    contact_phone = Column(String(100), default="")
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    researches = relationship("Research", back_populates="client", cascade="all, delete-orphan")
    proposals = relationship("Proposal", back_populates="client", cascade="all, delete-orphan")
    workflow_runs = relationship("WorkflowRun", back_populates="client", cascade="all, delete-orphan")


class Research(Base):
    __tablename__ = "researches"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    url = Column(String(500), nullable=False)
    scraped_markdown = Column(Text, default="")
    research_json = Column(Text, default="{}")  # JSON stored as text
    deep_crawl = Column(Boolean, default=False)
    pages_crawled = Column(Integer, default=1)
    credits_used = Column(Integer, default=0)
    claude_tokens = Column(Integer, default=0)
    scrape_source = Column(String(100), default="firecrawl")
    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", back_populates="researches")

    @property
    def research_data(self) -> Dict[str, Any]:
        try:
            return json.loads(self.research_json or "{}")
        except Exception:
            return {}

    @research_data.setter
    def research_data(self, value: Dict[str, Any]):
        self.research_json = json.dumps(value, indent=2)


class Proposal(Base):
    __tablename__ = "proposals"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    research_id = Column(Integer, ForeignKey("researches.id"), nullable=True)
    title = Column(String(500), default="AI Marketing Growth Proposal")
    agency_name = Column(String(255), default="")
    content_markdown = Column(Text, default="")
    setup_fee = Column(String(50), default="2,500")
    monthly_retainer = Column(String(50), default="1,500")
    performance_bonus = Column(String(50), default="10% of incremental revenue")
    custom_notes = Column(Text, default="")
    pdf_path = Column(String(500), default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    client = relationship("Client", back_populates="proposals")
    research = relationship("Research")


class AgentRun(Base):
    __tablename__ = "agent_runs"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    agent_type = Column(String(100), nullable=False)  # e.g. "content_engine"
    agent_name = Column(String(255), default="")
    input_data = Column(Text, default="{}")
    output_data = Column(Text, default="")
    status = Column(String(50), default="pending")  # pending | running | done | error
    error_message = Column(Text, default="")
    tokens_used = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    @property
    def input(self) -> Dict[str, Any]:
        try:
            return json.loads(self.input_data or "{}")
        except Exception:
            return {}

    @input.setter
    def input(self, value: Dict[str, Any]):
        self.input_data = json.dumps(value, indent=2)


class WorkflowRun(Base):
    __tablename__ = "workflow_runs"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    name = Column(String(255), default="Custom Workflow")
    agents_sequence = Column(Text, default="[]")  # JSON list of agent types
    status = Column(String(50), default="pending")
    results_json = Column(Text, default="{}")
    total_tokens = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    client = relationship("Client", back_populates="workflow_runs")

    @property
    def agents(self) -> List[str]:
        try:
            return json.loads(self.agents_sequence or "[]")
        except Exception:
            return []

    @agents.setter
    def agents(self, value: List[str]):
        self.agents_sequence = json.dumps(value)

    @property
    def results(self) -> Dict[str, Any]:
        try:
            return json.loads(self.results_json or "{}")
        except Exception:
            return {}

    @results.setter
    def results(self, value: Dict[str, Any]):
        self.results_json = json.dumps(value, indent=2)


# ---------------------------------------------------------------------------
# Database Initialization
# ---------------------------------------------------------------------------

def init_db():
    """Create all tables."""
    Base.metadata.create_all(bind=engine)


def get_db() -> Session:
    """Get a database session."""
    return SessionLocal()


# ---------------------------------------------------------------------------
# Client CRUD
# ---------------------------------------------------------------------------

def create_client(
    name: str,
    website_url: str,
    industry: str = "",
    location: str = "",
    notes: str = "",
) -> Client:
    db = get_db()
    try:
        client = Client(
            name=name,
            website_url=website_url,
            industry=industry,
            location=location,
            notes=notes,
        )
        db.add(client)
        db.commit()
        db.refresh(client)
        return client
    finally:
        db.close()


def get_all_clients() -> List[Dict[str, Any]]:
    db = get_db()
    try:
        clients = db.query(Client).order_by(Client.created_at.desc()).all()
        return [
            {
                "id": c.id,
                "name": c.name,
                "website_url": c.website_url,
                "industry": c.industry,
                "location": c.location,
                "created_at": c.created_at.isoformat() if c.created_at else "",
            }
            for c in clients
        ]
    finally:
        db.close()


def get_client_by_id(client_id: int) -> Optional[Dict[str, Any]]:
    db = get_db()
    try:
        c = db.query(Client).filter(Client.id == client_id).first()
        if not c:
            return None
        return {
            "id": c.id,
            "name": c.name,
            "website_url": c.website_url,
            "industry": c.industry,
            "location": c.location,
            "notes": c.notes,
            "created_at": c.created_at.isoformat() if c.created_at else "",
        }
    finally:
        db.close()


def update_client(client_id: int, **kwargs) -> bool:
    db = get_db()
    try:
        client = db.query(Client).filter(Client.id == client_id).first()
        if not client:
            return False
        for k, v in kwargs.items():
            if hasattr(client, k):
                setattr(client, k, v)
        client.updated_at = datetime.utcnow()
        db.commit()
        return True
    finally:
        db.close()


def delete_client(client_id: int) -> bool:
    db = get_db()
    try:
        client = db.query(Client).filter(Client.id == client_id).first()
        if not client:
            return False
        db.delete(client)
        db.commit()
        return True
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Research CRUD
# ---------------------------------------------------------------------------

def save_research(
    client_id: int,
    url: str,
    scraped_markdown: str,
    research_data: Dict[str, Any],
    deep_crawl: bool = False,
    pages_crawled: int = 1,
    credits_used: int = 0,
    claude_tokens: int = 0,
    scrape_source: str = "firecrawl",
) -> Research:
    db = get_db()
    try:
        research = Research(
            client_id=client_id,
            url=url,
            scraped_markdown=scraped_markdown,
            deep_crawl=deep_crawl,
            pages_crawled=pages_crawled,
            credits_used=credits_used,
            claude_tokens=claude_tokens,
            scrape_source=scrape_source,
        )
        research.research_data = research_data
        db.add(research)
        db.commit()
        db.refresh(research)
        return research
    finally:
        db.close()


def get_research_for_client(client_id: int) -> List[Dict[str, Any]]:
    db = get_db()
    try:
        rows = (
            db.query(Research)
            .filter(Research.client_id == client_id)
            .order_by(Research.created_at.desc())
            .all()
        )
        return [
            {
                "id": r.id,
                "url": r.url,
                "deep_crawl": r.deep_crawl,
                "pages_crawled": r.pages_crawled,
                "credits_used": r.credits_used,
                "research_data": r.research_data,
                "scraped_markdown": r.scraped_markdown,
                "created_at": r.created_at.isoformat() if r.created_at else "",
            }
            for r in rows
        ]
    finally:
        db.close()


def get_latest_research(client_id: int) -> Optional[Dict[str, Any]]:
    rows = get_research_for_client(client_id)
    return rows[0] if rows else None


# ---------------------------------------------------------------------------
# Proposal CRUD
# ---------------------------------------------------------------------------

def save_proposal(
    client_id: int,
    content_markdown: str,
    research_id: Optional[int] = None,
    agency_name: str = "",
    setup_fee: str = "2,500",
    monthly_retainer: str = "1,500",
    performance_bonus: str = "10% of incremental revenue",
    custom_notes: str = "",
    pdf_path: str = "",
) -> Proposal:
    db = get_db()
    try:
        proposal = Proposal(
            client_id=client_id,
            research_id=research_id,
            agency_name=agency_name,
            content_markdown=content_markdown,
            setup_fee=setup_fee,
            monthly_retainer=monthly_retainer,
            performance_bonus=performance_bonus,
            custom_notes=custom_notes,
            pdf_path=pdf_path,
        )
        db.add(proposal)
        db.commit()
        db.refresh(proposal)
        return proposal
    finally:
        db.close()


def get_proposals_for_client(client_id: int) -> List[Dict[str, Any]]:
    db = get_db()
    try:
        rows = (
            db.query(Proposal)
            .filter(Proposal.client_id == client_id)
            .order_by(Proposal.created_at.desc())
            .all()
        )
        return [
            {
                "id": p.id,
                "title": p.title,
                "content_markdown": p.content_markdown,
                "agency_name": p.agency_name,
                "setup_fee": p.setup_fee,
                "monthly_retainer": p.monthly_retainer,
                "performance_bonus": p.performance_bonus,
                "custom_notes": p.custom_notes,
                "pdf_path": p.pdf_path,
                "created_at": p.created_at.isoformat() if p.created_at else "",
            }
            for p in rows
        ]
    finally:
        db.close()


def update_proposal_pdf(proposal_id: int, pdf_path: str) -> bool:
    db = get_db()
    try:
        p = db.query(Proposal).filter(Proposal.id == proposal_id).first()
        if not p:
            return False
        p.pdf_path = pdf_path
        p.updated_at = datetime.utcnow()
        db.commit()
        return True
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Agent Run CRUD
# ---------------------------------------------------------------------------

def save_agent_run(
    agent_type: str,
    agent_name: str,
    output: str,
    input_data: Dict[str, Any] = None,
    client_id: Optional[int] = None,
    tokens_used: int = 0,
    status: str = "done",
) -> AgentRun:
    db = get_db()
    try:
        run = AgentRun(
            client_id=client_id,
            agent_type=agent_type,
            agent_name=agent_name,
            output_data=output,
            tokens_used=tokens_used,
            status=status,
            completed_at=datetime.utcnow(),
        )
        run.input = input_data or {}
        db.add(run)
        db.commit()
        db.refresh(run)
        return run
    finally:
        db.close()


def get_all_agent_runs(limit: int = 100) -> List[Dict[str, Any]]:
    """Return the most recent agent runs across ALL clients, newest first."""
    db = get_db()
    try:
        runs = (
            db.query(AgentRun)
            .order_by(AgentRun.completed_at.desc())
            .limit(limit)
            .all()
        )
        result = []
        for r in runs:
            input_data = {}
            try:
                if r.input:
                    input_data = r.input if isinstance(r.input, dict) else json.loads(r.input)
            except Exception:
                pass
            result.append({
                "id":         r.id,
                "client_id":  r.client_id,
                "agent_type": r.agent_type,
                "agent_name": r.agent_name or r.agent_type,
                "output":     r.output_data or "",
                "task":       input_data.get("task", ""),
                "timestamp":  r.completed_at.strftime("%Y-%m-%d %H:%M") if r.completed_at else "",
                "status":     r.status,
            })
        return result
    finally:
        db.close()


def get_agent_runs_by_client(client_id: int, limit: int = 20) -> List[Dict[str, Any]]:
    """Return the most recent agent runs for a client, newest first."""
    db = get_db()
    try:
        runs = (
            db.query(AgentRun)
            .filter(AgentRun.client_id == client_id)
            .order_by(AgentRun.completed_at.desc())
            .limit(limit)
            .all()
        )
        result = []
        for r in runs:
            input_data = {}
            try:
                if r.input:
                    input_data = json.loads(r.input) if isinstance(r.input, str) else r.input
            except Exception:
                pass
            result.append({
                "id": r.id,
                "agent_type": r.agent_type,
                "agent_name": r.agent_name or r.agent_type,
                "output": r.output_data or "",
                "task": input_data.get("task", ""),
                "timestamp": r.completed_at.strftime("%Y-%m-%d %H:%M") if r.completed_at else "",
                "status": r.status,
            })
        return result
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Workflow Run CRUD
# ---------------------------------------------------------------------------

def save_workflow_run(
    agents: List[str],
    results: Dict[str, Any],
    name: str = "Custom Workflow",
    client_id: Optional[int] = None,
    total_tokens: int = 0,
    status: str = "done",
) -> WorkflowRun:
    db = get_db()
    try:
        run = WorkflowRun(
            client_id=client_id,
            name=name,
            status=status,
            total_tokens=total_tokens,
            completed_at=datetime.utcnow(),
        )
        run.agents = agents
        run.results = results
        db.add(run)
        db.commit()
        db.refresh(run)
        return run
    finally:
        db.close()


# Initialize DB on import
init_db()
