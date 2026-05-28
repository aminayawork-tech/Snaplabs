import React from "react";

function inlineMarkdown(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i}>{p.slice(2, -2)}</strong>
      : p
  );
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

    // Heading
    if (/^#{1,3} /.test(lines[0])) {
      const clean = lines[0].replace(/^#{1,3} /, "");
      return <p key={bi} className="font-bold text-slate-800 mt-3 mb-0.5">{inlineMarkdown(clean)}</p>;
    }

    // HR
    if (lines[0].trim() === "---") {
      return <hr key={bi} className="border-slate-200 my-2" />;
    }

    // Blockquote
    if (lines.every((l) => l.startsWith("> "))) {
      return (
        <blockquote key={bi} className="border-l-2 border-[#c4a8e8] pl-3 text-slate-600 my-1">
          {inlineMarkdown(lines.map((l) => l.slice(2)).join(" "))}
        </blockquote>
      );
    }

    // Bullet list
    const isBullets = lines.every((l) => /^[-*] /.test(l.trim()) || l.trim() === "");
    if (isBullets) {
      return (
        <ul key={bi} className="list-disc list-inside space-y-1 my-1">
          {lines.filter((l) => l.trim()).map((l, i) => (
            <li key={i}>{inlineMarkdown(l.replace(/^[-*] /, ""))}</li>
          ))}
        </ul>
      );
    }

    // Numbered list
    const isNumbered = lines.every((l) => /^\d+\. /.test(l.trim()) || l.trim() === "");
    if (isNumbered) {
      return (
        <ol key={bi} className="list-decimal list-inside space-y-1 my-1">
          {lines.filter((l) => l.trim()).map((l, i) => (
            <li key={i}>{inlineMarkdown(l.replace(/^\d+\. /, ""))}</li>
          ))}
        </ol>
      );
    }

    // Wide/pre-formatted content (ASCII art, tables — lines with lots of | or spaces)
    const looksPreformatted = lines.some((l) => (l.match(/\|/g) ?? []).length > 2 || l.startsWith("│") || l.startsWith("+--"));
    if (looksPreformatted) {
      return (
        <pre key={bi} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs overflow-x-auto my-1 whitespace-pre">
          {block}
        </pre>
      );
    }

    return <p key={bi} className="my-1">{inlineMarkdown(block)}</p>;
  });
}
