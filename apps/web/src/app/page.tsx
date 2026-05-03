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

export default function LandingPage() {
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
      <section className="max-w-[1320px] mx-auto px-8 pt-20 pb-24">
        <p className="mono text-[11px] text-[var(--t3)] uppercase tracking-[0.12em] mb-6">
          Decision Intelligence · GO / KILL / PIVOT
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div>
            <h1 className="display text-[64px] md:text-[80px] font-black leading-[0.95] text-[var(--t1)] mb-6">
              Kill bad ideas
              <br />
              before they
              <br />
              <span className="text-[var(--accent)]">kill you.</span>
            </h1>

            <p className="text-[17px] text-[var(--t2)] leading-relaxed max-w-[480px] mb-8">
              847 live signals from Reddit and GitHub decide in 15 seconds what
              would take you 4 months to discover.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <button
                onClick={() => setModalOpen(true)}
                className="display h-11 px-6 rounded-md bg-[var(--accent)] text-black text-[14px] font-semibold hover:opacity-90 transition-opacity"
              >
                Get early access
              </button>
              <Link
                href="/blog"
                className="display h-11 px-6 rounded-md border border-[var(--border)] text-[var(--t1)] text-[14px] font-medium hover:border-[var(--t3)] transition-colors flex items-center justify-center"
              >
                Read the blog
              </Link>
            </div>

            <p className="mono text-[11px] text-[var(--t3)] uppercase tracking-[0.08em]">
              No credit card · 15 seconds · Every claim is sourced
            </p>

            <div className="grid grid-cols-3 gap-4 mt-10 pt-8 border-t border-[var(--border)]">
              {[
                { value: "14,209", label: "ideas validated" },
                { value: "3.1s", label: "avg decision time" },
                { value: "94%", label: "agree with verdict" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="display text-[28px] font-black text-[var(--t1)] tnum">
                    {stat.value}
                  </p>
                  <p className="mono text-[10px] text-[var(--t3)] uppercase tracking-[0.08em] mt-1">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Floating verdict cards */}
          <div className="hidden lg:flex flex-col gap-3 pt-8">
            {[
              { verdict: "GO", symbol: "●", color: "var(--validated)", idea: "AI meal planner for gym schedules", score: 82 },
              { verdict: "KILL", symbol: "✕", color: "var(--kill)", idea: "Another todo app for teams", score: 31 },
              { verdict: "PIVOT", symbol: "↻", color: "var(--caution)", idea: "B2B invoicing for freelancers", score: 57 },
            ].map((card) => (
              <div
                key={card.verdict}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-md p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="mono text-[11px] font-semibold uppercase"
                    style={{ color: card.color }}
                  >
                    {card.symbol} {card.verdict}
                  </span>
                  <span className="text-[13px] text-[var(--t2)]">
                    {card.idea}
                  </span>
                </div>
                <span
                  className="display text-[22px] font-black tnum"
                  style={{ color: card.color }}
                >
                  {card.score}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LIVE SIGNALS TICKER ── */}
      <section className="border-y border-[var(--border)] py-3 overflow-hidden bg-[var(--surface)]">
        <div className="flex gap-8 animate-marquee whitespace-nowrap">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span
              key={i}
              className="mono text-[11px] text-[var(--t3)] shrink-0"
            >
              {item}
            </span>
          ))}
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
          <p className="text-[15px] text-[var(--t2)] leading-relaxed self-end">
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
              <h3 className="display text-[18px] font-semibold text-[var(--t1)] mb-3">
                {step.title}
              </h3>
              <p className="text-[13px] text-[var(--t2)] leading-relaxed mb-4">
                {step.body}
              </p>
              <p className="mono text-[12px] text-[var(--t3)] bg-[var(--canvas)] border border-[var(--border)] rounded px-3 py-2">
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
          <p className="text-[12px] text-[var(--t3)] text-right mt-2">
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
                  <span className="mono text-[11px] font-semibold text-[var(--t2)]">
                    {card.source}
                  </span>
                  <span className="mono text-[10px] text-[var(--validated)]">
                    {card.upvotes}
                  </span>
                </div>
                <p className="text-[13px] text-[var(--t1)] leading-relaxed italic">
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
          <p className="display text-[18px] font-semibold text-[var(--t1)] mt-1">
            saved in bad product bets
          </p>
          <p className="mono text-[11px] text-[var(--t3)] uppercase tracking-[0.08em] mt-2">
            estimated across 14,209 validated ideas
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={i}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-md p-6"
            >
              <p className="text-[14px] text-[var(--t1)] leading-relaxed mb-4">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div>
                <p className="text-[13px] font-semibold text-[var(--t1)]">
                  {t.name}
                </p>
                <p className="mono text-[11px] text-[var(--t3)] mt-0.5">
                  {t.handle}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING PREVIEW ── */}
      <section className="max-w-[1320px] mx-auto px-8 py-20 border-b border-[var(--border)]">
        <p className="mono text-[10px] text-[var(--t3)] uppercase tracking-[0.12em] mb-4">
          Pricing
        </p>
        <h2 className="display text-[40px] font-black leading-[1] text-[var(--t1)] mb-12">
          Free until you&apos;re sure.
          <br />
          Then €19.99.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-md p-6">
            <p className="text-[13px] font-semibold text-[var(--t1)] mb-1">Free</p>
            <p className="mono text-[11px] text-[var(--t3)] mb-4">Kick the tires</p>
            <p className="display text-[36px] font-black text-[var(--t1)] mb-1">€0</p>
            <p className="mono text-[11px] text-[var(--t3)] mb-6">forever</p>
            <button
              onClick={() => setModalOpen(true)}
              className="w-full h-9 rounded-md border border-[var(--border)] text-[13px] text-[var(--t1)] hover:border-[var(--t3)] transition-colors mb-5"
            >
              Start free
            </button>
            <ul className="space-y-2 text-[13px]">
              {["3 validations / month", "Reddit + Trends signals"].map((f) => (
                <li key={f} className="flex items-center gap-2 text-[var(--t2)]">
                  <span className="text-[var(--validated)]">✓</span> {f}
                </li>
              ))}
              {["Competitor matrix", "Revenue simulator", "AI co-founder"].map((f) => (
                <li key={f} className="flex items-center gap-2 text-[var(--t3)]">
                  <span>—</span> {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--accent)]/40 rounded-md p-6 relative">
            <span className="absolute top-4 right-4 mono text-[9px] text-[var(--accent)] uppercase tracking-[0.12em] bg-[var(--accent)]/10 px-2 py-0.5 rounded">
              ● RECOMMENDED
            </span>
            <p className="text-[13px] font-semibold text-[var(--t1)] mb-1">Pro</p>
            <p className="mono text-[11px] text-[var(--t3)] mb-4">For serious founders</p>
            <p className="display text-[36px] font-black text-[var(--t1)] mb-1">€19.99</p>
            <p className="mono text-[11px] text-[var(--t3)] mb-6">/mo · cancel anytime</p>
            <button
              onClick={() => setModalOpen(true)}
              className="display w-full h-9 rounded-md bg-[var(--accent)] text-black text-[13px] font-semibold hover:opacity-90 transition-opacity mb-5"
            >
              Start Pro trial
            </button>
            <ul className="space-y-2 text-[13px]">
              {[
                "Unlimited validations",
                "All 5 signal sources",
                "Competitor matrix + trends",
                "Revenue simulator",
                "Niche goldmine feed",
                "AI co-founder mode",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-[var(--t2)]">
                  <span className="text-[var(--validated)]">✓</span> {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-md p-6">
            <p className="text-[13px] font-semibold text-[var(--t1)] mb-1">Agency</p>
            <p className="mono text-[11px] text-[var(--t3)] mb-4">Vet client briefs</p>
            <p className="display text-[36px] font-black text-[var(--t1)] mb-1">€99</p>
            <p className="mono text-[11px] text-[var(--t3)] mb-6">/mo · 5 seats</p>
            <button className="w-full h-9 rounded-md border border-[var(--border)] text-[13px] text-[var(--t1)] hover:border-[var(--t3)] transition-colors mb-5">
              Talk to us
            </button>
            <ul className="space-y-2 text-[13px]">
              {[
                "Everything in Pro",
                "5 seats included",
                "White-label PDF reports",
                "API access",
                "Priority scraping queue",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-[var(--t2)]">
                  <span className="text-[var(--validated)]">✓</span> {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="max-w-[1320px] mx-auto px-8 py-24 text-center">
        <h2 className="display text-[48px] md:text-[64px] font-black leading-[1] text-[var(--t1)] mb-4">
          What&apos;s the idea
          <br />
          you keep putting off?
        </h2>
        <p className="text-[17px] text-[var(--t2)] mb-8">
          Type it. Get the verdict. 15 seconds.
        </p>
        <button
          onClick={() => setModalOpen(true)}
          className="display h-12 px-8 rounded-md bg-[var(--accent)] text-black text-[15px] font-semibold hover:opacity-90 transition-opacity"
        >
          Validate it →
        </button>
        <p className="mono text-[11px] text-[var(--t3)] uppercase tracking-[0.08em] mt-4">
          No credit card · every number is sourced
        </p>
      </section>

      <Footer />
    </div>
  );
}
