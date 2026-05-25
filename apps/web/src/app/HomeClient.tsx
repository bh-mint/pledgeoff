import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { PHBanner } from "@/components/PHBanner";
import { PRICING } from "@/lib/pricing.config";
import { LastValidatedBadge } from "@/components/home/LastValidatedBadge";

const TICKER_ITEMS = [
  { src: "r/SaaS",        txt: '"every B2B cold email tool does the same generic personalization"  ·  ↑418' },
  { src: "GitHub",        txt: '2,341 open issues tagged "meeting transcription"' },
  { src: "r/Entrepreneur", txt: '"spent 3 months building before talking to one customer. mistake."  ·  ↑892' },
  { src: "HN",            txt: '"AI code review" — 47 comments, 3 competing products launched this week' },
  { src: "r/indiehackers", txt: '"churn is killing me and I have no idea why people are leaving"  ·  ↑276' },
  { src: "GitHub",        txt: '"stripe webhook" — 1,204 open issues across top SaaS repos' },
  { src: "r/startups",    txt: '"built a Notion alternative, got 400 signups, 2 paying. why?"  ·  ↑341' },
  { src: "HN",            txt: '"Show HN: I replaced Calendly for my team" — 312 upvotes' },
];

const EVIDENCE_CARDS = [
  {
    source: "r/Entrepreneur",
    subredditUrl: "https://www.reddit.com/r/Entrepreneur/",
    upvotes: "↑892",
    quote:
      "spent 3 months building before talking to one customer. the product was technically impressive and completely wrong. validation first, always.",
    author: "u/bootstrapped_jan · 6h ago",
  },
  {
    source: "r/SaaS",
    subredditUrl: "https://www.reddit.com/r/SaaS/",
    upvotes: "↑418",
    quote:
      "every B2B cold email tool does the same generic personalization. scrape LinkedIn title, paste into template, call it AI. nobody is solving the actual research problem.",
    author: "u/founder_mode99 · 14h ago",
  },
  {
    source: "r/indiehackers",
    subredditUrl: "https://www.reddit.com/r/indiehackers/",
    upvotes: "↑276",
    quote:
      "churn is killing me and I have no idea why people are leaving. built every feature users asked for. retention still goes down every month.",
    author: "u/mrr_grinder · 2d ago",
  },
  {
    source: "r/startups",
    subredditUrl: "https://www.reddit.com/r/startups/",
    upvotes: "↑341",
    quote:
      "built a Notion alternative for developers. got 400 signups on launch, 2 paying after 30 days. the gap between interest and willingness to pay is brutal.",
    author: "u/quietly_building · 1d ago",
  },
  {
    source: "r/SideProject",
    subredditUrl: "https://www.reddit.com/r/SideProject/",
    upvotes: "↑189",
    quote:
      "launched a Stripe analytics dashboard 6 months ago. $0. then I found out Baremetrics and ChartMogul exist. please validate your idea before you build.",
    author: "u/late_pivot · 3d ago",
  },
  {
    source: "r/Entrepreneur",
    subredditUrl: "https://www.reddit.com/r/Entrepreneur/",
    upvotes: "↑512",
    quote:
      "the market research phase used to take me 2 weeks minimum. reddit threads, google trends, competitor pricing. all manual. there has to be a better way.",
    author: "u/serial_validator · 9h ago",
  },
];

const PRODUCT_STATS = [
  { value: "< 90s", label: "Time to verdict", detail: "from idea text to GO / KILL / PIVOT" },
  { value: "3", label: "Signal sources", detail: "Reddit · Hacker News · GitHub" },
  { value: "4", label: "Scoring dimensions", detail: "demand · competition · feasibility · timing" },
  { value: "100%", label: "Evidence traceable", detail: "every number links to its source" },
];

const PREVIEW_DIMENSIONS = [
  { k: "Market Demand", w: 40, v: 87, c: "var(--validated)" },
  { k: "Competition",   w: 25, v: 71, c: "var(--caution)"   },
  { k: "Feasibility",   w: 20, v: 84, c: "var(--validated)" },
  { k: "Timing",        w: 15, v: 79, c: "var(--validated)" },
];

