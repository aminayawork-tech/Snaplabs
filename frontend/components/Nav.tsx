"use client";
import clsx from "clsx";
import type { View } from "@/lib/types";

const NAV_ITEMS = [
  {
    key: "home" as View,
    label: "Home",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 stroke-current">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z"/>
        <path d="M9 21V12h6v9"/>
      </svg>
    ),
  },
  {
    key: "results" as View,
    label: "Audit",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 stroke-current">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6"  y1="20" x2="6"  y2="14"/>
      </svg>
    ),
  },
  {
    key: "trends" as View,
    label: "Trends",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 stroke-current">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
        <polyline points="16 7 22 7 22 13"/>
      </svg>
    ),
  },
  {
    key: "saved" as View,
    label: "Saved",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 stroke-current">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
];

interface Props {
  view: View;
  onNav: (v: View) => void;
  hasAudit: boolean;
}

export default function Nav({ view, onNav, hasAudit }: Props) {
  const active = view === "running" ? "results" : view;

  const handleNav = (key: View) => {
    if (key === "results" && !hasAudit) return;
    if (key === "trends") { onNav(key); return; }
    onNav(key);
  };

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <nav className="hidden md:flex fixed left-0 top-0 h-full w-[220px] flex-col bg-white border-r border-slate-200 shadow-[1px_0_0_#e2e8f0] z-50 px-3 py-5">
        {/* Brand */}
        <div className="flex items-center gap-2.5 mb-1 px-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] text-white font-bold text-sm flex items-center justify-center flex-shrink-0 shadow-sm">
            S
          </div>
          <div className="font-display font-bold text-[1.05rem] text-slate-900 leading-none tracking-tight">
            Snappy<span className="text-brand">marketer</span>
          </div>
        </div>
        <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-5 pl-1">AI Marketing Platform</p>

        <div className="w-full h-px bg-slate-100 mb-3" />

        <div className="flex flex-col gap-0.5">
          {NAV_ITEMS.map(({ key, label, icon }) => {
            const isActive = active === key;
            const disabled = key === "results" && !hasAudit;
            return (
              <button
                key={key}
                onClick={() => handleNav(key)}
                disabled={disabled}
                className={clsx(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[0.8125rem] font-medium transition-all w-full text-left",
                  isActive
                    ? "bg-brand-100 text-brand font-semibold"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
                  disabled && "opacity-30 cursor-not-allowed"
                )}
              >
                {icon}
                {label}
              </button>
            );
          })}
        </div>

        <div className="mt-auto text-[0.625rem] text-slate-300 leading-relaxed pl-1 tracking-wide">
          snappymarketer · Claude + Firecrawl
        </div>
      </nav>

      {/* ── Mobile bottom tabs ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[60px] bg-white border-t border-slate-200 flex z-50 shadow-[0_-2px_12px_rgba(0,0,0,0.07)]">
        {NAV_ITEMS.map(({ key, label, icon }) => {
          const isActive = active === key;
          const disabled = key === "results" && !hasAudit;
          return (
            <button
              key={key}
              onClick={() => handleNav(key)}
              disabled={disabled}
              className={clsx(
                "flex-1 flex flex-col items-center justify-center gap-0.5 text-[0.65rem] font-medium transition-colors",
                isActive ? "text-brand" : "text-slate-400",
                disabled && "opacity-30 cursor-not-allowed"
              )}
            >
              {icon}
              {label}
            </button>
          );
        })}
      </nav>
    </>
  );
}
