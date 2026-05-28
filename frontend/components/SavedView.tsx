"use client";
import { useState, useEffect } from "react";
import { storage } from "@/lib/storage";
import type { SavedAudit } from "@/lib/storage";

interface Props {
  onOpen: (id: string) => void;
}

function scoreColor(s: number) {
  return s >= 70 ? "#22c55e" : s >= 50 ? "#f59e0b" : "#ef4444";
}

export default function SavedView({ onOpen }: Props) {
  const [audits, setAudits] = useState<SavedAudit[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => { setAudits(storage.list()); }, []);

  const handleDelete = (id: string) => {
    if (!confirm("Delete this audit? This cannot be undone.")) return;
    setDeleting(id);
    storage.delete(id);
    setAudits((a) => a.filter((x) => x.id !== id));
    setDeleting(null);
  };

  if (audits.length === 0) {
    return (
      <div className="view-enter">
        <h2 className="text-xl font-bold text-slate-800 mb-1">My Saved Audits</h2>
        <p className="text-sm text-slate-400 mb-6">All your past website audits.</p>
        <div className="border-2 border-dashed border-brand-200 bg-brand-50 rounded-2xl text-center py-12 px-4">
          <p className="font-bold text-brand-700 text-base mb-1">No audits yet</p>
          <p className="text-sm text-brand-500">Audit your first website to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="view-enter">
      <h2 className="text-xl font-bold text-slate-800 mb-1">My Saved Audits</h2>
      <p className="text-sm text-slate-400 mb-5">Open one to continue working with AI agents and chat.</p>

      <div className="flex flex-col gap-3">
        {audits.map((a) => {
          const score = a.score ?? 0;
          const sc = scoreColor(score);
          const date = a.created_at ? a.created_at.slice(0, 10) : "";
          const sub  = [a.industry, date].filter(Boolean).join(" · ");

          return (
            <div
              key={a.id}
              className="bg-white border border-slate-200 rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-sm"
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0"
                style={{ background: sc }}
              >
                {score || "?"}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 text-sm truncate">{a.name}</p>
                <p className="text-xs text-slate-400 truncate">{sub || a.website_url}</p>
                <p className="text-xs text-slate-400 truncate">{a.website_url}</p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => onOpen(a.id)}
                  className="p-2 text-slate-400 hover:text-brand transition"
                  title="Open audit"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(a.id)}
                  disabled={deleting === a.id}
                  className="p-2 text-slate-400 hover:text-red-500 transition disabled:opacity-40"
                  title="Delete audit"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14H6L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4h6v2"/>
                  </svg>
                </button>
                <button
                  onClick={() => onOpen(a.id)}
                  className="p-2 text-slate-400 hover:text-brand transition"
                  title="Expand"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
