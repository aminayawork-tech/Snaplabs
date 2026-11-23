// Builds a Markdown research pack from social listening + content discovery results, laid out as blog briefs.

interface ListenLike {
  platform: string;
  data_source: string;
  topic?: string;
  posts: { title: string; community: string; url: string; num_comments: number; score: number }[];
  sentiment_summary: { summary: string; overall: string };
  key_themes: string[];
  pain_points: { point: string; quote: string; url: string | null }[];
  questions: string[];
  content_ideas: { title: string; format: string; why: string }[];
  opportunities: string[];
  search_questions: string[];
}

interface ContentLike {
  ideas?: { title: string; platform: string; hook: string }[];
  best_angles?: string[];
  content_gaps?: string[];
  trending_topics?: string[];
  top_formats?: string[];
  questions?: string[];
  top_content?: { title: string; platform: string; url: string; metric: string }[];
}

const LABELS: Record<string, string> = {
  reddit: "Reddit", youtube: "YouTube", bluesky: "Bluesky", hackernews: "Hacker News",
  x: "X", tiktok: "TikTok", facebook: "Facebook",
};

const uniq = (items: string[]) => {
  const seen = new Set<string>();
  return items.filter((i) => {
    const k = i.trim().toLowerCase();
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70);
const clean = (s: string) => s.replace(/\s+/g, " ").trim();

// Pick the questions that share the most meaningful words with a title. The search keyword's own
// words appear in nearly everything, so they don't count as a match.
let ignored = new Set<string>();
function related(title: string, questions: string[], n = 3): string[] {
  const words = new Set((title.toLowerCase().match(/[a-z]{4,}/g) ?? []).filter((w) => !ignored.has(w)));
  return questions
    .map((q) => ({ q, score: (q.toLowerCase().match(/[a-z]{4,}/g) ?? []).filter((w) => words.has(w)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((x) => x.q);
}

export function buildResearchMarkdown(keyword: string, results: Partial<Record<string, ListenLike>>, content: ContentLike | null): string {
  const platforms = Object.values(results).filter(Boolean) as ListenLike[];
  ignored = new Set([
    ...(keyword.toLowerCase().match(/[a-z]{4,}/g) ?? []),
    ...platforms.flatMap((p) => p.topic?.toLowerCase().match(/[a-z]{4,}/g) ?? []),
    "what", "when", "where", "which", "with", "your", "that", "this", "from", "have", "does", "should", "best", "about",
  ]);
  const date = new Date().toISOString().slice(0, 10);
  const allQuestions = uniq([
    ...platforms.flatMap((p) => p.questions),
    ...(content?.questions ?? []),
    ...platforms.flatMap((p) => p.search_questions),
  ]);
  const painPoints = platforms.flatMap((p) => p.pain_points.map((pp) => ({ ...pp, platform: p.platform })));

  const ideas = [
    ...platforms.flatMap((p) => p.content_ideas.map((c) => ({ title: c.title, format: c.format, angle: c.why, hook: "", platform: LABELS[p.platform] ?? p.platform }))),
    ...(content?.ideas ?? []).map((c) => ({ title: c.title, format: c.platform, angle: "", hook: c.hook, platform: "Content Discovery" })),
  ].filter((i, idx, arr) => arr.findIndex((x) => x.title.toLowerCase() === i.title.toLowerCase()) === idx);

  const out: string[] = [];
  out.push(`# Content Research: ${keyword}`, "");
  out.push(`_Exported from Snappymarketer on ${date} · Sources: ${platforms.map((p) => `${LABELS[p.platform] ?? p.platform}${p.data_source === "live" ? " (live)" : " (estimated)"}`).join(", ") || "none"}${content ? ", Content Discovery" : ""}_`, "");
  const topics = uniq(platforms.map((p) => p.topic ?? "").filter((t) => t && t.toLowerCase() !== keyword.toLowerCase()));
  if (topics.length) out.push(`> Note: "${keyword}" had little data of its own, so parts of this research cover the broader topic: ${topics.join(", ")}.`, "");

  if (ideas.length) {
    out.push("## Blog Post Briefs", "", `${ideas.length} ideas drawn from what people are actually saying. Each one is ready to brief or write.`, "");
    ideas.forEach((idea, i) => {
      const pain = painPoints.find((pp) => related(idea.title + " " + idea.angle, [pp.point], 1).length);
      const qs = related(idea.title + " " + idea.angle, allQuestions);
      out.push(`### ${i + 1}. ${clean(idea.title)}`, "");
      out.push(`- **Suggested slug:** \`${slugify(idea.title)}\``);
      out.push(`- **Format:** ${clean(idea.format)}`);
      if (idea.angle) out.push(`- **Angle / why it works:** ${clean(idea.angle)}`);
      if (idea.hook) out.push(`- **Hook:** ${clean(idea.hook)}`);
      if (pain) out.push(`- **Pain point it solves:** ${clean(pain.point)}`);
      out.push(`- **Found via:** ${idea.platform}`);
      if (qs.length) {
        out.push("- **Questions to answer in the post:**");
        qs.forEach((q) => out.push(`  - ${clean(q)}`));
      }
      out.push("");
    });
  }

  if (painPoints.length) {
    out.push("## Pain Points", "", "Each of these can anchor its own blog post.", "");
    uniq(painPoints.map((p) => p.point)).forEach((point) => {
      const pp = painPoints.find((p) => p.point === point)!;
      out.push(`### ${clean(point)}`, "");
      if (pp.quote) out.push(`> "${clean(pp.quote)}"${pp.url ? ` — [source](${pp.url})` : ""}`, "");
      out.push(`- **Seen on:** ${LABELS[pp.platform] ?? pp.platform}`);
      const qs = related(point, allQuestions);
      if (qs.length) out.push(`- **Related questions:** ${qs.map(clean).join(" · ")}`);
      out.push("");
    });
  }

  if (allQuestions.length) {
    out.push("## Questions People Ask", "", "Great for FAQ sections, H2s, or one post per question.", "");
    allQuestions.forEach((q) => out.push(`- ${clean(q)}`));
    out.push("");
  }

  if (content) {
    const section = (title: string, items?: string[]) => {
      if (!items?.length) return;
      out.push(`## ${title}`, "");
      items.forEach((i) => out.push(`- ${clean(i)}`));
      out.push("");
    };
    section("Content Gaps (Opportunities)", content.content_gaps);
    section("Best Content Angles", content.best_angles);
    section("Trending Sub-topics", content.trending_topics);
    section("Top Content Formats", content.top_formats);
  }

  const themes = uniq(platforms.flatMap((p) => p.key_themes));
  if (themes.length) out.push("## Key Themes", "", themes.map((t) => `\`${clean(t)}\``).join(" · "), "");

  const opps = uniq(platforms.flatMap((p) => p.opportunities));
  if (opps.length) {
    out.push("## Marketing Opportunities", "");
    opps.forEach((o) => out.push(`- ${clean(o)}`));
    out.push("");
  }

  if (platforms.length) {
    out.push("## Platform Summaries", "");
    platforms.forEach((p) => {
      out.push(`### ${LABELS[p.platform] ?? p.platform} (${p.data_source === "live" ? `${p.posts.length} live posts` : "estimated"})`, "");
      if (p.sentiment_summary.summary) out.push(clean(p.sentiment_summary.summary), "");
      const top = [...p.posts].sort((a, b) => b.num_comments - a.num_comments).slice(0, 5);
      if (top.length) {
        out.push("Top discussions:");
        top.forEach((post) => out.push(`- [${clean(post.title).replace(/[[\]]/g, "")}](${post.url}) — ${post.community} · ${post.num_comments} comments`));
        out.push("");
      }
    });
  }

  if (content?.top_content?.length) {
    out.push("## Top Performing Content Right Now", "");
    content.top_content.forEach((c) => out.push(`- [${clean(c.title).replace(/[[\]]/g, "")}](${c.url}) — ${c.platform} · ${c.metric}`));
    out.push("");
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

export function downloadMarkdown(filename: string, markdown: string) {
  const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
