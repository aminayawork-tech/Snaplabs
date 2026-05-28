"use client";
import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import { renderMarkdown } from "@/lib/renderMarkdown";
import type { ChatMessage, ResearchData } from "@/lib/types";

interface Props {
  researchData: ResearchData;
}

function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? "bg-brand text-white rounded-br-sm"
            : "bg-white border border-slate-200 text-slate-700 rounded-bl-sm"
        }`}
      >
        {isUser ? msg.content : renderMarkdown(msg.content)}
      </div>
    </div>
  );
}

export default function ChatPanel({ researchData }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput]       = useState("");
  const [streaming, setStreaming] = useState(false);
  const [draft, setDraft]       = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, draft]);

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setStreaming(true);
    setDraft("");

    let full = "";
    try {
      for await (const ev of api.chat({ message: text, research_data: researchData, history: messages })) {
        if (ev.type === "text") {
          full += ev.text as string;
          setDraft(full);
        }
      }
    } finally {
      setStreaming(false);
      setDraft("");
      if (full) setMessages((m) => [...m, { role: "assistant", content: full }]);
    }
  };

  return (
    <div className="flex flex-col">
      <h3 className="text-base font-bold text-slate-800 mb-1">Ask About Your Audit</h3>
      <p className="text-xs text-slate-400 mb-4">
        Your full audit data is loaded as context. Ask anything about marketing strategy, SEO, competitors, or what to prioritise.
      </p>

      {(messages.length > 0 || draft) && (
        <div className="bg-slate-50 rounded-2xl p-4 mb-3 max-h-[400px] overflow-y-auto">
          {messages.map((m, i) => <Bubble key={i} msg={m} />)}
          {draft && (
            <div className="flex justify-start mb-3">
              <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-bl-sm text-sm leading-relaxed bg-white border border-slate-200 text-slate-700">
                {renderMarkdown(draft)}
                <span className="inline-block w-1 h-4 bg-brand ml-0.5 animate-pulse" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          disabled={streaming}
          placeholder="Ask anything about your marketing audit..."
          className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 transition disabled:opacity-50"
        />
        <button
          onClick={send}
          disabled={!input.trim() || streaming}
          className="bg-brand text-white rounded-xl px-4 py-3 flex items-center justify-center hover:bg-brand-600 transition disabled:opacity-40"
          aria-label="Send"
        >
          {streaming ? (
            <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white spin" />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
