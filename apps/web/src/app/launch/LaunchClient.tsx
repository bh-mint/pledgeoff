import Link from "next/link";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";

const STEPS = [
  {
    label: "01 / INPUT",
    title: "Describe your idea",
    body: "One sentence. No deck. The AI extracts the signal from natural language.",
    detail: '"AI meal planner that adapts to your gym schedule"',
  },
  {
    label: "02 / SCAN",
    title: "Live signals in 15 seconds",
    body: "Reddit complaints, GitHub issues, Google Trends momentum — scanned in real-time across the sources that matter.",
    detail: "Reddit · GitHub · Trends",
  },
  {
    label: "03 / VERDICT",
    title: "GO / KILL / PIVOT",
    body: "A weighted score across 4 dimensions. With the verbatim evidence. Traceable to the exact post that moved the needle.",
    detail: "82  GO",
  },
];

const TESTIMONIALS = [
  {
    quote: "Killed an idea in 12 minutes that I'd have spent 4 months on. Paid for itself a thousand times.",
    name: "Aria Lehmann",
    handle: "@arialehmann · founder, Linecount",
  },
  {
    quote: "The Reddit evidence wall is the only validation tool I've ever forwarded to a co-founder unedited.",
    name: "Marcus Chen",
    handle: "@marcus.codes · ex-Stripe, building Folder",
  },
  {
    quote: "Score went from 71 to 89 after I narrowed the audience. I would have shipped to the wrong people.",
    name: "Yuki Tanaka",
    handle: "@yukibuilds · solo, $14k MRR",
  },
];

export function LaunchClient() {
  return (
    <div className="min-h-screen bg-(--canvas)">
      <PublicNav />

      {/* ── HERO ── */}
      <section className="relative overflow-hidden border-b border-(--border)">
        <div className="absolute inset-0 pointer-events-none flex items-center justify-end">
          <div style={{
            width: 900, height: 900, borderRadius: "50%",
            background: "radial-gradient(circle, color-mix(in srgb, var(--accent) 10%, transparent) 0%, transparent 60%)",
            filter: "blur(40px)", transform: "translateX(20%)",
          }} />
        </div>

        <div className="relative max-w-330 mx-auto px-8 pt-20 pb-16">
          <div className="mono text-[10px] mb-5 flex items-center gap-2" style={{ color: "var(--t2)" }}>
            <span className="w-1.5 h-1.5 rounded-full pulse-dot bg-(--accent)" />
            featured on product hunt · live signals, not GPT guesses
          </div>

          <h1
            className="display font-semibold tracking-tight text-(--t1) mb-6"
            style={{ fontSize: "clamp(48px, 6vw, 80px)", lineHeight: 0.94 }}
          >
            GO / KILL / PIVOT<br />
            <span className="text-(--t3)">your startup idea</span><br />
            in 15 seconds.
          </h1>

          <p className="max-w-130 text-[14px] leading-[1.6] text-(--t2) mb-8">
            PledgeOFF scans live signals from Reddit, GitHub, and Google Trends —
            then tells you whether your idea is a 12 or an 89, with the receipts.
            Every number has a source. Every verdict is traceable.
          </p>

          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Link
              href="/ideas/new"
              className="display text-[13px] font-semibold px-6 h-11 rounded-md bg-(--accent) text-black flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              Validate your idea free →
            </Link>
            <Link
              href="/pricing"
              className="text-[12px] px-5 h-11 rounded-md border border-(--border) text-(--t1) flex items-center hover:border-(--t3) transition-colors"
            >
              See pricing
            </Link>
          </div>

          <p className="mono text-[10px] text-(--t3) uppercase tracking-[0.1em]">
            Free tier · no credit card · 3 validations included
          </p>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="max-w-330 mx-auto px-8 py-16 border-b border-(--border)">
        <p className="mono text-[10px] text-(--t3) uppercase tracking-[0.12em] mb-10">
          How it works
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((step) => (
            <div
              key={step.label}
              className="bg-(--surface) border border-(--border) rounded-md p-6"
            >
              <p className="mono text-[10px] text-(--t3) uppercase tracking-[0.12em] mb-3">
                {step.label}
              </p>
              <h3 className="display text-[15px] font-semibold text-(--t1) mb-3">
                {step.title}
              </h3>
              <p className="text-[12px] text-(--t2) leading-relaxed mb-4">
                {step.body}
              </p>
              <p className="mono text-[11px] text-(--t3) bg-(--canvas) border border-(--border) rounded px-3 py-2">
                {step.detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SOCIAL PROOF ── */}
      <section className="max-w-330 mx-auto px-8 py-16 border-b border-(--border)">
        <p className="mono text-[10px] text-(--t3) uppercase tracking-[0.12em] mb-10">
          What founders say
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={i}
              className="bg-(--surface) border border-(--border) rounded-md p-6"
            >
              <p className="text-[13px] text-(--t1) leading-relaxed mb-4">
                &ldquo;{t.quote}&rdquo;
              </p>
              <p className="text-[12px] font-semibold text-(--t1)">{t.name}</p>
              <p className="mono text-[10px] text-(--t3) mt-0.5">{t.handle}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="max-w-330 mx-auto px-8 py-20 text-center">
        <p className="mono text-[10px] text-(--t3) uppercase tracking-[0.12em] mb-4">
          Start now
        </p>
        <h2 className="display text-[40px] md:text-[52px] font-black leading-none text-(--t1) mb-4">
          What&apos;s the idea<br />you keep putting off?
        </h2>
        <p className="text-[14px] text-(--t2) mb-8">
          Type it. Get the verdict. Under 60 seconds.
        </p>
        <Link
          href="/ideas/new"
          className="display inline-flex items-center h-11 px-8 rounded-md bg-(--accent) text-black text-[13px] font-semibold hover:opacity-90 transition-opacity"
        >
          Validate it free →
        </Link>
        <p className="mono text-[10px] text-(--t3) uppercase tracking-[0.08em] mt-4">
          No credit card · every number is sourced
        </p>
      </section>

      <Footer />
    </div>
  );
}
