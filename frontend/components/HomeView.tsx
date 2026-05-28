"use client";
import { useState, useEffect } from "react";
import { storage } from "@/lib/storage";
import type { SavedAudit } from "@/lib/storage";
import type { View } from "@/lib/types";

interface Props {
  onStartAudit: (url: string, bizName: string, deepCrawl: boolean) => void;
  onOpenSaved: (id: string) => void;
  onNav: (v: View) => void;
}

export default function HomeView({ onStartAudit, onOpenSaved }: Props) {
  const [url, setUrl]           = useState("");
  const [bizName, setBizName]   = useState("");
  const [deepCrawl, setDeepCrawl] = useState(false);
  const [error, setError]       = useState("");
  const [audits, setAudits]     = useState<SavedAudit[]>([]);

  useEffect(() => {
    setAudits(storage.list());
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.startsWith("http")) {
      setError("Please enter a valid URL starting with https://");
      return;
    }
    setError("");
    onStartAudit(url, bizName, deepCrawl);
  };

  return (
    <div className="view-enter">
      {/* Hero */}
      <div className="text-center py-8 px-4">
        <h1 className="text-[2rem] font-extrabold text-slate-800 tracking-tight leading-tight mb-2">
          Your AI <span className="text-brand">Marketing Analyst</span>
        </h1>
        <p className="text-slate-500 text-[0.95rem] leading-relaxed max-w-sm mx-auto">
          Enter your website URL and get a full marketing audit — SEO, competitors, content gaps, and quick wins — in under 60 seconds.
        </p>
      </div>

      {/* Audit form */}
      <form onSubmit={submit} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-6">
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Business Name <span className="text-slate-300 normal-case font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={bizName}
            onChange={(e) => setBizName(e.target.value)}
            placeholder="e.g. My Coffee Shop"
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 transition"
          />
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Website URL <span className="text-red-400">*</span>
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://yourbusiness.com/"
            required
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 transition"
          />
        </div>

        <label className="flex items-center gap-2.5 mb-4 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={deepCrawl}
            onChange={(e) => setDeepCrawl(e.target.checked)}
            className="w-4 h-4 rounded accent-brand"
          />
          <span className="text-sm text-slate-600">
            Deep crawl <span className="text-slate-400">(up to 10 pages, richer data)</span>
          </span>
        </label>

        {error && (
          <p className="text-red-500 text-xs mb-3 font-medium">{error}</p>
        )}

        <button
          type="submit"
          className="w-full bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] text-white font-bold rounded-xl py-3 text-sm shadow-md hover:shadow-lg hover:-translate-y-px transition-all"
        >
          Audit My Website
        </button>
      </form>

      {/* Recent audits */}
      {audits.length > 0 && (
        <div>
          <p className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-widest mb-3">
            Recent Audits
          </p>
          <div className="flex flex-col gap-2">
            {audits.slice(0, 5).map((a) => {
              const score = a.score ?? 0;
              const scoreColor =
                score >= 70 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
              return (
                <div
                  key={a.id}
                  className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ background: scoreColor }}
                  >
                    {score || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800 text-sm truncate">{a.name}</p>
                    <p className="text-xs text-slate-400 truncate">{a.website_url}</p>
                  </div>
                  <button
                    onClick={() => onOpenSaved(a.id)}
                    className="text-xs font-semibold text-brand bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition flex-shrink-0"
                  >
                    Open →
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
