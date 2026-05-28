"use client";
import { useEffect, useRef } from "react";
import { api } from "@/lib/api";
import type { ResearchData, AuditResult } from "@/lib/types";
import clsx from "clsx";

const STEPS = [
  "Scraping website content",
  "Extracting pages & structure",
  "Running AI analysis",
  "Building your report",
];

interface Props {
  url: string;
  bizName: string;
  deepCrawl: boolean;
  step: number;
  onSetStep: (s: number) => void;
  onDone: (r: AuditResult) => void;
  onError: (msg: string) => void;
}

export default function RunningView({ url, bizName, deepCrawl, step, onSetStep, onDone, onError }: Props) {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const ctrl = new AbortController();

    (async () => {
      try {
        let clientId: number | undefined;
        for await (const event of api.audit({ url, biz_name: bizName, deep_crawl: deepCrawl }, ctrl.signal)) {
          const type = event.type as string;
          if (type === "client_id") clientId = event.client_id as number;
          if (type === "progress") onSetStep((event.step as number) ?? 0);
          if (type === "result") {
            onDone({
              data: event.data as ResearchData,
              pages_crawled: (event.pages_crawled as number) ?? 1,
              client_id: (event.client_id as number) ?? clientId,
            });
          }
          if (type === "error") onError(event.message as string);
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") onError(String(e));
      }
    })();

    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="view-enter flex flex-col items-center pt-12 pb-8">
      {/* Spinner */}
      <div className="w-12 h-12 rounded-full border-[3px] border-brand-100 border-t-brand spin mb-5" />
      <h2 className="text-xl font-bold text-slate-800 mb-1">Auditing your website</h2>
      <p className="text-slate-400 text-sm mb-8 text-center max-w-xs">{url}</p>

      {/* Steps */}
      <div className="w-full max-w-sm flex flex-col gap-2">
        {STEPS.map((label, i) => {
          const done   = i < step;
          const active = i === step;
          return (
            <div
              key={i}
              className={clsx(
                "flex items-center gap-3 px-4 py-3 rounded-xl border text-sm transition-all",
                done   && "bg-green-50 border-green-200 text-green-700",
                active && "bg-brand-50 border-brand-300 text-brand pulse",
                !done && !active && "bg-white border-slate-100 text-slate-400"
              )}
            >
              <div
                className={clsx(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                  done   && "bg-green-500 text-white",
                  active && "bg-brand text-white",
                  !done && !active && "bg-slate-100 text-slate-400"
                )}
              >
                {done ? "✓" : i + 1}
              </div>
              {label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
