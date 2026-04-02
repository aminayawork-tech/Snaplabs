"""
utils.py - MarketingOS Utility Functions
Firecrawl wrapper, PDF generator, API key loader, cost tracker
"""

import os
import json
import time
import tempfile
import traceback
from typing import Optional, Dict, Any, List
from datetime import datetime
import requests
from dotenv import load_dotenv

load_dotenv()


# ---------------------------------------------------------------------------
# API Key Loader
# ---------------------------------------------------------------------------

def get_anthropic_key() -> str:
    key = os.getenv("ANTHROPIC_API_KEY", "")
    if not key:
        raise ValueError("ANTHROPIC_API_KEY not set. Add it to your .env file.")
    return key


def get_firecrawl_key() -> str:
    key = os.getenv("FIRECRAWL_API_KEY", "")
    if not key:
        raise ValueError("FIRECRAWL_API_KEY not set. Add it to your .env file.")
    return key


def get_agency_info() -> Dict[str, str]:
    return {
        "name": os.getenv("AGENCY_NAME", "SnapLabs"),
        "email": os.getenv("AGENCY_EMAIL", "hello@snaplabs.ai"),
        "phone": os.getenv("AGENCY_PHONE", "+1 (555) 000-0000"),
        "website": os.getenv("AGENCY_WEBSITE", "https://snaplabs.ai"),
    }


def get_claude_model() -> str:
    return os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6")


# ---------------------------------------------------------------------------
# Cost Tracker (in-memory singleton via module-level dict)
# ---------------------------------------------------------------------------

_cost_tracker = {
    "claude_input_tokens": 0,
    "claude_output_tokens": 0,
    "firecrawl_credits": 0,
    "calls": 0,
    "session_start": datetime.now().isoformat(),
}

# Approximate pricing (as of 2025)
CLAUDE_INPUT_COST_PER_1K = 0.003   # $/1K input tokens (Sonnet)
CLAUDE_OUTPUT_COST_PER_1K = 0.015  # $/1K output tokens
FIRECRAWL_COST_PER_CREDIT = 0.001  # ~$1/1000 credits


def track_claude_usage(input_tokens: int, output_tokens: int):
    _cost_tracker["claude_input_tokens"] += input_tokens
    _cost_tracker["claude_output_tokens"] += output_tokens
    _cost_tracker["calls"] += 1


def track_firecrawl_usage(pages: int = 1):
    _cost_tracker["firecrawl_credits"] += pages


def get_cost_summary() -> Dict[str, Any]:
    claude_cost = (
        (_cost_tracker["claude_input_tokens"] / 1000) * CLAUDE_INPUT_COST_PER_1K
        + (_cost_tracker["claude_output_tokens"] / 1000) * CLAUDE_OUTPUT_COST_PER_1K
    )
    firecrawl_cost = _cost_tracker["firecrawl_credits"] * FIRECRAWL_COST_PER_CREDIT
    return {
        **_cost_tracker,
        "claude_cost_usd": round(claude_cost, 4),
        "firecrawl_cost_usd": round(firecrawl_cost, 4),
        "total_cost_usd": round(claude_cost + firecrawl_cost, 4),
    }


def reset_cost_tracker():
    _cost_tracker.update({
        "claude_input_tokens": 0,
        "claude_output_tokens": 0,
        "firecrawl_credits": 0,
        "calls": 0,
        "session_start": datetime.now().isoformat(),
    })


# ---------------------------------------------------------------------------
# Firecrawl Wrapper
# ---------------------------------------------------------------------------

