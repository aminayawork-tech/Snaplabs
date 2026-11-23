function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function inline(s: string): string {
  return esc(s)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" style="color:#275fe8">$1</a>')
    .replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

// Minimal Markdown → HTML for email bodies (headings, paragraphs, lists, bold/italic, links).
export function markdownToHtml(md: string): string {
  const blocks = md.trim().split(/\n{2,}/);
  const html = blocks.map((block) => {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return "";
    const h = lines[0].match(/^(#{1,6})\s+(.+)/);
    if (h && lines.length === 1) {
      const size = h[1].length <= 2 ? 22 : 18;
      return `<h2 style="font-size:${size}px;margin:24px 0 8px">${inline(h[2])}</h2>`;
    }
    if (lines.every((l) => /^[-*•]\s/.test(l))) {
      return `<ul>${lines.map((l) => `<li>${inline(l.replace(/^[-*•]\s/, ""))}</li>`).join("")}</ul>`;
    }
    if (lines.every((l) => /^\d+\.\s/.test(l))) {
      return `<ol>${lines.map((l) => `<li>${inline(l.replace(/^\d+\.\s/, ""))}</li>`).join("")}</ol>`;
    }
    return `<p style="margin:0 0 16px">${lines.map(inline).join("<br>")}</p>`;
  });
  return `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#1e293b;max-width:600px;margin:0 auto;padding:24px">${html.join("\n")}</div>`;
}
