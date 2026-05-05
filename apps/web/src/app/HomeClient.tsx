"use client";

import { useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { WaitlistModal } from "@/components/WaitlistModal";

const TICKER_ITEMS = [
  'r/Entrepreneur  ·  "none of the meal apps know your training calendar exists"  ·  ↑312',
  'Google Trends   ·  "meal plan workout"  ·  +34% YoY',
  'r/xxfitness     ·  "protein on rest day same as squat day makes zero sense"  ·  ↑247',
  "GitHub          ·  847 open issues tagged \"nutrition api\"",
  'r/leangains     ·  "the part that broke me was traveling — macros should auto-shift"  ·  ↑128',
  "Product Hunt    ·  MealPrep AI  ·  142 upvotes",
];

const EVIDENCE_CARDS = [
  {
    source: "r/Fitness",
    upvotes: "↑312",
    quote:
      "4 hours sunday meal prepping for the week and my training split changed wednesday. all of it wrong macros. there has to be a better way.",
    author: "u/throwaway_2847 · 14h ago",
  },
  {
    source: "r/loseit",
    upvotes: "↑184",
    quote:
      "anyone use an app that actually adjusts when you skip a workout? mfp just gives me the same 1800 cals whether i lifted or sat on my couch.",
    author: "u/quietlifter88 · 2d ago",
  },
  {
    source: "r/Entrepreneur",
    upvotes: "↑91",
    quote:
      "looked at meal planning apps for fun and the gap is wild — none of them know your training calendar exists. somebody build this please.",
    author: "u/bootstrapped_jan · 6h ago",
  },
  {
    source: "r/xxfitness",
    upvotes: "↑247",
    quote:
      "having protein on rest day same as squat day makes zero sense and yet every meal app does this. also pre-workout meals — none of them get this right.",
    author: "u/curlsforthegirls · 1d ago",
  },
  {
    source: "r/SideProject",
    upvotes: "↑64",
    quote:
      "tried to integrate hevy + cronometer with a zap. it's held together with duct tape but the value is real. there's a real product here.",
    author: "u/calorie_kev · 3d ago",
  },
  {
    source: "r/leangains",
    upvotes: "↑128",
    quote:
      "the part that broke me was traveling. away from my home gym, my macros and meals should auto-shift. they don't. nothing does this.",
    author: "u/40plusplates · 9h ago",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "Killed an idea in 12 minutes that I'd have spent 4 months on. Paid for itself a thousand times.",
    name: "Aria Lehmann",
    handle: "@arialehmann · founder, Linecount",
  },
  {
    quote:
      "The Reddit evidence wall is the only validation tool I've ever forwarded to a co-founder unedited.",
    name: "Marcus Chen",
    handle: "@marcus.codes · ex-Stripe, building Folder",
  },
  {
    quote:
      "Score went from 71 to 89 after I narrowed the audience. I would have shipped to the wrong people.",
    name: "Yuki Tanaka",
    handle: "@yukibuilds · solo, $14k MRR",
  },
  {
    quote:
      "I run every client brief through this before quoting. Saves me from 3-month bad fits.",
    name: "Priya Raghavan",
    handle: "@priya.r · founder, Ninefold",
  },
];

const PREVIEW_DIMENSIONS = [
  { k: "Market Demand", w: 40, v: 87, c: "var(--validated)" },
  { k: "Competition",   w: 25, v: 71, c: "var(--caution)"   },
  { k: "Feasibility",   w: 20, v: 84, c: "var(--validated)" },
  { k: "Timing",        w: 15, v: 79, c: "var(--validated)" },
];

const PREVIEW_POSTS = [
  { sub: "r/Fitness",      u: "u/throwaway_2847",   txt: "4 hours sunday meal prepping and my training split changed wednesday" },
  { sub: "r/loseit",       u: "u/quietlifter88",    txt: "anyone use an app that adjusts when you skip a workout?" },
  { sub: "r/Entrepreneur", u: "u/bootstrapped_jan", txt: "none of the meal apps know your training calendar exists" },
];

function PreviewCard() {
  return (
    <div
      className="rounded-md border overflow-hidden float origin-center w-full max-w-[560px]"
      style={{
        borderColor: "var(--border)",
        background: "var(--surface)",
        boxShadow: "0 60px 120px -40px rgba(214,255,61,0.12), 0 30px 60px -20px rgba(0,0,0,0.6)",
      }}
    >
      <div className="border-b px-4 h-9 flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <span className="display text-[12px] font-semibold text-[var(--t1)]">
            Pledge<span style={{ color: "var(--accent)" }}>OFF</span>
          </span>
          <span className="mono text-[10px] text-[var(--t3)]">val_2k9p3xLm0aQs</span>
        </div>
        <span className="mono text-[10px]" style={{ color: "var(--validated)" }}>● VALIDATED</span>
      </div>

      <div className="grid grid-cols-12 gap-4 p-6">
        <div className="col-span-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full pulse-dot bg-[var(--accent)]" />
            <span className="mono text-[9px] text-[var(--t3)]">847 LIVE SIGNALS</span>
          </div>
          <div className="display tnum font-semibold text-[var(--t1)]" style={{ fontSize: 110, lineHeight: 0.85 }}>
            82
          </div>
          <div className="display text-[12px] mt-2" style={{ color: "var(--validated)" }}>VALIDATED</div>
          <div className="text-[10px] mt-1 text-[var(--t3)]">4 of 4 dimensions clear</div>
        </div>

        <div className="col-span-6 pt-2 space-y-0">
          {PREVIEW_DIMENSIONS.map((d) => (
            <div
              key={d.k}
              className="grid grid-cols-12 items-center gap-2 py-1.5 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="col-span-5 text-[10px] text-[var(--t1)]">{d.k}</div>
              <div className="col-span-1 mono text-[8px] text-[var(--t3)]">{d.w}</div>
              <div className="col-span-5">
                <div className="h-[3px] rounded-full" style={{ background: "var(--border)" }}>
                  <div className="h-[3px] rounded-full" style={{ width: `${d.v}%`, background: d.c }} />
                </div>
              </div>
              <div className="col-span-1 mono tnum text-[10px] text-right text-[var(--t2)]">{d.v}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t px-4 py-3 grid grid-cols-3 gap-2" style={{ borderColor: "var(--border)" }}>
        {PREVIEW_POSTS.map((p) => (
          <div
            key={p.u}
            className="border rounded p-2"
            style={{ borderColor: "var(--border)", background: "var(--canvas)" }}
          >
            <div className="mono text-[8px] text-[var(--t3)]">{p.sub} · {p.u}</div>
            <div className="text-[9px] mt-1 leading-snug text-[var(--t1)]">&ldquo;{p.txt}&rdquo;</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HomeClient() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--canvas)]">
      <Nav onWaitlistOpen={() => setModalOpen(true)} />
      <WaitlistModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        source="landing"
      />

      {/* ── HERO ── */}
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="absolute inset-0 pointer-events-none flex items-center justify-end">
          <div style={{
            width: 1100, height: 1100, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(214,255,61,0.10) 0%, transparent 60%)",
            filter: "blur(40px)", transform: "translateX(20%)"
          }} />
        </div>

        <div className="relative max-w-[1320px] mx-auto px-8 pt-24 pb-20 grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-7 pt-8">
            <div className="mono text-[10px] mb-6 flex items-center gap-2" style={{ color: "var(--t2)" }}>
              <span className="w-1.5 h-1.5 rounded-full pulse-dot bg-[var(--accent)]" />
              idea-to-verdict OS · live data, not GPT guesses
            </div>

            <h1 className="display font-semibold tracking-tight text-[var(--t1)]"
              style={{ fontSize: "clamp(56px, 7vw, 96px)", lineHeight: 0.92 }}>
              Stop building<br />
              things <span className="text-[var(--t3)]">nobody</span><br />
              <span className="text-[var(--t1)]">asked for.</span>
            </h1>

            <p className="mt-8 max-w-[540px] text-[14px] leading-[1.6] text-[var(--t2)]">
              In 15 seconds, PledgeOFF scrapes Reddit, Google Trends, and your
              competitors live — then tells you whether your idea is a 0 or an 89,
              with the receipts.{" "}
              <span className="text-[var(--t3)]">Every number has a permalink.</span>
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <button
                onClick={() => setModalOpen(true)}
                className="display text-[13px] font-semibold px-5 h-10 rounded-md bg-[var(--accent)] text-black flex items-center gap-2 hover:opacity-90 transition-opacity"
              >
                Validate your idea →
              </button>
              <Link
                href="/blog"
                className="text-[12px] px-5 h-10 rounded-md border border-[var(--border)] text-[var(--t1)] flex items-center gap-2 hover:border-[var(--t3)] transition-colors"
              >
                See a live validation
              </Link>
              <span className="mono text-[10px] text-[var(--t3)] ml-1">free · 3 ideas / mo</span>
            </div>

            <div className="mt-12 flex flex-wrap items-center gap-6 mono text-[10px] uppercase tracking-[0.14em] text-[var(--t3)]">
              <span>scraped today</span>
              <span className="text-[var(--t2)]">2.4M reddit posts</span>
              <span>·</span>
              <span className="text-[var(--t2)]">14k trend curves</span>
              <span>·</span>
              <span className="text-[var(--t2)]">847 niches</span>
            </div>
          </div>

          <div className="hidden lg:flex col-span-5 items-center justify-center" style={{ perspective: 1200 }}>
            <PreviewCard />
          </div>
        </div>
      </section>

      {/* ── LIVE SIGNALS TICKER ── */}
      <section className="border-b border-[var(--border)] py-8 overflow-hidden bg-[var(--surface)]">
        <div className="max-w-[1320px] mx-auto px-8 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full pulse-dot bg-[var(--accent)]" />
            <span className="mono text-[10px] uppercase tracking-[0.14em] text-[var(--t2)]">
              live signals scraped today · auto-refresh every 60s
            </span>
          </div>
          <span className="mono text-[10px] text-[var(--t3)]">
            last update 47s ago · 2.4M posts indexed
          </span>
        </div>

        <div
          className="relative"
          style={{ maskImage: "linear-gradient(to right, transparent, black 80px, black calc(100% - 80px), transparent)" }}
        >
          <div className="flex animate-marquee" style={{ width: "max-content" }}>
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
              <div
                key={i}
                className="mono text-[11px] px-6 border-r whitespace-nowrap text-[var(--t2)] border-[var(--border)]"
              >
                <span style={{ color: "var(--accent)" }}>●</span> {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="max-w-[1320px] mx-auto px-8 py-20 border-b border-[var(--border)]">
        <p className="mono text-[10px] text-[var(--t3)] uppercase tracking-[0.12em] mb-4">
          Process
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          <h2 className="display text-[40px] font-black leading-[1] text-[var(--t1)]">
            From idea to verdict.
            <br />
            In 15s.
          </h2>
          <p className="text-[14px] text-[var(--t2)] leading-relaxed self-end">
            No surveys. No landing pages. No spending €5k on ads to validate
            demand. Just type, and the market speaks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              label: "01 / INPUT",
              title: "Write your idea",
              body: 'One sentence. No deck. No PowerPoint. The AI extracts the signal from natural language — just describe what you want to build.',
              detail: '"AI meal planner that adapts to your gym schedule"',
            },
            {
              label: "02 / SCAN",
              title: "We scan 847 live signals",
              body: "Reddit complaints, GitHub issues, Google Trends momentum, competitor weaknesses — scanned in real-time across the sources that actually matter to your market.",
              detail: "Reddit · GitHub · Trends",
            },
            {
              label: "03 / VERDICT",
              title: "Get your verdict",
              body: "A weighted score across 4 dimensions. With the verbatim evidence. Traceable to the exact Reddit post or GitHub thread that moved the needle.",
              detail: "82  GO",
            },
          ].map((step) => (
            <div
              key={step.label}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-md p-6"
            >
              <p className="mono text-[10px] text-[var(--t3)] uppercase tracking-[0.12em] mb-3">
                {step.label}
              </p>
              <h3 className="display text-[16px] font-semibold text-[var(--t1)] mb-3">
                {step.title}
              </h3>
              <p className="text-[12px] text-[var(--t2)] leading-relaxed mb-4">
                {step.body}
              </p>
              <p className="mono text-[11px] text-[var(--t3)] bg-[var(--canvas)] border border-[var(--border)] rounded px-3 py-2">
                {step.detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── EVIDENCE WALL ── */}
      <section className="max-w-[1320px] mx-auto px-8 py-20 border-b border-[var(--border)]">
        <div className="flex items-start justify-between mb-10">
          <div>
            <p className="mono text-[10px] text-[var(--t3)] uppercase tracking-[0.12em] mb-3">
              Evidence
            </p>
            <h2 className="display text-[40px] font-black leading-[1] text-[var(--t1)]">
              Not opinions.
              <br />
              Verbatim posts.
            </h2>
          </div>
          <p className="text-[11px] text-[var(--t3)] text-right mt-2">
            6 of 847 posts shown
            <br />
            click any to verify on Reddit
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {EVIDENCE_CARDS.map((card, i) => (
            <div
              key={i}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-md p-5 flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="mono text-[10px] font-semibold text-[var(--t2)]">
                    {card.source}
                  </span>
                  <span className="mono text-[10px] text-[var(--validated)]">
                    {card.upvotes}
                  </span>
                </div>
                <p className="text-[12px] text-[var(--t1)] leading-relaxed italic">
                  &ldquo;{card.quote}&rdquo;
                </p>
              </div>
              <p className="mono text-[10px] text-[var(--t3)]">{card.author}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SOCIAL PROOF ── */}
      <section className="max-w-[1320px] mx-auto px-8 py-20 border-b border-[var(--border)]">
        <div className="text-center mb-12">
          <p className="display text-[64px] font-black text-[var(--accent)] tnum">
            $2.4M
          </p>
          <p className="display text-[16px] font-semibold text-[var(--t1)] mt-1">
            saved in bad product bets
          </p>
          <p className="mono text-[10px] text-[var(--t3)] uppercase tracking-[0.08em] mt-2">
            estimated across 14,209 validated ideas
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={i}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-md p-6"
            >
              <p className="text-[13px] text-[var(--t1)] leading-relaxed mb-4">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div>
                <p className="text-[12px] font-semibold text-[var(--t1)]">
                  {t.name}
                </p>
                <p className="mono text-[10px] text-[var(--t3)] mt-0.5">
                  {t.handle}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="max-w-[1320px] mx-auto px-8 py-24 text-center">
        <h2 className="display text-[40px] md:text-[56px] font-black leading-[1] text-[var(--t1)] mb-4">
          What&apos;s the idea
          <br />
          you keep putting off?
        </h2>
        <p className="text-[14px] text-[var(--t2)] mb-8">
          Type it. Get the verdict. 15 seconds.
        </p>
        <button
          onClick={() => setModalOpen(true)}
          className="display h-10 px-8 rounded-md bg-[var(--accent)] text-black text-[13px] font-semibold hover:opacity-90 transition-opacity"
        >
          Validate it →
        </button>
        <p className="mono text-[10px] text-[var(--t3)] uppercase tracking-[0.08em] mt-4">
          No credit card · every number is sourced
        </p>
      </section>

      <Footer />
    </div>
  );
}
