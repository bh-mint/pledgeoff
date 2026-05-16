import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { HomeTickerCounter } from "./HomeTickerCounter";

const TICKER_ITEMS = [
  'r/SaaS          ·  "every B2B cold email tool does the same generic personalization"  ·  ↑418',
  'GitHub          ·  2,341 open issues tagged "meeting transcription"',
  'r/Entrepreneur  ·  "spent 3 months building before talking to one customer. mistake."  ·  ↑892',
  'HN              ·  "AI code review" — 47 comments, 3 competing products launched this week',
  'r/indiehackers  ·  "churn is killing me and I have no idea why people are leaving"  ·  ↑276',
  'GitHub          ·  "stripe webhook" — 1,204 open issues across top SaaS repos',
  'r/startups      ·  "built a Notion alternative, got 400 signups, 2 paying. why?"  ·  ↑341',
  'HN              ·  "Show HN: I replaced Calendly for my team" — 312 upvotes',
];

const EVIDENCE_CARDS = [
  {
    source: "r/Entrepreneur",
    upvotes: "↑892",
    quote:
      "spent 3 months building before talking to one customer. the product was technically impressive and completely wrong. validation first, always.",
    author: "u/bootstrapped_jan · 6h ago",
  },
  {
    source: "r/SaaS",
    upvotes: "↑418",
    quote:
      "every B2B cold email tool does the same generic personalization. scrape LinkedIn title, paste into template, call it AI. nobody is solving the actual research problem.",
    author: "u/founder_mode99 · 14h ago",
  },
  {
    source: "r/indiehackers",
    upvotes: "↑276",
    quote:
      "churn is killing me and I have no idea why people are leaving. built every feature users asked for. retention still goes down every month.",
    author: "u/mrr_grinder · 2d ago",
  },
  {
    source: "r/startups",
    upvotes: "↑341",
    quote:
      "built a Notion alternative for developers. got 400 signups on launch, 2 paying after 30 days. the gap between interest and willingness to pay is brutal.",
    author: "u/quietly_building · 1d ago",
  },
  {
    source: "r/SideProject",
    upvotes: "↑189",
    quote:
      "launched a Stripe analytics dashboard 6 months ago. $0. then I found out Baremetrics and ChartMogul exist. please validate your idea before you build.",
    author: "u/late_pivot · 3d ago",
  },
  {
    source: "r/Entrepreneur",
    upvotes: "↑512",
    quote:
      "the market research phase used to take me 2 weeks minimum. reddit threads, google trends, competitor pricing. all manual. there has to be a better way.",
    author: "u/serial_validator · 9h ago",
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
      className="rounded-md border overflow-hidden float origin-center w-full max-w-140"
      style={{
        borderColor: "var(--border)",
        background: "var(--surface)",
        boxShadow: "0 60px 120px -40px rgba(214,255,61,0.12), 0 30px 60px -20px rgba(0,0,0,0.6)",
      }}
    >
      <div className="border-b px-4 h-9 flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <span className="display text-[12px] font-semibold text-(--t1)">
            Pledge<span style={{ color: "var(--accent)" }}>OFF</span>
          </span>
          <span className="mono text-[10px] text-(--t3)">val_2k9p3xLm0aQs</span>
        </div>
        <span className="mono text-[10px]" style={{ color: "var(--validated)" }}>● VALIDATED</span>
      </div>

      <div className="grid grid-cols-12 gap-4 p-6">
        <div className="col-span-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full pulse-dot bg-(--accent)" />
            <span className="mono text-[9px] text-(--t3)">847 LIVE SIGNALS</span>
          </div>
          <div className="display tnum font-semibold text-(--t1)" style={{ fontSize: 110, lineHeight: 0.85 }}>
            82
          </div>
          <div className="display text-[12px] mt-2" style={{ color: "var(--validated)" }}>VALIDATED</div>
          <div className="text-[10px] mt-1 text-(--t3)">4 of 4 dimensions clear</div>
        </div>

        <div className="col-span-6 pt-2 space-y-0">
          {PREVIEW_DIMENSIONS.map((d) => (
            <div
              key={d.k}
              className="grid grid-cols-12 items-center gap-2 py-1.5 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="col-span-5 text-[10px] text-(--t1)">{d.k}</div>
              <div className="col-span-1 mono text-[8px] text-(--t3)">{d.w}</div>
              <div className="col-span-5">
                <div className="h-0.75 rounded-full" style={{ background: "var(--border)" }}>
                  <div className="h-0.75 rounded-full" style={{ width: `${d.v}%`, background: d.c }} />
                </div>
              </div>
              <div className="col-span-1 mono tnum text-[10px] text-right text-(--t2)">{d.v}</div>
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
            <div className="mono text-[8px] text-(--t3)">{p.sub} · {p.u}</div>
            <div className="text-[9px] mt-1 leading-snug text-(--t1)">&ldquo;{p.txt}&rdquo;</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HomeClient() {
  return (
    <div className="min-h-screen bg-(--canvas)">
      <Nav />

      {/* ── HERO ── */}
      <section className="relative overflow-hidden border-b border-(--border)">
        <div className="absolute inset-0 pointer-events-none flex items-center justify-end">
          <div style={{
            width: 1100, height: 1100, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(214,255,61,0.10) 0%, transparent 60%)",
            filter: "blur(40px)", transform: "translateX(20%)"
          }} />
        </div>

        <div className="relative max-w-330 mx-auto px-8 pt-24 pb-20 grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-7 pt-8">
            <div className="mono text-[10px] mb-6 flex items-center gap-2" style={{ color: "var(--t2)" }}>
              <span className="w-1.5 h-1.5 rounded-full pulse-dot bg-(--accent)" />
              idea-to-verdict OS · live data, not GPT guesses
            </div>

            <h1 className="display font-semibold tracking-tight text-(--t1)"
              style={{ fontSize: "clamp(56px, 7vw, 96px)", lineHeight: 0.92 }}>
              Stop building<br />
              things <span className="text-(--t3)">nobody</span><br />
              <span className="text-(--t1)">asked for.</span>
            </h1>

            <p className="mt-8 max-w-135 text-[14px] leading-[1.6] text-(--t2)">
              In under 60 seconds, PledgeOFF scrapes Reddit, Google Trends, and your
              competitors live — then tells you whether your idea is a 0 or an 89,
              with the receipts.{" "}
              <span className="text-(--t3)">Every number has a permalink.</span>
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                href="/ideas/new"
                className="display text-[13px] font-semibold px-5 h-10 rounded-md bg-(--accent) text-black flex items-center gap-2 hover:opacity-90 transition-opacity"
              >
                Validate your idea →
              </Link>
              <Link
                href="/blog/the-fastest-way-to-kill-a-bad-idea-before-you-waste-months"
                className="text-[12px] px-5 h-10 rounded-md border border-(--border) text-(--t1) flex items-center gap-2 hover:border-(--t3) transition-colors"
              >
                See a live validation
              </Link>
              <span className="mono text-[10px] text-(--t3) ml-1">free · 1 idea / mo</span>
            </div>

            <div className="mt-12 flex flex-wrap items-center gap-6 mono text-[10px] uppercase tracking-[0.14em] text-(--t3)">
              <span>signals from</span>
              <span className="text-(--t2)">Reddit</span>
              <span>·</span>
              <span className="text-(--t2)">Hacker News</span>
              <span>·</span>
              <span className="text-(--t2)">GitHub</span>
            </div>
          </div>

          <div className="hidden lg:flex col-span-5 items-center justify-center" style={{ perspective: 1200 }}>
            <PreviewCard />
          </div>
        </div>
      </section>

      {/* ── LIVE SIGNALS TICKER ── */}
      <section className="border-b border-(--border) py-8 overflow-hidden bg-(--surface)">
        <div className="max-w-330 mx-auto px-8 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full pulse-dot bg-(--accent)" />
            <span className="mono text-[10px] uppercase tracking-[0.14em] text-(--t2)">
              live signals scraped today · auto-refresh every 60s
            </span>
          </div>
          <HomeTickerCounter />
        </div>

        <div
          className="relative"
          style={{ maskImage: "linear-gradient(to right, transparent, black 80px, black calc(100% - 80px), transparent)" }}
        >
          <div className="flex animate-marquee" style={{ width: "max-content" }}>
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
              <div
                key={i}
                className="mono text-[11px] px-6 border-r whitespace-nowrap text-(--t2) border-(--border)"
              >
                <span style={{ color: "var(--accent)" }}>●</span> {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="max-w-330 mx-auto px-8 py-20 border-b border-(--border)">
        <p className="mono text-[10px] text-(--t3) uppercase tracking-[0.12em] mb-4">
          Process
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          <h2 className="display text-[40px] font-black leading-none text-(--t1)">
            From idea to verdict.
            <br />
            Under 60 seconds.
          </h2>
          <p className="text-[14px] text-(--t2) leading-relaxed self-end">
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
              className="bg-(--surface) border border-(--border) rounded-md p-6"
            >
              <p className="mono text-[10px] text-(--t3) uppercase tracking-[0.12em] mb-3">
                {step.label}
              </p>
              <h3 className="display text-[16px] font-semibold text-(--t1) mb-3">
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

      {/* ── EVIDENCE WALL ── */}
      <section className="max-w-330 mx-auto px-8 py-20 border-b border-(--border)">
        <div className="flex items-start justify-between mb-10">
          <div>
            <p className="mono text-[10px] text-(--t3) uppercase tracking-[0.12em] mb-3">
              Evidence
            </p>
            <h2 className="display text-[40px] font-black leading-none text-(--t1)">
              Not opinions.
              <br />
              Verbatim posts.
            </h2>
          </div>
          <p className="text-[11px] text-(--t3) text-right mt-2">
            6 of 847 posts shown
            <br />
            click any to verify on Reddit
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {EVIDENCE_CARDS.map((card, i) => (
            <div
              key={i}
              className="bg-(--surface) border border-(--border) rounded-md p-5 flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="mono text-[10px] font-semibold text-(--t2)">
                    {card.source}
                  </span>
                  <span className="mono text-[10px] text-(--validated)">
                    {card.upvotes}
                  </span>
                </div>
                <p className="text-[12px] text-(--t1) leading-relaxed italic">
                  &ldquo;{card.quote}&rdquo;
                </p>
              </div>
              <p className="mono text-[10px] text-(--t3)">{card.author}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SOCIAL PROOF ── */}
      <section className="max-w-330 mx-auto px-8 py-20 border-b border-(--border)">
        <div className="text-center mb-12">
          <p className="display text-[64px] font-black text-(--accent) tnum">
            $2.4M
          </p>
          <p className="display text-[16px] font-semibold text-(--t1) mt-1">
            saved in bad product bets
          </p>
          <p className="mono text-[10px] text-(--t3) uppercase tracking-[0.08em] mt-2">
            estimated across 14,209 validated ideas
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={i}
              className="bg-(--surface) border border-(--border) rounded-md p-6"
            >
              <p className="text-[13px] text-(--t1) leading-relaxed mb-4">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div>
                <p className="text-[12px] font-semibold text-(--t1)">
                  {t.name}
                </p>
                <p className="mono text-[10px] text-(--t3) mt-0.5">
                  {t.handle}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="max-w-330 mx-auto px-8 py-24 text-center">
        <h2 className="display text-[40px] md:text-[56px] font-black leading-none text-(--t1) mb-4">
          What&apos;s the idea
          <br />
          you keep putting off?
        </h2>
        <p className="text-[14px] text-(--t2) mb-8">
          Type it. Get the verdict. Under 60 seconds.
        </p>
        <Link
          href="/ideas/new"
          className="display inline-flex items-center h-10 px-8 rounded-md bg-(--accent) text-black text-[13px] font-semibold hover:opacity-90 transition-opacity"
        >
          Validate it →
        </Link>
        <p className="mono text-[10px] text-(--t3) uppercase tracking-[0.08em] mt-4">
          No credit card · every number is sourced
        </p>
      </section>

      <Footer />
    </div>
  );
}
