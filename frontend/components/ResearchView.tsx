"use client";
import { useState } from "react";
import TrendsView from "@/components/TrendsView";
import CompetitorView from "@/components/CompetitorView";
import SocialListeningView from "@/components/SocialListeningView";
import AudienceView from "@/components/AudienceView";
import type { ResearchTab, Keyword } from "@/lib/types";

const TABS: { key: ResearchTab; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    key: "trends",
    label: "Keyword Trends",
    desc: "Search volume & rising keywords",
    icon: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 stroke-current"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
  },
  {
    key: "competitor",
    label: "Competitor Analysis",
    desc: "Content strategy & keyword gaps",
    icon: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 stroke-current"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>,
  },
  {
    key: "social",
    label: "Social Listening",
    desc: "Reddit sentiment & conversations",
    icon: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 stroke-current"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  },
  {
    key: "audience",
    label: "Audience Research",
    desc: "Personas & customer journey",
    icon: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 stroke-current"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
];

interface Props {
  auditKeywords?: (string | Keyword)[];
  bizName?: string;
  initialCategory?: string;
  initialTab?: ResearchTab;
}

export default function ResearchView({ auditKeywords = [], bizName, initialCategory, initialTab = "trends" }: Props) {
  const [tab, setTab] = useState<ResearchTab>(initialTab);

  return (
    <div>
      {/* Sub-navigation */}
      <div className="mb-6">
        <div className="flex items-center gap-1 mb-1">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-slate-400">Discovery &amp; Research</p>
        </div>
        {/* Desktop: tab bar */}
        <div className="hidden sm:flex bg-slate-100 rounded-2xl p-1 gap-1">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all
                ${tab === t.key
                  ? "bg-white text-[#6b21d6] shadow-sm"
                  : "text-slate-500 hover:text-slate-700"}`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
        {/* Mobile: scrollable pill row */}
        <div className="sm:hidden flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition
                ${tab === t.key
                  ? "bg-[#6b21d6] text-white border-[#6b21d6]"
                  : "bg-white text-slate-600 border-slate-200"}`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Active tool */}
      {tab === "trends" && (
        <TrendsView auditKeywords={auditKeywords} bizName={bizName} initialCategory={initialCategory} />
      )}
      {tab === "competitor" && <CompetitorView />}
      {tab === "social" && <SocialListeningView />}
      {tab === "audience" && <AudienceView />}
    </div>
  );
}
