import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* Header */}
      <header className="border-b border-slate-100 px-6 md:px-12 py-4 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-sm z-10">
        <div>
          <span className="font-bold text-lg text-slate-900 tracking-tight">Snappy<span className="text-[#275fe8]">marketer</span></span>
          <p className="text-[0.55rem] font-bold uppercase tracking-[0.18em] text-slate-400 leading-none mt-0.5">AI Marketing Platform</p>
        </div>
        <Link href="/login" className="bg-[#275fe8] hover:bg-[#1a4fd0] text-white text-sm font-bold px-5 py-2.5 rounded-xl transition">
          Sign In →
        </Link>
      </header>

      {/* Hero */}
      <section className="px-6 md:px-12 pt-20 pb-28 text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-[#eff6ff] border border-[#bfdbfe] rounded-full px-4 py-1.5 text-xs font-bold text-[#275fe8] mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#275fe8] animate-pulse inline-block" />
          Powered by Claude AI + Google Trends
        </div>
        <h1 className="text-[2.75rem] md:text-[4rem] font-black text-slate-900 tracking-tight leading-[1.08] mb-6">
          Get a Better Marketing Strategy<br className="hidden md:block" />{" "}
          Than Your Agency —<br className="hidden md:block" />{" "}
          <span className="text-[#275fe8]">In 47 Seconds</span>
        </h1>
        <p className="text-lg text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
          AI-powered marketing audits, real-time keyword research, competitor intelligence, and audience insights — everything your agency charges $5,000/mo for, automated.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2.5 bg-[#275fe8] hover:bg-[#1a4fd0] text-white text-base font-bold px-8 py-4 rounded-2xl transition shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-200"
        >
          Access the Platform
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><polyline points="9 18 15 12 9 6"/></svg>
        </Link>
      </section>

      {/* Features grid */}
      <section className="bg-[#f9fafd] border-t border-slate-100 px-6 md:px-12 py-20">
        <div className="max-w-5xl mx-auto">
          <p className="text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-slate-400 text-center mb-12">Everything in one platform</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {([
              {
                title: "Marketing Audit",
                desc: "Full AI analysis of any website — SEO gaps, messaging quality, content opportunities, and quick wins in 47 seconds.",
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="#275fe8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
              },
              {
                title: "Keyword Trends",
                desc: "Real-time Google Trends data, trending topics by country, and high-volume keyword discovery across 26 categories.",
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="#275fe8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
              },
              {
                title: "Competitor Analysis",
                desc: "Scrape any competitor website, uncover their content strategy, and find keyword gaps you can own today.",
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="#275fe8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>,
              },
              {
                title: "Audience Research",
                desc: "AI-generated buyer personas, pain points, and the exact channels your ideal customers spend time on.",
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="#275fe8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
              },
            ] as { title: string; desc: string; icon: React.ReactNode }[]).map((f, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-[#275fe8] hover:shadow-md transition-all duration-200">
                <div className="w-10 h-10 bg-[#eff6ff] rounded-xl flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="font-bold text-slate-900 mb-2 text-sm">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 md:px-12 py-20 max-w-4xl mx-auto">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-slate-400 text-center mb-14">How it works</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {[
            { n: "1", title: "Enter any URL", desc: "Paste your website URL and business name. That's all we need to get started." },
            { n: "2", title: "AI does the work", desc: "Claude AI crawls your site, analyzes competitors, and researches your market — fully automated." },
            { n: "3", title: "Get your strategy", desc: "Receive a full marketing report with actionable insights, keywords, and growth opportunities." },
          ].map(s => (
            <div key={s.n} className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#275fe8] text-white font-black text-lg flex items-center justify-center mx-auto mb-5 shadow-md shadow-blue-200">
                {s.n}
              </div>
              <h3 className="font-bold text-slate-900 mb-2">{s.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA banner */}
      <section className="bg-[#0f172a] mx-6 md:mx-12 mb-20 rounded-3xl px-8 py-14 text-center">
        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-4">
          Ready to outmarket your competitors?
        </h2>
        <p className="text-slate-400 mb-8 text-sm leading-relaxed">
          Sign in to access your AI marketing command centre.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 bg-[#275fe8] hover:bg-[#1a4fd0] text-white font-bold px-8 py-4 rounded-2xl transition text-sm"
        >
          Sign In to Platform
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><polyline points="9 18 15 12 9 6"/></svg>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 px-6 md:px-12 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-900 tracking-tight">Snappy<span className="text-[#275fe8]">marketer</span></span>
          <span className="text-slate-300">·</span>
          <span className="text-slate-400 text-sm">© {new Date().getFullYear()}</span>
        </div>
        <Link href="/login" className="text-sm font-semibold text-[#275fe8] hover:underline underline-offset-2">
          Sign In to Platform →
        </Link>
      </footer>
    </div>
  );
}
