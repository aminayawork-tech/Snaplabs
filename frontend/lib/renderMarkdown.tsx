import React from "react";

function inlineMarkdown(text: string): React.ReactNode[] {
  // Handle bold+italic, bold, italic, inline code
  const parts = text.split(/(`[^`]+`|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("```") || p.startsWith("`") && p.endsWith("`"))
      return <code key={i} className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono">{p.slice(1, -1)}</code>;
    if (p.startsWith("***") && p.endsWith("***"))
      return <strong key={i}><em>{p.slice(3, -3)}</em></strong>;
    if (p.startsWith("**") && p.endsWith("**"))
      return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("*") && p.endsWith("*"))
      return <em key={i}>{p.slice(1, -1)}</em>;
    return p;
  });
}

// Strip any number of leading `> ` blockquote markers
function stripBlockquote(line: string): string {
  return line.replace(/^(>\s*)+/, "").trim();
}

export function renderMarkdown(text: string): React.ReactNode {
  const blocks = text.split(/\n{2,}/);
  return blocks.map((block, bi) => {
    const lines = block.split("\n");

    // Fenced code block
    if (lines[0].trim().startsWith("```")) {
      const inner = lines.slice(1, lines[lines.length - 1].trim() === "```" ? -1 : undefined).join("\n");
      return (
        <pre key={bi} className="bg-slate-100 rounded-lg px-3 py-2 text-xs overflow-x-auto my-1 whitespace-pre">
          {inner}
        </pre>
      );
    }

    // Heading h1–h6
    const headingMatch = lines[0].match(/^(#{1,6}) (.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      const sizeClass =
        level === 1 ? "text-base font-extrabold text-slate-900 mt-4 mb-1" :
        level === 2 ? "text-sm font-bold text-slate-800 mt-3 mb-0.5" :
                     "text-sm font-semibold text-slate-700 mt-2 mb-0.5";
      return <p key={bi} className={sizeClass}>{inlineMarkdown(content)}</p>;
    }

    // HR
    if (lines[0].trim() === "---" || lines[0].trim() === "***") {
      return <hr key={bi} className="border-slate-200 my-3" />;
    }

    // Blockquote (handles > and > > etc.)
    if (lines.every((l) => /^>\s/.test(l.trim()) || l.trim() === "")) {
      return (
        <blockquote key={bi} className="border-l-2 border-[#bfdbfe] pl-3 text-slate-600 my-1 space-y-1">
          {lines.filter(l => l.trim()).map((l, i) => (
            <p key={i}>{inlineMarkdown(stripBlockquote(l))}</p>
          ))}
        </blockquote>
      );
    }

    // Bullet list
    const isBullets = lines.every((l) => /^[-*•] /.test(l.trim()) || l.trim() === "");
    if (isBullets) {
      return (
        <ul key={bi} className="list-disc list-inside space-y-1 my-1 text-slate-700">
          {lines.filter((l) => l.trim()).map((l, i) => (
            <li key={i}>{inlineMarkdown(l.replace(/^[-*•]\s/, ""))}</li>
          ))}
        </ul>
      );
    }

    // Numbered list
    const isNumbered = lines.every((l) => /^\d+\.\s/.test(l.trim()) || l.trim() === "");
    if (isNumbered) {
      return (
        <ol key={bi} className="list-decimal list-inside space-y-1 my-1 text-slate-700">
          {lines.filter((l) => l.trim()).map((l, i) => (
            <li key={i}>{inlineMarkdown(l.replace(/^\d+\.\s/, ""))}</li>
          ))}
        </ol>
      );
    }

    // Wide/pre-formatted content (ASCII art, tables)
    const looksPreformatted = lines.some((l) => (l.match(/\|/g) ?? []).length > 2 || l.startsWith("│") || l.startsWith("+--"));
    if (looksPreformatted) {
      return (
        <pre key={bi} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs overflow-x-auto my-1 whitespace-pre">
          {block}
        </pre>
      );
    }

    return <p key={bi} className="my-1 text-slate-700">{inlineMarkdown(block)}</p>;
  });
}