const PREVIEW_POSTS = [
  { sub: "r/SaaS",        u: "u/founder_mode99",    txt: "every cold email tool does the same generic personalization. nobody solves the research problem" },
  { sub: "r/startups",    u: "u/quietly_building",  txt: "400 signups on launch, 2 paying after 30 days. the gap between interest and willingness to pay is brutal" },
  { sub: "r/Entrepreneur", u: "u/bootstrapped_jan", txt: "spent 3 months building before talking to one customer. validation first, always" },
];

function MobilePreviewCard() {
  return (
    <div
      className="rounded-md border overflow-hidden w-full"
      style={{
        borderColor: "var(--border)",
        background: "var(--surface)",
        boxShadow: "0 20px 40px -16px rgba(0,0,0,0.4)",
      }}
    >
      <div className="border-b px-4 h-8 flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
        <span className="mono text-[10px] text-(--t3)">AI code review tool · live verdict</span>
        <span className="mono text-[9px]" style={{ color: "var(--validated)" }}>● GO</span>
      </div>
      <div className="px-4 py-3 flex items-center gap-4">
        <div className="shrink-0">
          <div className="display tnum font-semibold text-(--t1) leading-none" style={{ fontSize: 52 }}>
            82
          </div>
          <div className="display text-[11px] mt-1" style={{ color: "var(--validated)" }}>VALIDATED</div>
        </div>
        <div className="flex-1 space-y-2 pt-1">
          {PREVIEW_DIMENSIONS.slice(0, 2).map((d) => (
            <div key={d.k}>
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-[10px] text-(--t2)">{d.k}</span>
                <span className="mono tnum text-[10px] text-(--t2)">{d.v}</span>
              </div>
              <div className="h-1 rounded-full" style={{ background: "var(--border)" }}>
                <div className="h-1 rounded-full" style={{ width: `${d.v}%`, background: d.c }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PreviewCard() {
  return (
    <div
      className="rounded-md border overflow-hidden float origin-center w-full max-w-140"
      style={{
        borderColor: "var(--border)",
        background: "var(--surface)",
        boxShadow: "0 60px 120px -40px color-mix(in srgb, var(--accent) 12%, transparent), 0 30px 60px -20px rgba(0,0,0,0.6)",
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
            <span className="mono text-[9px] text-(--t3)">LIVE SIGNALS</span>
          </div>
          <div className="display tnum font-semibold text-(--t1)" style={{ fontSize: 110, lineHeight: 0.85 }}>
            82
          </div>
          <div className="display text-[12px] mt-2" style={{ color: "var(--validated)" }}>VALIDATED</div>
          <div className="text-[10px] mt-1 text-(--t3)">AI code review tool for solo devs</div>
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
        {PREVIEW_POSTS.map((p, i) => (
          <div
            key={p.u}
            className="border rounded p-2 reveal"
            style={{
              borderColor: "var(--border)",
              background: "var(--canvas)",
              animationDelay: `${0.8 + i * 0.8}s`,
            }}
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
      <PHBanner />
      <Nav />

      {/* ── HERO ── */}
      <section className="relative overflow-hidden border-b border-(--border)">
        <div className="absolute inset-0 pointer-events-none flex items-center justify-end">
          <div style={{
            width: 1100, height: 1100, borderRadius: "50%",
            background: "radial-gradient(circle, color-mix(in srgb, var(--accent) 10%, transparent) 0%, transparent 60%)",
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
                className="display text-[13px] font-semibold px-5 h-11 rounded-md bg-(--accent) text-black flex items-center gap-2 hover:opacity-90 transition-opacity"
              >
                Validate your idea →
              </Link>
              <Link
                href="/v/561bc83d-00d8-4bf0-a874-9643fa8fbf62"
                className="text-[12px] px-5 h-11 rounded-md border border-(--border) text-(--t1) flex items-center gap-2 hover:border-(--t3) transition-colors"
              >
                See a live verdict →
              </Link>
            </div>
            <p className="mt-3 mono text-[11px] text-(--t3)">
              Sign in with Google — takes 10 seconds · no credit card
            </p>
            <div className="mt-4">
              <LastValidatedBadge />
            </div>

            {/* Mobile preview — visible only below lg breakpoint */}
            <div className="block lg:hidden mt-8">
              <MobilePreviewCard />
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

      {/* ── SIGNALS TICKER ── */}
      <section className="border-b border-(--border) py-8 overflow-hidden bg-(--surface)">
        <div className="max-w-330 mx-auto px-8 mb-4">
          <span className="mono text-[10px] uppercase tracking-[0.14em] text-(--t3)">
            examples of signals scanned · Reddit · Hacker News · GitHub
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
                className="mono text-[12px] px-6 border-r whitespace-nowrap text-(--t1) border-(--border)"
              >
                <span style={{ color: "var(--accent)" }}>●</span>{" "}
                <span className="font-semibold">{item.src}</span>
                {" · "}{item.txt}
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
              title: "We scan thousands of live signals",
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

      {/* ── HOW THE SCORE WORKS ── */}
      <section className="border-b border-(--border)">
        <div className="max-w-330 mx-auto px-8 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
            <div>
              <p className="mono text-[10px] text-(--t3) uppercase tracking-[0.12em] mb-3">
                Score breakdown
              </p>
              <h2 className="display text-[40px] font-black leading-none text-(--t1)">
                What does<br />the score mean?
              </h2>
            </div>
            <p className="text-[14px] text-(--t2) leading-relaxed self-end">
              Every verdict is a weighted composite of 4 real-data dimensions.
              Not a GPT guess — each point is traceable to a live signal.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                num: "01",
                label: "Market Signals",
                desc: "How many people are complaining about this problem right now, and how loudly.",
                color: "var(--validated)",
              },
              {
                num: "02",
                label: "Competitor Weakness",
                desc: "Gaps in existing solutions the market openly complains about on Reddit and GitHub.",
                color: "var(--accent)",
              },
              {
                num: "03",
                label: "Search Demand",
                desc: "Volume of people actively looking for this — growing, flat, or shrinking.",
                color: "var(--caution)",
              },
              {
                num: "04",
                label: "Timing",
                desc: "Whether the category is accelerating or cooling based on trend momentum.",
                color: "var(--t2)",
              },
            ].map((d) => (
              <div
                key={d.num}
                className="border rounded-md p-5 flex flex-col gap-3"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <div className="flex items-center gap-2">
                  <span className="mono text-[10px]" style={{ color: "var(--t3)" }}>{d.num}</span>
                  <div className="flex-1 h-px" style={{ background: d.color, opacity: 0.4 }} />
                </div>
                <p className="display text-[15px] font-semibold text-(--t1)">{d.label}</p>
                <p className="text-[12px] text-(--t2) leading-[1.55]">{d.desc}</p>
              </div>
            ))}
          </div>
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
            6 signals shown
            <br />
            click any to open subreddit
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {EVIDENCE_CARDS.map((card, i) => (
            <a
              key={i}
              href={card.subredditUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-(--surface) border border-(--border) rounded-md p-5 flex flex-col justify-between gap-4 hover:border-(--accent) transition-colors group reveal"
              style={{ animationDelay: `${i * 0.12}s` }}
            >
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="mono text-[10px] font-semibold text-(--t2) group-hover:text-(--accent) transition-colors">
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
            </a>
          ))}
        </div>
      </section>

      {/* ── PRODUCT STATS ── */}
      <section className="max-w-330 mx-auto px-8 py-20 border-b border-(--border)">
        <div className="mb-12">
          <p className="mono text-[10px] text-(--t3) uppercase tracking-[0.12em] mb-3">
            How it works
          </p>
          <h2 className="display text-[40px] font-black leading-none text-(--t1)">
            Built for speed.<br />Backed by data.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px border border-(--border) rounded-md overflow-hidden" style={{ background: "var(--border)" }}>
          {PRODUCT_STATS.map((s, i) => (
            <div
              key={i}
              className="bg-(--bg) p-6 flex flex-col gap-2"
            >
              <p className="display text-[48px] font-black leading-none" style={{ color: "var(--accent)" }}>
                {s.value}
              </p>
              <p className="text-[13px] font-semibold text-(--t1)">
                {s.label}
              </p>
              <p className="mono text-[10px] text-(--t3) leading-relaxed">
                {s.detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHO THIS IS FOR ── */}
      <section className="border-b border-(--border)">
        <div className="max-w-330 mx-auto px-8 py-20">
          <p className="mono text-[10px] text-(--t3) uppercase tracking-[0.12em] mb-10">
            Who it&apos;s for
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px border rounded-md overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--border)" }}>
            {[
              {
                role: "Indie hacker",
                line: "Validate before you build — because one month of wasted effort compounds into six.",
                accent: "var(--validated)",
              },
              {
                role: "PM at a startup",
                line: "Kill bad roadmap items with data, not debate. Give engineering a reason to say no.",
                accent: "var(--accent)",
              },
              {
                role: "Agency founder",
                line: "Vet client briefs before you quote. Stop committing to projects that were dead on arrival.",
                accent: "var(--caution)",
              },
            ].map((p) => (
              <div key={p.role} className="p-8" style={{ background: "var(--surface)" }}>
                <div
                  className="mono text-[10px] uppercase tracking-[0.12em] mb-3"
                  style={{ color: p.accent }}
                >
                  {p.role}
                </div>
                <p className="text-[14px] leading-[1.6]" style={{ color: "var(--t2)" }}>{p.line}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING PREVIEW ── */}
      <section className="max-w-330 mx-auto px-8 py-20 border-b border-(--border)">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <p className="mono text-[10px] text-(--t3) uppercase tracking-[0.12em] mb-3">Pricing</p>
            <h2 className="display text-[40px] font-black leading-none text-(--t1)">
              Free until<br />you&apos;re sure.
            </h2>
          </div>
          <p className="text-[13px] text-(--t2) max-w-80 md:text-right">
            Start with 1 free validation/month. Upgrade when it pays for itself.
            Cancel anytime — no questions asked.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Free */}
          <div className="bg-(--surface) border border-(--border) rounded-md p-5 flex flex-col gap-4">
            <div>
              <p className="display text-[14px] font-semibold text-(--t1)">Free</p>
              <p className="mono text-[10px] text-(--t3) mt-0.5">Before you&apos;re sure</p>
            </div>
            <div>
              <span className="display text-[28px] font-black tnum text-(--t1)">€0</span>
              <span className="mono text-[10px] text-(--t3) ml-1">/ forever</span>
            </div>
            <ul className="space-y-1.5 text-[11px] text-(--t2) grow">
              <li>1 validation / month</li>
              <li>Reddit + GitHub signals</li>
              <li>GO / KILL / PIVOT verdict</li>
            </ul>
            <Link
              href="/ideas/new"
              className="text-[12px] h-9 rounded-md border border-(--border) text-(--t2) flex items-center justify-center hover:border-(--t3) transition-colors"
            >
              Start free →
            </Link>
          </div>

          {/* Founder */}
          <div className="bg-(--surface) border border-(--border) rounded-md p-5 flex flex-col gap-4">
            <div>
              <p className="display text-[14px] font-semibold text-(--t1)">{PRICING.founder.label}</p>
              <p className="mono text-[10px] text-(--t3) mt-0.5">Validate seriously</p>
            </div>
            <div>
              <span className="display text-[28px] font-black tnum text-(--t1)">€{PRICING.founder.monthly.eur}</span>
              <span className="mono text-[10px] text-(--t3) ml-1">/ mo</span>
            </div>
            <ul className="space-y-1.5 text-[11px] text-(--t2) grow">
              <li>20 validations / month</li>
              <li>All signal sources</li>
              <li>Forecast + Audience + Blueprint</li>
            </ul>
            <Link
              href="/login?mode=signup"
              className="text-[12px] h-9 rounded-md border border-(--border) text-(--t2) flex items-center justify-center hover:border-(--t3) transition-colors"
            >
              Start free →
            </Link>
          </div>

          {/* Team — highlighted */}
          <div
            className="rounded-md p-5 flex flex-col gap-4 relative"
            style={{ background: "var(--surface)", border: "1px solid var(--accent)" }}
          >
            <div className="absolute -top-2.5 left-4">
              <span
                className="mono text-[9px] uppercase tracking-[0.12em] px-2 py-0.5 rounded-sm font-semibold"
                style={{ background: "var(--accent)", color: "#000" }}
              >
                Most popular
              </span>
            </div>
            <div>
              <p className="display text-[14px] font-semibold text-(--t1)">{PRICING.team.label}</p>
              <p className="mono text-[10px] text-(--t3) mt-0.5">Build with your team</p>
            </div>
            <div>
              <span className="display text-[28px] font-black tnum text-(--t1)">€{PRICING.team.monthly.eur}</span>
              <span className="mono text-[10px] text-(--t3) ml-1">/ mo</span>
            </div>
            <ul className="space-y-1.5 text-[11px] text-(--t2) grow">
              <li>Unlimited validations</li>
              <li>3 seats included</li>
              <li>Otto AI Co-Founder (15q)</li>
            </ul>
            <Link
              href="/login?mode=signup"
              className="display text-[12px] font-semibold h-9 rounded-md flex items-center justify-center transition-opacity hover:opacity-90"
              style={{ background: "var(--accent)", color: "#000" }}
            >
              Start free →
            </Link>
          </div>

          {/* Studio */}
          <div className="bg-(--surface) border border-(--border) rounded-md p-5 flex flex-col gap-4">
            <div>
              <p className="display text-[14px] font-semibold text-(--t1)">{PRICING.studio.label}</p>
              <p className="mono text-[10px] text-(--t3) mt-0.5">For studios &amp; agencies</p>
            </div>
            <div>
              <span className="display text-[28px] font-black tnum text-(--t1)">€{PRICING.studio.monthly.eur}</span>
              <span className="mono text-[10px] text-(--t3) ml-1">/ mo</span>
            </div>
            <ul className="space-y-1.5 text-[11px] text-(--t2) grow">
              <li>Unlimited validations</li>
              <li>8 seats + white-label PDF</li>
              <li>Audit Trail + API access</li>
            </ul>
            <Link
              href="/login?mode=signup"
              className="text-[12px] h-9 rounded-md border border-(--border) text-(--t2) flex items-center justify-center hover:border-(--t3) transition-colors"
            >
              Start free →
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/pricing" className="mono text-[11px] text-(--t3) hover:text-(--t2) transition-colors">
            Compare all plans — including Enterprise →
          </Link>
        </div>
      </section>

      {/* ── FREE TOOLS ── */}
      <section className="max-w-330 mx-auto px-8 py-20 border-b border-(--border)">
        <p className="mono text-[10px] text-(--t3) uppercase tracking-[0.12em] mb-3">
          Free tools
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-10">
          <h2 className="display text-[40px] font-black leading-none text-(--t1)">
            Want to explore first?
          </h2>
          <p className="text-[14px] text-(--t2) leading-relaxed self-end">
            Free tools to sharpen your thinking before you commit. No account required.
          </p>
        </div>

        <Link
          href="/tools/decision-clarity"
          className="group flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-(--surface) border border-(--border) rounded-md p-6 hover:border-(--t3) transition-colors"
        >
          <div className="flex items-start gap-5">
            <div
              className="shrink-0 w-10 h-10 rounded-md border flex items-center justify-center mono text-[11px] font-semibold"
              style={{ borderColor: "var(--border)", background: "var(--canvas)", color: "var(--accent)" }}
            >
              DCT
            </div>
            <div>
              <p className="display text-[15px] font-semibold text-(--t1) mb-1">
                Decision Clarity Tool
              </p>
              <p className="text-[12px] text-(--t2) leading-relaxed max-w-120">
                5 questions. 60 seconds. Find out if your idea is ready to build — or needs more thinking first.
              </p>
              <p className="mono text-[10px] text-(--t3) mt-2 uppercase tracking-widest">
                Free · No account · 5 questions
              </p>
            </div>
          </div>
          <span
            className="shrink-0 mono text-[12px] px-4 h-9 rounded-md border flex items-center gap-2 transition-colors"
            style={{ borderColor: "var(--border)", color: "var(--t2)" }}
          >
            Try it free →
          </span>
        </Link>
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
