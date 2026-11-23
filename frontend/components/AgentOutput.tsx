"use client";
import { useEffect, useState } from "react";
import { renderMarkdown } from "@/lib/renderMarkdown";

interface Section { title: string; body: string }
interface Integrations {
  github: { connected: boolean; repo: string | null; dir: string };
  mailchimp: { connected: boolean };
}

let integrationsPromise: Promise<Integrations | null> | null = null;
function loadIntegrations(): Promise<Integrations | null> {
  integrationsPromise ??= fetch("/api/integrations/status")
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  return integrationsPromise;
}

function splitSections(md: string): { intro: string; sections: Section[] } {
  const lines = md.split("\n");
  const sections: Section[] = [];
  const intro: string[] = [];
  for (const line of lines) {
    const m = line.match(/^##\s+(?!#)(.+)/);
    if (m) sections.push({ title: m[1].replace(/\*\*/g, "").trim(), body: "" });
    else if (sections.length) sections[sections.length - 1].body += `${line}\n`;
    else intro.push(line);
  }
  return { intro: intro.join("\n").trim(), sections };
}

// Pulls "**Label:** value" lines out of the top of a section body.
function extractMeta(body: string, labels: string[]): { meta: Record<string, string>; rest: string } {
  const meta: Record<string, string> = {};
  const lines = body.split("\n");
  const keep: string[] = [];
  lines.forEach((line, idx) => {
    const m = idx < 12 ? line.trim().match(/^\*\*\s*([^*:]+?)\s*:?\s*\*\*\s*:?\s*(.+)$/) : null;
    const label = m?.[1].toLowerCase();
    const hit = label ? labels.find((l) => label === l || label.startsWith(l)) : undefined;
    if (m && hit && !meta[hit]) meta[hit] = m[2].trim();
    else keep.push(line);
  });
  return { meta, rest: keep.join("\n").trim() };
}

const isBlog = (agentId: string, title: string) => /^blog post\b/i.test(title) && agentId === "content_engine";
const isEmail = (title: string) => /^email\s*\d+/i.test(title);

export function CopyButton({ text, label = "Copy", className = "" }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async (e) => {
        e.stopPropagation();
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={`inline-flex items-center gap-1 text-[0.6875rem] font-semibold px-2.5 py-1 rounded-lg border transition ${copied ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white border-slate-200 text-slate-500 hover:border-[#275fe8] hover:text-[#275fe8]"} ${className}`}
    >
      {copied ? (
        <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3"><polyline points="20 6 9 17 4 12"/></svg>Copied</>
      ) : (
        <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>{label}</>
      )}
    </button>
  );
}

type PublishTarget =
  | { kind: "blog"; title: string; slug: string; description: string; body: string }
  | { kind: "email"; title: string; subject: string; preview: string; body: string };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-slate-400">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#275fe8] focus:ring-1 focus:ring-[#275fe8]";

function PublishModal({ target, integrations, onClose }: { target: PublishTarget; integrations: Integrations | null; onClose: () => void }) {
  const [form, setForm] = useState(target);
  const [mode, setMode] = useState<"pr" | "direct">("pr");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resultUrl, setResultUrl] = useState("");

  const isBlogTarget = form.kind === "blog";
  const connected = isBlogTarget ? integrations?.github.connected : integrations?.mailchimp.connected;
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }) as PublishTarget);

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(isBlogTarget ? "/api/integrations/github" : "/api/integrations/mailchimp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          form.kind === "blog"
            ? { title: form.title, slug: form.slug, description: form.description, body: form.body, mode }
            : { title: form.title, subject: form.subject, preview_text: form.preview, body: form.body }
        ),
      });
      const json = await res.json();
      if (!res.ok || json.error) setError(json.error ?? `Failed (${res.status})`);
      else setResultUrl(json.url);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <p className="font-bold text-slate-900">{isBlogTarget ? "Publish to your blog" : "Send to Mailchimp"}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {isBlogTarget
                ? integrations?.github.repo ? `${integrations.github.repo} → ${integrations.github.dir}/` : "GitHub → Vercel"
                : "Creates a draft campaign — nothing is sent until you hit send in Mailchimp"}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg leading-none px-2">✕</button>
        </div>

        <div className="px-6 py-5 overflow-y-auto space-y-4">
          {!connected ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
              <p className="font-semibold mb-2">{isBlogTarget ? "GitHub" : "Mailchimp"} isn&apos;t connected yet</p>
              <p className="text-xs mb-2">Add these environment variables in Vercel → Project → Settings → Environment Variables, then redeploy:</p>
              <ul className="text-xs font-mono space-y-1">
                {isBlogTarget ? (
                  <>
                    <li><b>GITHUB_TOKEN</b> — fine-grained token with Contents + Pull requests: read/write on your site repo</li>
                    <li><b>GITHUB_REPO</b> — e.g. yourname/your-site</li>
                    <li><b>GITHUB_BLOG_DIR</b> — folder for posts (default content/blog)</li>
                    <li><b>GITHUB_BLOG_EXT</b> — md or mdx (default md)</li>
                  </>
                ) : (
                  <>
                    <li><b>MAILCHIMP_API_KEY</b> — Profile → Extras → API keys (ends in -us21 etc.)</li>
                    <li><b>MAILCHIMP_AUDIENCE_ID</b> — Audience → Settings → Audience name and defaults</li>
                  </>
                )}
              </ul>
            </div>
          ) : resultUrl ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
              <p className="font-bold text-emerald-800">{isBlogTarget ? (mode === "pr" ? "Pull request opened" : "Published") : "Draft campaign created"}</p>
              <p className="text-xs text-emerald-700 mt-1">
                {isBlogTarget
                  ? mode === "pr" ? "Vercel is building a preview. Merge the PR to go live." : "Vercel will deploy it in a minute or two."
                  : "Review it in Mailchimp and send or schedule when ready."}
              </p>
              <a href={resultUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg">
                Open {isBlogTarget ? (mode === "pr" ? "pull request" : "on GitHub") : "in Mailchimp"} ↗
              </a>
            </div>
          ) : null}

          {!resultUrl && (
            <>
              {form.kind === "blog" ? (
                <>
                  <Field label="Title"><input className={inputCls} value={form.title} onChange={(e) => set("title", e.target.value)} /></Field>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Slug"><input className={`${inputCls} font-mono text-xs`} value={form.slug} onChange={(e) => set("slug", e.target.value)} /></Field>
                    <Field label="Meta description"><input className={inputCls} value={form.description} onChange={(e) => set("description", e.target.value)} /></Field>
                  </div>
                </>
              ) : (
                <>
                  <Field label="Subject line"><input className={inputCls} value={form.subject} onChange={(e) => set("subject", e.target.value)} /></Field>
                  <Field label="Preview text"><input className={inputCls} value={form.preview} onChange={(e) => set("preview", e.target.value)} /></Field>
                </>
              )}
              <Field label={isBlogTarget ? "Article (Markdown)" : "Email body (Markdown)"}>
                <textarea className={`${inputCls} font-mono text-xs leading-relaxed`} rows={14} value={form.body} onChange={(e) => set("body", e.target.value)} />
              </Field>
              {isBlogTarget && connected && (
                <div className="flex gap-2">
                  {([["pr", "Open a pull request", "Review a Vercel preview first"], ["direct", "Publish directly", "Commit straight to the live branch"]] as const).map(([v, l, d]) => (
                    <button key={v} onClick={() => setMode(v)}
                      className={`flex-1 text-left border rounded-xl px-3 py-2.5 transition ${mode === v ? "border-[#275fe8] bg-[#eff6ff]" : "border-slate-200 hover:border-slate-300"}`}>
                      <p className={`text-sm font-semibold ${mode === v ? "text-[#275fe8]" : "text-slate-700"}`}>{l}</p>
                      <p className="text-xs text-slate-400">{d}</p>
                    </button>
                  ))}
                </div>
              )}
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            </>
          )}
        </div>

        {!resultUrl && (
          <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
            <button onClick={onClose} className="text-sm font-semibold text-slate-500 px-4 py-2 rounded-lg hover:bg-slate-50">Cancel</button>
            <button onClick={submit} disabled={!connected || busy}
              className="bg-[#275fe8] hover:bg-[#1a4fd0] disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg flex items-center gap-2">
              {busy && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              {isBlogTarget ? (mode === "pr" ? "Open pull request" : "Publish now") : "Create draft campaign"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionCard({ agentId, section, streaming }: { agentId: string; section: Section; streaming: boolean }) {
  const [integrations, setIntegrations] = useState<Integrations | null>(null);
  const [target, setTarget] = useState<PublishTarget | null>(null);
  const blog = isBlog(agentId, section.title);
  const email = isEmail(section.title);

  useEffect(() => {
    if (blog || email) loadIntegrations().then(setIntegrations);
  }, [blog, email]);

  const { meta, rest } = blog
    ? extractMeta(section.body, ["slug", "meta description", "target keyword"])
    : email
    ? extractMeta(section.body, ["subject", "preview", "send"])
    : { meta: {} as Record<string, string>, rest: section.body.trim() };

  const title = blog ? section.title.replace(/^blog post\s*:\s*/i, "") : section.title;
  const copyText = email
    ? `Subject: ${meta.subject ?? ""}\nPreview: ${meta.preview ?? ""}\n\n${rest}`
    : blog ? `# ${title}\n\n${rest}` : `## ${section.title}\n\n${rest}`;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-center gap-2 min-w-0">
          {blog && <span className="text-[0.625rem] font-bold uppercase tracking-wide bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full flex-shrink-0">Blog post</span>}
          {email && <span className="text-[0.625rem] font-bold uppercase tracking-wide bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex-shrink-0">Email</span>}
          <p className="font-bold text-slate-900 text-sm truncate">{title}</p>
        </div>
        {!streaming && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <CopyButton text={copyText} />
            {blog && (
              <button
                onClick={() => setTarget({ kind: "blog", title, slug: meta.slug ?? "", description: meta["meta description"] ?? "", body: rest })}
                className="inline-flex items-center gap-1 text-[0.6875rem] font-semibold px-2.5 py-1 rounded-lg bg-slate-900 text-white hover:bg-slate-700 transition">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.6 1.6.2 2.8.1 3.2.8.8 1.3 1.9 1.3 3.1 0 4.6-2.8 5.6-5.5 5.9.5.4.9 1.1.9 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3"/></svg>
                Publish to blog
              </button>
            )}
            {email && (
              <button
                onClick={() => setTarget({ kind: "email", title: section.title, subject: meta.subject ?? "", preview: meta.preview ?? "", body: rest })}
                className="inline-flex items-center gap-1 text-[0.6875rem] font-semibold px-2.5 py-1 rounded-lg bg-[#ffe01b] text-slate-900 hover:brightness-95 transition">
                Send to Mailchimp
              </button>
            )}
          </div>
        )}
      </div>

      {email && (meta.subject || meta.preview) && (
        <div className="px-5 py-3 border-b border-slate-100 text-sm space-y-1">
          {meta.subject && <p><span className="text-slate-400 w-16 inline-block text-xs">Subject</span><span className="font-semibold text-slate-900">{meta.subject}</span></p>}
          {meta.preview && <p><span className="text-slate-400 w-16 inline-block text-xs">Preview</span><span className="text-slate-600">{meta.preview}</span></p>}
          {meta.send && <p><span className="text-slate-400 w-16 inline-block text-xs">Send</span><span className="text-slate-600">{meta.send}</span></p>}
        </div>
      )}
      {blog && (meta.slug || meta["meta description"] || meta["target keyword"]) && (
        <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap gap-x-5 gap-y-1 text-xs">
          {meta["target keyword"] && <p><span className="text-slate-400">Keyword </span><span className="font-semibold text-slate-700">{meta["target keyword"]}</span></p>}
          {meta.slug && <p><span className="text-slate-400">Slug </span><span className="font-mono text-slate-700">/{meta.slug}</span></p>}
          {meta["meta description"] && <p className="w-full"><span className="text-slate-400">Meta </span><span className="text-slate-600">{meta["meta description"]}</span></p>}
        </div>
      )}

      <div className={`px-5 py-3 text-sm ${blog ? "max-w-[68ch]" : ""}`}>{renderMarkdown(rest)}</div>

      {target && <PublishModal target={target} integrations={integrations} onClose={() => setTarget(null)} />}
    </div>
  );
}

export default function AgentOutput({ agentId, text, streaming = false }: { agentId: string; text: string; streaming?: boolean }) {
  const { intro, sections } = splitSections(text);
  return (
    <div className="space-y-3">
      {intro && <div className="text-sm px-1">{renderMarkdown(intro)}</div>}
      {sections.map((s, i) => (
        <SectionCard key={i} agentId={agentId} section={s} streaming={streaming && i === sections.length - 1} />
      ))}
      {streaming && (
        <div className="flex items-center gap-2 text-xs text-slate-400 px-1">
          <span className="w-1.5 h-3.5 bg-[#275fe8] animate-pulse rounded-sm" /> Writing…
        </div>
      )}
    </div>
  );
}
