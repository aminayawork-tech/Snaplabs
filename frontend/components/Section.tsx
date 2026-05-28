"use client";
import { useState } from "react";
import clsx from "clsx";

interface Props {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export default function Section({ title, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "w-full flex items-center justify-between px-4 py-3 text-left",
          "border rounded-xl font-semibold text-sm transition-all duration-150",
          open
            ? "bg-brand-50 border-brand-300 text-brand rounded-b-none"
            : "bg-white border-slate-200 text-slate-800 hover:bg-brand-50 hover:border-brand-200"
        )}
      >
        <span>{title}</span>
        <span className={clsx("ml-2 text-base transition-transform duration-150 flex-shrink-0", open ? "text-brand" : "text-slate-400")}>
          {open ? "▾" : "▸"}
        </span>
      </button>

      {open && (
        <div className="bg-white border border-slate-200 border-t-0 rounded-b-xl px-4 py-4">
          {children}
        </div>
      )}
    </div>
  );
}
