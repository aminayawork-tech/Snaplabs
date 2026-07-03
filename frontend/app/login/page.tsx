"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/app";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push(next);
        router.refresh();
      } else {
        setError("Incorrect password. Please try again.");
        setLoading(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="Access password"
        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#275fe8] focus:ring-1 focus:ring-[#275fe8] bg-white"
        autoFocus
      />
      {error && (
        <p className="text-red-600 text-sm flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 flex-shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading || !password}
        className="w-full bg-[#275fe8] hover:bg-[#1a4fd0] text-white font-bold py-3 rounded-xl text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Signing in…
          </>
        ) : "Sign In →"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#f9fafd] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="font-bold text-2xl text-slate-900 tracking-tight mb-1">
            Snappy<span className="text-[#275fe8]">marketer</span>
          </div>
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-slate-400">AI Marketing Platform</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          <h1 className="font-bold text-slate-900 text-xl mb-1">Welcome back</h1>
          <p className="text-sm text-slate-500 mb-6">Enter your access password to continue.</p>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Snappymarketer · Private Access
        </p>
      </div>
    </div>
  );
}
