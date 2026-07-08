import Link from "next/link";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";
import { PHBanner } from "@/components/PHBanner";
import { PRICING } from "@/lib/pricing.config";
import { HeroLeft } from "@/components/home/HeroLeft";
import { HomeFAQ } from "@/components/home/HomeFAQ";

const FEATURES = [
  {
    n: "01",
    title: "Cited sources",
    desc: "Every signal links to its origin. Reddit threads, Hacker News, GitHub issues, G2 reviews, news, job postings. Nothing invented.",
  },
  {
    n: "02",
    title: "Four scored dimensions",
    desc: "Market demand, competition, feasibility, and timing — each weighted and scored independently before the composite verdict.",
  },
  {
    n: "03",
    title: "Otto, your co-pilot",
    desc: "Ask follow-up questions in plain English. Otto reads your verdict and signals before answering — not a generic chatbot.",
  },
  {
    n: "04",
    title: "Eleven intelligence tools",
    desc: "From ICP analysis and battlecards to interview guides and transcript analysis. Each tool reads the verdict and goes deeper on one angle.",
  },
  {
    n: "05",
    title: "Movement tracking",
    desc: "Competitors change pricing, positioning, and features. PledgeOFF re-checks the market on schedule and flags what moved.",
  },
  {
    n: "06",
    title: "Win/Loss intelligence",
    desc: "Report what happened after the verdict — built, failed, lost to whom. Every outcome calibrates your future verdicts.",
  },
  {
    n: "07",
    title: "Team collaboration",
    desc: "Share verdicts with teammates. React, run tools together, get Slack alerts and a weekly digest of what changed.",
  },
  {
    n: "08",
    title: "Public profiles",
    desc: "Make ideas public. Share verdicts via link. Build a credible validation track record others can see.",
  },
  {
    n: "09",
    title: "API & reports",
    desc: "REST API with keys and usage stats. Export any verdict as a PDF intelligence report — white-label on Studio.",
  },
];

const monoEyebrow: React.CSSProperties = {
  fontFamily: "var(--font-chivo-mono), monospace",
  fontSize: 8.5,
  letterSpacing: "0.3em",
  textTransform: "uppercase",
  color: "var(--faint)",
  display: "block",
  marginBottom: 12,
};