class FirecrawlWrapper:
    """
    Wraps the firecrawl-py SDK with error handling, credit tracking,
    and a fallback to requests + BeautifulSoup.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or get_firecrawl_key()
        self._client = None
        self._sdk_available = False
        self._init_client()

    def _init_client(self):
        try:
            from firecrawl import FirecrawlApp
            self._client = FirecrawlApp(api_key=self.api_key)
            self._sdk_available = True
        except ImportError:
            self._sdk_available = False

    # --- Single page scrape ---
    def scrape(self, url: str, only_main_content: bool = True) -> Dict[str, Any]:
        """
        Scrape a single URL. Returns dict with keys:
          success, markdown, html, links, metadata, credits_used, source
        """
        if self._sdk_available:
            return self._scrape_sdk(url, only_main_content)
        return self._scrape_fallback(url)

    def _scrape_sdk(self, url: str, only_main_content: bool) -> Dict[str, Any]:
        try:
            result = self._client.scrape_url(
                url,
                params={
                    "formats": ["markdown", "html", "links"],
                    "onlyMainContent": only_main_content,
                },
            )
            track_firecrawl_usage(1)
            markdown = result.get("markdown", "") or ""
            html = result.get("html", "") or ""
            links = result.get("links", []) or []
            metadata = result.get("metadata", {}) or {}
            return {
                "success": True,
                "markdown": markdown,
                "html": html,
                "links": links[:50],
                "metadata": metadata,
                "credits_used": 1,
                "source": "firecrawl_sdk",
                "url": url,
            }
        except Exception as e:
            return self._scrape_fallback(url, prior_error=str(e))

    def _scrape_fallback(self, url: str, prior_error: str = "") -> Dict[str, Any]:
        """Basic requests + BeautifulSoup fallback."""
        try:
            from bs4 import BeautifulSoup
            headers = {
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                )
            }
            resp = requests.get(url, headers=headers, timeout=20)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")

            # Remove non-content tags
            for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
                tag.decompose()

            text = soup.get_text(separator="\n", strip=True)
            links = [a.get("href", "") for a in soup.find_all("a", href=True)][:50]

            return {
                "success": True,
                "markdown": text,
                "html": resp.text[:20000],
                "links": links,
                "metadata": {"title": soup.title.string if soup.title else ""},
                "credits_used": 0,
                "source": "requests_fallback",
                "url": url,
                "fallback_note": f"Used fallback scraper. Prior error: {prior_error}",
            }
        except Exception as e:
            return {
                "success": False,
                "markdown": "",
                "html": "",
                "links": [],
                "metadata": {},
                "credits_used": 0,
                "source": "failed",
                "url": url,
                "error": str(e),
            }

    # --- Full site crawl ---
    def crawl(
        self,
        url: str,
        limit: int = 10,
        only_main_content: bool = True,
    ) -> Dict[str, Any]:
        """
        Crawl multiple pages of a site. Returns aggregated markdown.
        limit=10-15 recommended to keep credit usage reasonable.
        """
        if self._sdk_available:
            return self._crawl_sdk(url, limit, only_main_content)
        # Fallback: just scrape the root
        result = self._scrape_fallback(url)
        result["pages_crawled"] = 1
        return result

    def _crawl_sdk(self, url: str, limit: int, only_main_content: bool) -> Dict[str, Any]:
        try:
            job = self._client.crawl_url(
                url,
                params={
                    "limit": limit,
                    "scrapeOptions": {
                        "formats": ["markdown"],
                        "onlyMainContent": only_main_content,
                    },
                },
                wait_until_done=True,
                timeout=90,
            )

            pages = job.get("data", []) if isinstance(job, dict) else []
            if not pages and hasattr(job, "__iter__"):
                pages = list(job)

            pages_crawled = len(pages)
            track_firecrawl_usage(pages_crawled)

            combined_markdown = ""
            for page in pages:
                if isinstance(page, dict):
                    md = page.get("markdown", "") or ""
                    meta = page.get("metadata", {}) or {}
                    page_url = meta.get("url", "")
                    if md:
                        combined_markdown += f"\n\n---\n### Page: {page_url}\n{md}"

            return {
                "success": True,
                "markdown": combined_markdown,
                "pages_crawled": pages_crawled,
                "credits_used": pages_crawled,
                "source": "firecrawl_crawl",
                "url": url,
            }
        except Exception as e:
            # Degrade to single scrape
            result = self._scrape_sdk(url, only_main_content)
            result["pages_crawled"] = 1
            result["crawl_error"] = str(e)
            return result


# ---------------------------------------------------------------------------
# Claude Helper
# ---------------------------------------------------------------------------

def call_claude(
    prompt: str,
    system: str = "",
    model: Optional[str] = None,
    max_tokens: int = 4096,
    temperature: float = 0.3,
    retries: int = 3,
) -> str:
    """
    Simple Claude API call with retry logic.
    Raises a descriptive RuntimeError on failure.
    """
    import anthropic
    import httpx

    api_key = get_anthropic_key()
    if not api_key or api_key.startswith("your_"):
        raise RuntimeError(
            "ANTHROPIC_API_KEY is not configured. "
            "Add it to your Railway environment variables: Settings → Variables."
        )

    # Explicit httpx client with generous timeout for Railway
    http_client = httpx.Client(timeout=httpx.Timeout(120.0, connect=15.0))
    client = anthropic.Anthropic(api_key=api_key, http_client=http_client)
    model = model or get_claude_model()

    messages = [{"role": "user", "content": prompt}]
    kwargs = {
        "model": model,
        "max_tokens": max_tokens,
        "messages": messages,
        "temperature": temperature,
    }
    if system:
        kwargs["system"] = system

    last_err = None
    for attempt in range(retries):
        try:
            response = client.messages.create(**kwargs)
            track_claude_usage(
                response.usage.input_tokens,
                response.usage.output_tokens,
            )
            return response.content[0].text
        except anthropic.AuthenticationError:
            raise RuntimeError(
                "Claude API key is invalid or expired. "
                "Check ANTHROPIC_API_KEY in Railway → Settings → Variables."
            )
        except anthropic.RateLimitError:
            raise RuntimeError(
                "Claude API rate limit reached. Wait a moment and try again."
            )
        except (httpx.ConnectError, httpx.TimeoutException, anthropic.APIConnectionError) as e:
            last_err = e
            if attempt < retries - 1:
                time.sleep(2 ** attempt)   # 1s, 2s, 4s backoff
                continue
            raise RuntimeError(
                f"Could not connect to Claude API after {retries} attempts. "
                f"Check your internet/firewall, or verify the API key. Detail: {e}"
            )
        except anthropic.APIStatusError as e:
            raise RuntimeError(f"Claude API error {e.status_code}: {e.message}")
        except Exception as e:
            raise RuntimeError(f"Unexpected Claude error: {e}")
    raise RuntimeError(f"Claude call failed after {retries} retries: {last_err}")


def call_claude_json(
    prompt: str,
    system: str = "",
    model: Optional[str] = None,
    max_tokens: int = 4096,
) -> Dict[str, Any]:
    """
    Call Claude expecting a JSON response. Strips markdown fences if present.
    Returns parsed dict. On parse failure returns {"error": ..., "raw": ...}
    """
    raw = call_claude(prompt, system=system, model=model, max_tokens=max_tokens)
    # Strip ```json ... ``` fences
    text = raw.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        # Remove first and last fence lines
        text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to find JSON object in the text
        import re
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except Exception:
                pass
        return {"error": "JSON parse failed", "raw": raw}


# ---------------------------------------------------------------------------
# PDF Generator
# ---------------------------------------------------------------------------

def markdown_to_pdf(markdown_text: str, output_path: Optional[str] = None) -> Optional[str]:
    """
    Convert markdown text to a PDF file.
    Returns the path to the generated PDF, or None on failure.
    Tries multiple backends in order: weasyprint → reportlab fallback.
    """
    if output_path is None:
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        output_path = tmp.name
        tmp.close()

    # Method 1: weasyprint (best quality)
    try:
        import markdown as md_lib
        from weasyprint import HTML, CSS

        html_body = md_lib.markdown(
            markdown_text,
            extensions=["tables", "fenced_code", "nl2br"],
        )
        full_html = f"""
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body {{
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 12px;
    line-height: 1.6;
    color: #1a1a2e;
    max-width: 800px;
    margin: 0 auto;
    padding: 40px;
  }}
  h1 {{ color: #4f46e5; font-size: 24px; border-bottom: 3px solid #4f46e5; padding-bottom: 8px; }}
  h2 {{ color: #3730a3; font-size: 18px; margin-top: 24px; }}
  h3 {{ color: #312e81; font-size: 14px; }}
  table {{ border-collapse: collapse; width: 100%; margin: 16px 0; }}
  th {{ background: #4f46e5; color: white; padding: 8px; text-align: left; }}
  td {{ border: 1px solid #e5e7eb; padding: 8px; }}
  tr:nth-child(even) {{ background: #f8fafc; }}
  code {{ background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; }}
  pre {{ background: #1e293b; color: #f8fafc; padding: 16px; border-radius: 8px; overflow-x: auto; }}
  blockquote {{ border-left: 4px solid #4f46e5; padding-left: 16px; color: #475569; margin: 16px 0; }}
  hr {{ border: none; border-top: 2px solid #e5e7eb; margin: 24px 0; }}
  .page-break {{ page-break-before: always; }}
</style>
</head>
<body>
{html_body}
</body>
</html>
"""
        HTML(string=full_html).write_pdf(output_path)
        return output_path
    except Exception as e_weasy:
        pass

    # Method 2: reportlab fallback
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
        from reportlab.lib.enums import TA_LEFT, TA_CENTER

        doc = SimpleDocTemplate(
            output_path,
            pagesize=letter,
            leftMargin=inch,
            rightMargin=inch,
            topMargin=inch,
            bottomMargin=inch,
        )
        styles = getSampleStyleSheet()

        # Custom styles
        title_style = ParagraphStyle(
            "CustomTitle",
            parent=styles["Title"],
            fontSize=22,
            textColor=colors.HexColor("#4f46e5"),
            spaceAfter=12,
        )
        h2_style = ParagraphStyle(
            "CustomH2",
            parent=styles["Heading2"],
            fontSize=16,
            textColor=colors.HexColor("#3730a3"),
            spaceAfter=8,
        )
        body_style = ParagraphStyle(
            "CustomBody",
            parent=styles["Normal"],
            fontSize=11,
            leading=16,
            spaceAfter=6,
        )

        story = []
        for line in markdown_text.split("\n"):
            line = line.strip()
            if not line:
                story.append(Spacer(1, 8))
            elif line.startswith("# "):
                story.append(Paragraph(line[2:], title_style))
                story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#4f46e5")))
                story.append(Spacer(1, 8))
            elif line.startswith("## "):
                story.append(Spacer(1, 12))
                story.append(Paragraph(line[3:], h2_style))
            elif line.startswith("### "):
                story.append(Paragraph(f"<b>{line[4:]}</b>", body_style))
            elif line.startswith("- ") or line.startswith("* "):
                story.append(Paragraph(f"• {line[2:]}", body_style))
            else:
                # Escape XML special chars
                safe = line.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                story.append(Paragraph(safe, body_style))

        doc.build(story)
        return output_path
    except Exception as e_rl:
        return None


def read_pdf_bytes(path: str) -> Optional[bytes]:
    """Read a PDF file and return its bytes."""
    try:
        with open(path, "rb") as f:
            return f.read()
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Misc Helpers
# ---------------------------------------------------------------------------

def truncate_text(text: str, max_chars: int = 12000) -> str:
    """Truncate text to avoid exceeding Claude's context."""
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + f"\n\n[...truncated at {max_chars} chars...]"


def safe_json_loads(text: str, default: Any = None) -> Any:
    """Try to parse JSON, return default on failure."""
    try:
        return json.loads(text)
    except Exception:
        return default


def format_timestamp(dt: Optional[datetime] = None) -> str:
    if dt is None:
        dt = datetime.now()
    return dt.strftime("%Y-%m-%d %H:%M")


def sanitize_filename(name: str) -> str:
    """Make a string safe for use as a filename."""
    import re
    return re.sub(r"[^\w\-_\. ]", "_", name).strip()
