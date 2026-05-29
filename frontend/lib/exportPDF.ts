import type { ResearchData, Competitor, QuickWin, AudiencePersona, Keyword } from "./types";

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function section(title: string, body: string): string {
  return `
    <div class="section">
      <h2>${esc(title)}</h2>
      ${body}
    </div>`;
}

function pill(text: string, color = "#f3eef8", textColor = "#6b21d6"): string {
  return `<span class="pill" style="background:${color};color:${textColor}">${esc(text)}</span>`;
}

export function exportPDF(data: ResearchData, bizName: string, score: number, pagesCrawled: number) {
  const name = data.business_name || bizName || "Marketing Audit";
  const industry = data.industry || "";
  const location = data.location || "";
  const sub = [industry, location].filter(Boolean).join(" · ");

  const scoreColor = score >= 70 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";

  const services = data.services_offered ?? [];
  const strengths = data.current_marketing_strengths ?? [];
  const gaps = data.current_marketing_gaps ?? [];
  const keywords = (data.top_10_longtail_keywords ?? []) as (string | Keyword)[];
  const techIssues = data.technical_seo_issues ?? [];
  const competitors = (data.competitor_analysis ?? data.competitors ?? []) as Competitor[];
  const wins = (data.quick_win_opportunities ?? []) as QuickWin[];
  const personas = (data.target_audience ?? []) as AudiencePersona[];
  const paa = data.people_also_ask ?? {} as Record<string, string[]>;

  const overviewBody = `
    <div class="two-col">
      <div>
        ${services.length ? `<p class="label">Services</p><ul>${services.map(s => `<li>${esc(s)}</li>`).join("")}</ul>` : ""}
        ${strengths.length ? `<p class="label" style="margin-top:12px">Strengths</p><ul>${strengths.map(s => `<li>${esc(s)}</li>`).join("")}</ul>` : ""}
      </div>
      <div>
        ${gaps.length ? `<p class="label">Marketing Gaps</p><ul>${gaps.map(g => `<li>${esc(g)}</li>`).join("")}</ul>` : ""}
      </div>
    </div>`;

  const kwBody = keywords.length ? `
    <p class="label">Long-tail Keyword Opportunities</p>
    ${keywords.map(kw => {
      const obj = typeof kw === "string" ? { keyword: kw } : kw as Keyword;
      const diff = (obj.difficulty ?? "").toLowerCase();
      const diffColor = diff === "low" ? "#dcfce7" : diff === "medium" ? "#fef3c7" : diff === "high" ? "#fee2e2" : "#f1f5f9";
      const diffText = diff === "low" ? "#15803d" : diff === "medium" ? "#92400e" : diff === "high" ? "#991b1b" : "#475569";
      return `<div class="kw-row">
        <span class="kw-text">${esc(obj.keyword)}</span>
        <div class="kw-badges">
          ${obj.monthly_searches ? `<span class="badge" style="background:#f1f5f9;color:#475569">🔍 ${esc(obj.monthly_searches)}/mo</span>` : ""}
          ${obj.difficulty ? `<span class="badge" style="background:${diffColor};color:${diffText}">${esc(obj.difficulty)} difficulty</span>` : ""}
          ${obj.intent ? `<span class="badge" style="background:#ede9fe;color:#6b21d6">${esc(obj.intent)}</span>` : ""}
        </div>
      </div>`;
    }).join("")}
    ${techIssues.length ? `<p class="label" style="margin-top:16px">Technical Issues</p><ul>${techIssues.map(t => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
    ${Object.keys(paa).length ? `<p class="label" style="margin-top:16px">People Also Ask</p>${Object.entries(paa as Record<string, string[]>).flatMap(([kw, qs]) => qs.map(q => `<div class="kw-row"><span class="kw-text">${esc(q)}</span><span class="badge" style="background:#ede9fe;color:#6b21d6">${esc(kw)}</span></div>`)).join("")}` : ""}` : "<p>No SEO data.</p>";

  const compBody = competitors.length ? competitors.map(comp => {
    if (typeof comp !== "object") return `<p>${esc(String(comp))}</p>`;
    const cName = comp.name ?? comp.competitor_name ?? "Competitor";
    const cUrl = comp.url ?? comp.website ?? "";
    const strength = comp.strengths ?? comp.key_strength ?? comp.strength ?? "";
    const weakness = comp.weaknesses ?? comp.weakness ?? "";
    const rankingKws = comp.top_ranking_keywords ?? [];
    return `<div class="card">
      <div class="card-header">
        <strong style="color:#6b21d6">${esc(cName)}</strong>
        ${comp.estimated_traffic ? `<span class="badge" style="background:#f1f5f9;color:#475569">~${esc(comp.estimated_traffic)}</span>` : ""}
      </div>
      ${cUrl ? `<div style="font-size:11px;color:#6b21d6;margin-bottom:4px">${esc(cUrl)}</div>` : ""}
      ${strength ? `<p><strong style="color:#6b21d6">Strength:</strong> ${esc(String(strength))}</p>` : ""}
      ${weakness ? `<p><strong style="color:#6b21d6">Weakness:</strong> ${esc(String(weakness))}</p>` : ""}
      ${rankingKws.length ? `<div class="pills">${rankingKws.map(k => pill(k, "#ede9fe", "#6b21d6")).join("")}</div>` : ""}
    </div>`;
  }).join("") : "<p>No competitor data.</p>";

  const winsBody = wins.length ? wins.map((w, i) => {
    if (typeof w !== "object") return `<p>${esc(String(w))}</p>`;
    const title = w.tactic ?? w.title ?? w.opportunity ?? `Win #${i + 1}`;
    const effort = (w.effort ?? "").toLowerCase();
    const effortColor = effort.includes("low") ? "#22c55e" : effort.includes("medium") ? "#f59e0b" : "#ef4444";
    const steps = w.how_to_steps ?? [];
    return `<div class="card">
      <div class="card-header">
        <strong>${i + 1}. ${esc(String(title))}</strong>
        <div>
          ${effort ? `<span class="badge" style="background:${effortColor};color:#fff">${esc(effort)} effort</span>` : ""}
          ${w.timeline ? `<span class="badge" style="background:#ede9fe;color:#6b21d6">${esc(w.timeline)}</span>` : ""}
        </div>
      </div>
      ${w.expected_impact ?? w.impact ? `<p style="color:#64748b;font-size:12px">${esc(String(w.expected_impact ?? w.impact ?? ""))}</p>` : ""}
      ${steps.length ? `<ol class="steps">${steps.map(s => `<li>${esc(s.replace(/^Step \d+:\s*/i, ""))}</li>`).join("")}</ol>` : ""}
    </div>`;
  }).join("") : "<p>No quick wins identified.</p>";

  const audienceBody = personas.length ? personas.map((p, i) => `
    <div class="card">
      <strong style="color:#6b21d6">${esc(p.persona_name ?? `Segment ${i + 1}`)}</strong>
      ${p.demographics ? `<p style="color:#64748b;font-size:12px">${esc(p.demographics)}</p>` : ""}
      ${(p.pain_points ?? []).length ? `<p><strong style="color:#6b21d6">Pain points:</strong> ${esc((p.pain_points ?? []).join(" · "))}</p>` : ""}
      ${p.where_to_reach ? `<p><strong style="color:#6b21d6">Where to reach:</strong> ${esc(p.where_to_reach)}</p>` : ""}
    </div>`).join("") : "<p>No audience data.</p>";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${esc(name)} — Marketing Audit</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1e293b; background: #fff; font-size: 13px; line-height: 1.6; }
    .page { max-width: 780px; margin: 0 auto; padding: 40px 32px; }

    /* Header */
    .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 2px solid #f3eef8; }
    .header-left h1 { font-size: 22px; font-weight: 800; color: #1e293b; }
    .header-left .sub { font-size: 12px; color: #94a3b8; margin-top: 2px; }
    .score-circle { width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 20px; font-weight: 800; flex-shrink: 0; }
    .score-label { font-size: 10px; color: #94a3b8; text-align: center; margin-top: 4px; text-transform: uppercase; letter-spacing: .05em; }

    /* KPIs */
    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 24px; }
    .kpi { border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px; text-align: center; }
    .kpi-val { font-size: 20px; font-weight: 800; color: #6b21d6; }
    .kpi-label { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: .05em; }

    /* Sections */
    .section { margin-bottom: 24px; break-inside: avoid; }
    .section h2 { font-size: 14px; font-weight: 800; color: #6b21d6; background: #f3eef8; border: 1px solid #c4a8e8; border-radius: 10px; padding: 10px 14px; margin-bottom: 12px; }
    .label { font-size: 11px; font-weight: 800; color: #6b21d6; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 6px; }
    ul { padding-left: 18px; }
    li { margin-bottom: 3px; font-size: 12px; color: #334155; }

    /* Two col */
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

    /* Cards */
    .card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; margin-bottom: 8px; break-inside: avoid; }
    .card p { font-size: 12px; color: #334155; margin-top: 4px; }
    .card-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 4px; }

    /* Keywords */
    .kw-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 5px; }
    .kw-text { font-size: 12px; font-weight: 600; color: #1e293b; flex: 1; }
    .kw-badges { display: flex; gap: 4px; flex-wrap: wrap; justify-content: flex-end; }

    /* Badges / pills */
    .badge { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 999px; white-space: nowrap; }
    .pill { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 999px; display: inline-block; margin: 2px 2px 2px 0; }
    .pills { margin-top: 6px; }

    /* Steps */
    .steps { padding-left: 16px; margin-top: 6px; }
    .steps li { font-size: 11px; color: #475569; margin-bottom: 3px; }

    /* Footer */
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { padding: 24px 20px; }
      .section { page-break-inside: avoid; }
      .card { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="header-left">
      <h1>${esc(name)}</h1>
      ${sub ? `<div class="sub">${esc(sub)}</div>` : ""}
      <div class="sub" style="margin-top:6px">Marketing Audit · Generated by Snappymarketer · ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
    </div>
    <div style="text-align:center">
      <div class="score-circle" style="background:${scoreColor}">${score}</div>
      <div class="score-label">Score /100</div>
    </div>
  </div>

  <!-- KPIs -->
  <div class="kpis">
    <div class="kpi"><div class="kpi-val">${pagesCrawled}</div><div class="kpi-label">Pages</div></div>
    <div class="kpi"><div class="kpi-val">${services.length}</div><div class="kpi-label">Services</div></div>
    <div class="kpi"><div class="kpi-val">${wins.length}</div><div class="kpi-label">Quick Wins</div></div>
    <div class="kpi"><div class="kpi-val">${competitors.length}</div><div class="kpi-label">Competitors</div></div>
  </div>

  ${section("Overview — Business, Gaps & Strengths", overviewBody)}
  ${section("SEO & Keywords", kwBody)}
  ${section("Competitors", compBody)}
  ${section("Quick Wins — Actionable Opportunities", winsBody)}
  ${section("Target Audience", audienceBody)}

  <div class="footer">
    <span>Generated by Snappymarketer · Powered by Claude + Firecrawl</span>
    <span>${new Date().toLocaleDateString()}</span>
  </div>
</div>
<script>window.onload = () => window.print();</script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
