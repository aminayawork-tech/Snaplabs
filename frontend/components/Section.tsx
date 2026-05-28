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
          "border rounded-xl font-bold text-base transition-all duration-150",
          open
            ? "border-[#c4a8e8] rounded-b-none text-[#6b21d6]"
            : "border-[#c4a8e8] text-[#6b21d6] hover:opacity-90"
        )}
        style={{ background: "#f3eef8" }}
      >
        <span>{title}</span>
        <span className={clsx("ml-2 text-lg transition-transform duration-150 flex-shrink-0 text-[#6b21d6]")}>
          {open ? "▾" : "▸"}
        </span>
      </button>

      {open && (
        <div className="border border-[#c4a8e8] border-t-0 rounded-b-xl px-4 py-4 bg-white">
          {children}
        </div>
      )}
    </div>
  );
}
