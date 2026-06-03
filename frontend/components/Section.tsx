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
          "rounded-xl font-bold text-base transition-all duration-150",
          open
            ? "rounded-b-none text-white"
            : "text-white hover:opacity-90"
        )}
        style={{ background: "#0f172a" }}
      >
        <span>{title}</span>
        <span className="ml-2 text-lg transition-transform duration-150 flex-shrink-0 text-white">
          {open ? "▾" : "▸"}
        </span>
      </button>

      {open && (
        <div className="border border-slate-200 border-t-0 rounded-b-xl px-4 py-4 bg-white">
          {children}
        </div>
      )}
    </div>
  );
}