// monoEyebrow used below in How it works, Features, Three Verdicts, Pricing, CTA sections
export function HomeClient() {
  return (
    <div style={{ minHeight: "100vh" }}>
      <PHBanner />
      <PublicNav />

      {/* ── MASTHEAD STRIP ── */}
      <div
        style={{
          background: "var(--ink)",
          color: "var(--bg)",
          padding: "8px 40px",
          fontFamily: "var(--font-chivo-mono), monospace",
          fontSize: 8,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>PledgeOFF Bulletin · Field intelligence for founders</span>
        <span style={{ color: "rgba(243,239,227,0.35)" }}>
          GO / KILL / PIVOT · Every number sourced
        </span>
      </div>

      {/* ── HERO ── */}
      <div className="w-bleed" style={{ paddingTop: 52, paddingBottom: 60 }}>
        <div
          className="grid grid-cols-1 lg:grid-cols-2"
          style={{ gap: 52, alignItems: "start" }}
        >
          {/* Left — live verdict demo */}
          <div>
            <HeroLeft />
          </div>

          {/* Right — pitch card */}
          <div
            style={{
              border: "1px solid var(--line)",
              background: "var(--surface)",
              padding: 28,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "var(--font-chivo-mono), monospace",
                  fontSize: 8.5,
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  color: "var(--faint)",
                  marginBottom: 10,
                }}
              >
                What PledgeOFF does
              </div>
              <p
                style={{
                  fontFamily: "var(--font-bitter), serif",
                  fontSize: 15,
                  lineHeight: 1.7,
                  color: "var(--dim)",
                }}
              >
                You describe an idea. We scan Reddit, Hacker News, Dev.to,
                GitHub, and the web for real signals. You get a verdict — GO,
                PIVOT, or KILL — with a score, four dimensions, and every source
                cited. In about 15 seconds.
              </p>
            </div>
            <div style={{ height: 1, background: "var(--line)" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Link
                href="/ideas/new"
                className="btn-p"
                style={{ justifyContent: "center" }}
              >
                Validate your first idea free →
              </Link>
              <Link
                href="/pricing"
                className="btn-g"
                style={{ justifyContent: "center" }}
              >
                See plans &amp; pricing
              </Link>
            </div>
            <p
              style={{
                fontFamily: "var(--font-chivo-mono), monospace",
                fontSize: 8,
                letterSpacing: "0.08em",
                color: "var(--faint)",
              }}
            >
              First validation free. No credit card. No setup.
            </p>
          </div>
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <div className="w-bleed" style={{ paddingBottom: 60 }}>
        <div style={{ marginBottom: 20 }}>
          <span style={monoEyebrow}>How it works</span>
          <h2
            style={{
              fontFamily: "var(--font-bitter), serif",
              fontSize: "clamp(26px, 4.5vw, 56px)",
              fontWeight: 700,
              letterSpacing: "-0.025em",
              lineHeight: 1.1,
              color: "var(--ink)",
            }}
          >
            Three steps to a verdict.
          </h2>
        </div>
        <div className="bc">
          <div className="bc-hd">
            <span>Process overview</span>
            <span style={{ color: "rgba(243,239,227,0.35)" }}>~15 seconds total</span>
          </div>
          <div className="bc-bd" style={{ padding: 0 }}>
            <div className="how-row">
              <div className="how-no">01</div>
              <div className="how-body">
                <div className="how-title">Describe your idea</div>
                <div className="how-desc">
                  Plain English, 10 to 2000 characters. What the product does and
                  who it&apos;s for. No decks, no pitches.
                </div>
              </div>
            </div>
            <div className="how-row">
              <div className="how-no">02</div>
              <div className="how-body">
                <div className="how-title">Get a verdict</div>
                <div className="how-desc">
                  GO, PIVOT, or KILL — with a composite score, four scored
                  dimensions, confidence level, reasoning, and every signal cited.
                </div>
              </div>
            </div>
            <div className="how-row">
              <div className="how-no">03</div>
              <div className="how-body">
                <div className="how-title">Run intelligence tools</div>
                <div className="how-desc">
                  Go deeper with eleven tools across five stages — from ICP
                  analysis and competitive landscape to battlecards, interview
                  guides, and transcript analysis. Run what you need.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── FEATURE GRID ── */}
      <div className="w-bleed" style={{ paddingBottom: 60 }}>
        <span style={{ ...monoEyebrow, marginBottom: 20 }}>What you get</span>
        <div className="feat-grid" style={{ border: "1px solid var(--line)" }}>
          {FEATURES.map((f) => (
            <div key={f.n} className="feat-item">
              <div className="feat-no">{f.n}</div>
              <div className="feat-title">{f.title}</div>
              <div className="feat-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── THREE VERDICTS ── */}
      <div className="w-bleed" style={{ paddingBottom: 60 }}>
        <span style={{ ...monoEyebrow, marginBottom: 20 }}>Three verdicts</span>
        <div
          className="grid grid-cols-1 md:grid-cols-3"
          style={{ gap: 12 }}
        >
          {/* GO */}
          <div className="bc">
            <div className="bc-hd">
              <span style={{ color: "rgba(243,239,226,0.6)" }}>Score 75+</span>
            </div>
            <div className="bc-bd">
              <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
                <div className="fc fc-lg fc-go">G</div>
                <div className="fc fc-lg fc-go">O</div>
              </div>
              <p style={{ fontSize: 13, color: "var(--dim)", lineHeight: 1.7 }}>
                Demand is real, competition is manageable, and timing is right.
                Move forward — but check the weak dimensions first.
              </p>
            </div>
          </div>

          {/* PIVOT */}
          <div className="bc">
            <div className="bc-hd">
              <span style={{ color: "rgba(243,239,226,0.6)" }}>Score 40–74</span>
            </div>
            <div className="bc-bd">
              <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
                {["P","I","V","O","T"].map((c) => (
                  <div key={c} className="fc fc-lg fc-pivot">{c}</div>
                ))}
              </div>
              <p style={{ fontSize: 13, color: "var(--dim)", lineHeight: 1.7 }}>
                Something real here but a specific dimension is blocking it. The
                report tells you exactly which one and why.
              </p>
            </div>
          </div>

          {/* KILL */}
          <div className="bc">
            <div className="bc-hd">
              <span style={{ color: "rgba(243,239,226,0.6)" }}>Score &lt;40</span>
            </div>
            <div className="bc-bd">
              <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
                {["K","I","L","L"].map((c) => (
                  <div key={c} className="fc fc-lg fc-kill">{c}</div>
                ))}
              </div>
              <p style={{ fontSize: 13, color: "var(--dim)", lineHeight: 1.7 }}>
                The signal data doesn&apos;t support this idea in its current form.
                Knowing early is the point.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── DECISION-CLARITY CALLOUT ── */}
      <div className="w-bleed" style={{ paddingBottom: 60 }}>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            padding: 32,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <div>
            <span style={{ ...monoEyebrow, marginBottom: 6 }}>Free tool</span>
            <h3
              style={{
                fontFamily: "var(--font-bitter), serif",
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: "-0.015em",
                color: "var(--ink)",
                marginBottom: 6,
              }}
            >
              Decision-Clarity Score
            </h3>
            <p
              style={{
                fontFamily: "var(--font-bitter), serif",
                fontSize: 16,
                fontStyle: "italic",
                color: "var(--dim)",
                lineHeight: 1.75,
                maxWidth: "48ch",
              }}
            >
              Five questions, two minutes. Understand how clearly you&apos;ve
              defined your idea before you validate it.
            </p>
          </div>
          <Link href="/tools/decision-clarity" className="btn-p" style={{ flexShrink: 0 }}>
            Take the quiz →
          </Link>
        </div>
      </div>

      {/* ── PRICING PREVIEW ── */}
      <div className="w-bleed" style={{ paddingBottom: 60 }}>
        <span style={{ ...monoEyebrow, marginBottom: 8 }}>Pricing</span>
        <h2
          style={{
            fontFamily: "var(--font-bitter), serif",
            fontSize: "clamp(24px, 4vw, 42px)",
            fontWeight: 700,
            letterSpacing: "-0.025em",
            lineHeight: 1.1,
            color: "var(--ink)",
            marginBottom: 28,
          }}
        >
          Free until you&apos;re sure.
        </h2>

        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
          style={{ gap: 12 }}
        >
          {/* Free */}
          <div
            style={{
              border: "1px solid var(--line)",
              background: "var(--surface)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--line)" }}>
              <div
                style={{
                  fontFamily: "var(--font-bitter), serif",
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--ink)",
                  marginBottom: 3,
                }}
              >
                Free
              </div>
              <div
                style={{
                  fontFamily: "var(--font-chivo-mono), monospace",
                  fontSize: 8.5,
                  letterSpacing: "0.06em",
                  color: "var(--faint)",
                }}
              >
                Before you&apos;re sure
              </div>
              <div style={{ marginTop: 14 }}>
                <span
                  style={{
                    fontFamily: "var(--font-chivo-mono), monospace",
                    fontSize: 30,
                    fontWeight: 600,
                    color: "var(--ink)",
                    lineHeight: 1,
                  }}
                >
                  €0
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-chivo-mono), monospace",
                    fontSize: 9,
                    color: "var(--faint)",
                    marginLeft: 4,
                  }}
                >
                  / forever
                </span>
              </div>
            </div>
            <div style={{ padding: "14px 20px 18px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              {["1 validation / month", "Reddit + GitHub signals", "GO / KILL / PIVOT verdict"].map((f) => (
                <div
                  key={f}
                  style={{
                    fontFamily: "var(--font-chivo-mono), monospace",
                    fontSize: 9,
                    letterSpacing: "0.05em",
                    color: "var(--dim)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                  }}
                >
                  <span style={{ color: "var(--go)", flexShrink: 0 }}>✓</span>
                  {f}
                </div>
              ))}
            </div>
            <div style={{ padding: "0 20px 18px" }}>
              <Link href="/ideas/new" className="btn-g" style={{ width: "100%", justifyContent: "center" }}>
                Validate free →
              </Link>
            </div>
          </div>

          {/* Founder */}
          <div
            style={{
              border: "1px solid var(--line)",
              background: "var(--surface)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--line)" }}>
              <div
                style={{
                  fontFamily: "var(--font-bitter), serif",
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--ink)",
                  marginBottom: 3,
                }}
              >
                {PRICING.founder.label}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-chivo-mono), monospace",
                  fontSize: 8.5,
                  letterSpacing: "0.06em",
                  color: "var(--faint)",
                }}
              >
                Validate seriously
              </div>
              <div style={{ marginTop: 14 }}>
                <span
                  style={{
                    fontFamily: "var(--font-chivo-mono), monospace",
                    fontSize: 30,
                    fontWeight: 600,
                    color: "var(--ink)",
                    lineHeight: 1,
                  }}
                >
                  €{PRICING.founder.monthly.eur}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-chivo-mono), monospace",
                    fontSize: 9,
                    color: "var(--faint)",
                    marginLeft: 4,
                  }}
                >
                  / mo
                </span>
              </div>
            </div>
            <div style={{ padding: "14px 20px 18px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              {["20 validations / month", "All signal sources", "Forecast + ICP + Landscape"].map((f) => (
                <div
                  key={f}
                  style={{
                    fontFamily: "var(--font-chivo-mono), monospace",
                    fontSize: 9,
                    letterSpacing: "0.05em",
                    color: "var(--dim)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                  }}
                >
                  <span style={{ color: "var(--go)", flexShrink: 0 }}>✓</span>
                  {f}
                </div>
              ))}
            </div>
            <div style={{ padding: "0 20px 18px" }}>
              <Link href="/pricing" className="btn-g" style={{ width: "100%", justifyContent: "center" }}>
                Get Founder →
              </Link>
            </div>
          </div>

          {/* Team — featured */}
          <div
            style={{
              border: "1px solid var(--ink)",
              background: "var(--surface)",
              display: "flex",
              flexDirection: "column",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -11,
                left: 20,
                fontFamily: "var(--font-chivo-mono), monospace",
                fontSize: 8,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                padding: "3px 8px",
                background: "var(--ink)",
                color: "var(--bg)",
              }}
            >
              Most popular
            </div>
            <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--line)" }}>
              <div
                style={{
                  fontFamily: "var(--font-bitter), serif",
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--ink)",
                  marginBottom: 3,
                }}
              >
                {PRICING.team.label}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-chivo-mono), monospace",
                  fontSize: 8.5,
                  letterSpacing: "0.06em",
                  color: "var(--faint)",
                }}
              >
                Build with your team
              </div>
              <div style={{ marginTop: 14 }}>
                <span
                  style={{
                    fontFamily: "var(--font-chivo-mono), monospace",
                    fontSize: 30,
                    fontWeight: 600,
                    color: "var(--ink)",
                    lineHeight: 1,
                  }}
                >
                  €{PRICING.team.monthly.eur}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-chivo-mono), monospace",
                    fontSize: 9,
                    color: "var(--faint)",
                    marginLeft: 4,
                  }}
                >
                  / mo
                </span>
              </div>
            </div>
            <div style={{ padding: "14px 20px 18px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              {["60 validations / month", "3 seats included", "Otto AI co-pilot (45q/mo)"].map((f) => (
                <div
                  key={f}
                  style={{
                    fontFamily: "var(--font-chivo-mono), monospace",
                    fontSize: 9,
                    letterSpacing: "0.05em",
                    color: "var(--dim)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                  }}
                >
                  <span style={{ color: "var(--go)", flexShrink: 0 }}>✓</span>
                  {f}
                </div>
              ))}
            </div>
            <div style={{ padding: "0 20px 18px" }}>
              <Link href="/pricing" className="btn-p" style={{ width: "100%", justifyContent: "center" }}>
                Get Team →
              </Link>
            </div>
          </div>

          {/* Studio */}
          <div
            style={{
              border: "1px solid var(--line)",
              background: "var(--surface)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--line)" }}>
              <div
                style={{
                  fontFamily: "var(--font-bitter), serif",
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--ink)",
                  marginBottom: 3,
                }}
              >
                {PRICING.studio.label}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-chivo-mono), monospace",
                  fontSize: 8.5,
                  letterSpacing: "0.06em",
                  color: "var(--faint)",
                }}
              >
                For studios &amp; agencies
              </div>
              <div style={{ marginTop: 14 }}>
                <span
                  style={{
                    fontFamily: "var(--font-chivo-mono), monospace",
                    fontSize: 30,
                    fontWeight: 600,
                    color: "var(--ink)",
                    lineHeight: 1,
                  }}
                >
                  €{PRICING.studio.monthly.eur}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-chivo-mono), monospace",
                    fontSize: 9,
                    color: "var(--faint)",
                    marginLeft: 4,
                  }}
                >
                  / mo
                </span>
              </div>
            </div>
            <div style={{ padding: "14px 20px 18px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              {["100 validations / month", "8 seats + white-label PDF", "Audit trail + API access"].map((f) => (
                <div
                  key={f}
                  style={{
                    fontFamily: "var(--font-chivo-mono), monospace",
                    fontSize: 9,
                    letterSpacing: "0.05em",
                    color: "var(--dim)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                  }}
                >
                  <span style={{ color: "var(--go)", flexShrink: 0 }}>✓</span>
                  {f}
                </div>
              ))}
            </div>
            <div style={{ padding: "0 20px 18px" }}>
              <Link href="/pricing" className="btn-g" style={{ width: "100%", justifyContent: "center" }}>
                Get Studio →
              </Link>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16, textAlign: "center" }}>
          <Link
            href="/pricing"
            style={{
              fontFamily: "var(--font-chivo-mono), monospace",
              fontSize: 10,
              letterSpacing: "0.06em",
              color: "var(--faint)",
              textDecoration: "underline",
              textUnderlineOffset: 2,
            }}
          >
            Compare all plans — including Enterprise →
          </Link>
        </div>
      </div>

      {/* ── FAQ ── */}
      <HomeFAQ />

      {/* ── CTA BAND ── */}
      <div
        className="cta-band"
      >
        <div className="w-bleed">
          <span
            style={{
              fontFamily: "var(--font-chivo-mono), monospace",
              fontSize: 8.5,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "rgba(243,239,227,0.4)",
              marginBottom: 14,
              display: "block",
            }}
          >
            PledgeOFF · Decision intelligence
          </span>
          <h2
            style={{
              fontFamily: "var(--font-bitter), serif",
              fontSize: "clamp(30px, 5vw, 64px)",
              fontWeight: 700,
              lineHeight: 1.07,
              letterSpacing: "-0.025em",
              color: "var(--bg)",
              marginBottom: 10,
            }}
          >
            Know before you build.
          </h2>
          <p
            style={{
              fontSize: 15,
              fontStyle: "italic",
              color: "rgba(243,239,227,0.6)",
              marginBottom: 28,
            }}
          >
            Your next idea is a 15-second validation away. The first one is
            always free.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link
              href="/ideas/new"
              style={{
                fontFamily: "var(--font-chivo-mono), monospace",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                padding: "13px 26px",
                background: "var(--go)",
                color: "#0F0D0A",
                border: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              Create free account →
            </Link>
            <Link
              href="/pricing"
              style={{
                fontFamily: "var(--font-chivo-mono), monospace",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                padding: "12px 24px",
                background: "transparent",
                color: "rgba(243,239,227,0.6)",
                border: "1px solid rgba(243,239,227,0.22)",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Compare plans
            </Link>
          </div>
          <p
            style={{
              fontFamily: "var(--font-chivo-mono), monospace",
              fontSize: 8,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "rgba(243,239,227,0.28)",
              marginTop: 16,
            }}
          >
            No credit card · No setup · Cancel any time
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
