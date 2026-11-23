import React from "react";

function inlineMarkdown(text: string): React.ReactNode[] {
  const parts = text.split(/(`[^`]+`|\[[^\]]+\]\(https?:\/\/[^\s)]+\)|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("`") && p.endsWith("`") && p.length > 1)
      return <code key={i} className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono">{p.slice(1, -1)}</code>;
    const link = p.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (link)
      return <a key={i} href={link[2]} target="_blank" rel="noopener noreferrer" className="text-[#275fe8] underline underline-offset-2">{link[1]}</a>;
    if (p.startsWith("***") && p.endsWith("***") && p.length > 6)
      return <strong key={i}><em>{p.slice(3, -3)}</em></strong>;
    if (p.startsWith("**") && p.endsWith("**") && p.length > 4)
      return <strong key={i} className="font-semibold text-slate-900">{p.slice(2, -2)}</strong>;
    if (p.startsWith("*") && p.endsWith("*") && p.length > 2)
      return <em key={i}>{p.slice(1, -1)}</em>;
    return p;
  });
}

const cells = (line: string) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
const BULLET = /^\s*[-*•]\s+/;
const NUMBER = /^\s*\d+[.)]\s+/;

export function renderMarkdown(text: string): React.ReactNode {
  const lines = text.replace(/\r/g, "").split("\n");
  const out: React.ReactNode[] = [];
  let i = 0;
  const key = () => out.length;

  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();

    if (!t) { i++; continue; }

    if (t.startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) code.push(lines[i++]);
      i++;
      out.push(<pre key={key()} className="bg-slate-100 rounded-lg px-3 py-2 text-xs overflow-x-auto my-2 whitespace-pre">{code.join("\n")}</pre>);
      continue;
    }

    const h = t.match(/^(#{1,6})\s+(.+)/);
    if (h) {
      const level = h[1].length;
      const cls =
        level === 1 ? "text-base font-extrabold text-slate-900 mt-5 mb-2" :
        level === 2 ? "text-[0.9375rem] font-bold text-slate-900 mt-5 mb-2" :
                      "text-sm font-bold text-slate-800 mt-4 mb-1.5";
      out.push(<p key={key()} className={cls}>{inlineMarkdown(h[2].replace(/\*\*/g, ""))}</p>);
      i++;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) {
      out.push(<hr key={key()} className="border-slate-200 my-4" />);
      i++;
      continue;
    }

    if (t.startsWith("|") && i + 1 < lines.length && /^\|?\s*:?-{2,}/.test(lines[i + 1].trim())) {
      const head = cells(t);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith("|")) rows.push(cells(lines[i++]));
      out.push(
        <div key={key()} className="overflow-x-auto my-3 border border-slate-200 rounded-xl">
          <table className="w-full text-xs">
            <thead className="bg-slate-50">
              <tr>{head.map((c, ci) => <th key={ci} className="text-left font-semibold text-slate-600 px-3 py-2 border-b border-slate-200 whitespace-nowrap">{inlineMarkdown(c)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className="border-b border-slate-100 last:border-0 align-top">
                  {r.map((c, ci) => <td key={ci} className="px-3 py-2 text-slate-700">{inlineMarkdown(c)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    if (t.startsWith(">")) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) quote.push(lines[i++].trim().replace(/^(>\s*)+/, ""));
      out.push(
        <blockquote key={key()} className="border-l-2 border-[#bfdbfe] bg-[#f8fbff] pl-3 py-1 text-slate-600 my-2 space-y-1">
          {quote.filter(Boolean).map((q, qi) => <p key={qi}>{inlineMarkdown(q)}</p>)}
        </blockquote>
      );
      continue;
    }

    if (BULLET.test(line) || NUMBER.test(line)) {
      const ordered = NUMBER.test(line);
      const re = ordered ? NUMBER : BULLET;
      const items: string[] = [];
      while (i < lines.length && (re.test(lines[i]) || (lines[i].startsWith("  ") && lines[i].trim() && items.length))) {
        if (re.test(lines[i])) items.push(lines[i].replace(re, ""));
        else items[items.length - 1] += ` ${lines[i].trim().replace(BULLET, "")}`;
        i++;
      }
      const Tag = ordered ? "ol" : "ul";
      out.push(
        <Tag key={key()} className={`${ordered ? "list-decimal" : "list-disc"} pl-5 space-y-1 my-2 text-slate-700 marker:text-slate-400`}>
          {items.map((it, ii) => <li key={ii} className="pl-1">{inlineMarkdown(it)}</li>)}
        </Tag>
      );
      continue;
    }

    const para: string[] = [t];
    i++;
    while (i < lines.length) {
      const l = lines[i].trim();
      if (!l || /^(#{1,6}\s|```|>|\|)/.test(l) || BULLET.test(lines[i]) || NUMBER.test(lines[i]) || /^(-{3,}|\*{3,})$/.test(l)) break;
      para.push(l);
      i++;
    }
    out.push(
      <p key={key()} className="my-2 text-slate-700 leading-relaxed">
        {para.map((p, pi) => <React.Fragment key={pi}>{pi > 0 && <br />}{inlineMarkdown(p)}</React.Fragment>)}
      </p>
    );
  }

  return out;
}
