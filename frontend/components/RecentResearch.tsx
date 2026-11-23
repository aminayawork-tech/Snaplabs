"use client";
import { savedAgo } from "@/lib/savedResearch";

export interface RecentItem { key: string; label: string; updatedAt: number; detail?: string }

export function RecentResearch({ items, activeKey, onOpen, onDelete, className = "" }: {
  items: RecentItem[];
  activeKey?: string | null;
  onOpen: (key: string) => void;
  onDelete: (key: string) => void;
  className?: string;
}) {
  if (!items.length) return null;
  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className}`}>
      <span className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.1em] mr-1">Recent research</span>
      {items.slice(0, 10).map((r) => (
        <span key={r.key} className={`inline-flex items-center rounded-full border text-xs transition ${r.key === activeKey ? "bg-[#eff6ff] border-[#bfdbfe] text-[#275fe8]" : "bg-white border-slate-200 text-slate-600 hover:border-[#93c5fd]"}`}>
          <button onClick={() => onOpen(r.key)} className="pl-3 pr-1.5 py-1 font-medium max-w-[240px] truncate" title={`Saved ${savedAgo(r.updatedAt)}${r.detail ? ` · ${r.detail}` : ""}`}>
            {r.label}
          </button>
          <button onClick={() => onDelete(r.key)} className="pr-2 text-slate-300 hover:text-red-500" title="Delete saved research">×</button>
        </span>
      ))}
    </div>
  );
}

export function SavedBar({ savedAt, label = "", onRefresh }: { savedAt?: number; label?: string; onRefresh: () => void }) {
  if (!savedAt) return null;
  return (
    <div className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-500">
      <span className="flex items-center gap-1.5">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        Saved {savedAgo(savedAt)} — reopening this costs no API calls
      </span>
      <button onClick={onRefresh} className="text-[#275fe8] font-semibold hover:underline flex-shrink-0">Refresh{label ? ` ${label}` : ""}</button>
    </div>
  );
}
