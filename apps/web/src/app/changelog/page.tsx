import type { Metadata } from "next";
import { PreLoginNav } from "@/components/PreLoginNav";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: { absolute: "Changelog — PledgeOFF" },
  description: "What's new in PledgeOFF — every release, every fix, every improvement.",
  alternates: { canonical: "https://pledgeoff.com/changelog" },
  robots: { index: true, follow: true },
};

const RELEASES = [
  {
    version: "2.2",
    date: "May 2026",
    tag: "FEATURE",
    items: [
      "Team dashboard: Personal and Team tabs on the dashboard — switch between your own validations and your team's feed",
      "Team pulse: stats bar showing total team validations, GO rate, pending count, and most active member",
      "Verdict reactions: agree (↑) or disagree (↓) on any idea in the team feed — counts update live without a page reload",
      "Team feed filters: filter by verdict (GO / KILL / PIVOT / Pending) and by individual member",
      "Seat add-ons for Pro+: buy extra team seats at €7/seat/month directly from Settings → Billing",
    ],
  },
  {
    version: "2.1",
    date: "May 2026",
    tag: "FEATURE",
    items: [
      "Team collaboration: invite colleagues by email, accept invites via link, see team members in Settings → Team",
      "Team name editable by the owner directly in Settings → Team",
      "Accept-invite redirect fixed — clicking an email invite link after login now lands on the correct page",
      "PDF and JSON export no longer marked as coming soon — available to Pro and Pro+ users",
    ],
  },
  {
    version: "2.0",
    date: "May 2026",
    tag: "FIX",
    items: [
      "Billing safety: unknown Stripe price IDs now throw instead of silently downgrading paying users to free",
      "Cron security: missing CRON_SECRET now returns 503 (server misconfiguration) — bearer-undefined bypass no longer possible",
      "Checkout route migrated to shared resolveUserId — auth pattern consistent across all API routes",
      "Plan type has a single source of truth in @pledgeoff/core — duplicate definition removed from getUserPlan",
      "Stripe webhook and waitlist route now log through Pino — all billing events visible in Axiom",
      "Outbox cron returns 500 on processing failures — Vercel retries instead of marking failed runs as success",
      "Welcome email is now fire-and-forget — Resend failures no longer cause Supabase to retry and send duplicate emails",
      "Settings page now reads the subscription once — plan, renewsAt, and stripeCustomerId come from the same DB snapshot",
    ],
  },
  {
    version: "1.9",
    date: "May 2026",
    tag: "FIX",
    items: [
      "Build restored — stale proxy.ts file removed after conflicting with middleware.ts in Next.js",
      "Rules system overhauled: 10 contradictions and missing rules identified and documented",
      "Billing rules codified: canonical plan resolution path, priceId error handling, getOrCreate scope",
      "Auth layers documented: middleware (edge) vs requireUser (Server Components) vs resolveUserId (API routes)",
      "5 new anti-patterns added to engineering rules: priceId fallback, secret guard bypass, email retry, Plan type duplication, console.* in routes",
    ],
  },
  {
    version: "1.8",
    date: "May 2026",
    tag: "FIX",
    items: [
      "Architecture hardened: 19 silent-failure and code-quality issues resolved in one session",
      "getUserPlan() no longer silently defaults to free on DB error — returns 500 so billing issues are visible",
      "All 13 API routes now use a shared resolveUserId() — no more per-route duplicates that could drift",
      "Next.js middleware added for /dashboard, /ideas, /settings — private pages are protected at the edge",
      "Stripe test-key guard at cold start — production builds now throw immediately if sk_test_ key is set",
      "Cron cleanup route returns 500 on failure so Vercel retries instead of silently marking it as success",
      "Report page: DB errors now throw (500) instead of masking as 404",
    ],
  },
  {
    version: "1.7",
    date: "May 2026",
    tag: "FIX",
    items: [
      "Pro plan now shows correctly in Settings — Account, Billing, and Team tabs all reflect the active subscription",
      "Team seats now display 1/3 for Pro (was showing 1/1 due to a billing read failure)",
      "Billing architecture hardened: single service client, centralized plan resolver, all errors logged instead of silently defaulting to free",
    ],
  },
  {
    version: "1.6",
    date: "May 2026",
    tag: "UI",
    items: [
      "Badge tooltips on desktop — hover over BUILD / OSS / BUY, Niche / Mid-size / Large, AI knowledge, and MRR to see a plain-English explanation",
      "Mobile legend on all four tools — the same explanations appear as a static line below the section title, no hover needed",
    ],
  },
  {
    version: "1.5",
    date: "May 2026",
    tag: "UI",
    items: [
      "Settings page redesigned with sidebar navigation — Account, Billing, Notifications, API, Danger zone as separate panels",
      "Landing Page tool now shows a live page preview (dark background, headline, features, CTA) without leaving the app",
      "Landing Page tool adds a Copy HTML button — generates a standalone dark-mode page ready to publish on Carrd, Webflow, or any browser",
      "Copy fields collapsed into an expandable 'Copy breakdown' section, keeping the interface clean by default",
      "All six Intelligence tools now show a consistent loading animation and fade the content during re-runs",
      "Market Simulation gains a Re-run button — no more page refresh needed to regenerate",
      "Competitor and Build analysis now show gaps as full cards, consistent with the rest of the UI",
      "Re-run errors are now shown inline near the action button instead of silently failing",
    ],
  },
  {
    version: "1.4",
    date: "May 2026",
    tag: "UI",
    items: [
      "Otto co-founder flow on idea page — verdict-aware recommendations guide you to the most relevant tools",
      "GO verdict unlocks all tools; PIVOT and KILL show focused suggestions with explanations per blocked tool",
      "Override button lets you run all tools regardless of Otto's recommendation",
      "Intelligence tools list now starts with '01 Validate' as completed — clear sense of progress",
    ],
  },
  {
    version: "1.3",
    date: "May 2026",
    tag: "INTELLIGENCE",
    items: [
      "Competitor analysis now supplements signal-based results with AI general knowledge — finds well-known players (e.g. CodeRabbit, Bito) even when absent from fetched signals",
      "Competitors from general knowledge are clearly labelled with an 'AI knowledge' badge — full transparency on data source",
      "GitHub signal quality improved: reactions filter tuned to remove bot/noise issues while keeping more real discussions",
      "Engineering Stack no longer silently drops GitHub signals when other sources dominate — every source is guaranteed at least one rescued signal",
      "Engineering Stack warning rewritten — explains what the analysis is based on instead of showing a bare count",
    ],
  },
  {
    version: "1.2",
    date: "May 2026",
    tag: "UI",
    items: [
      "Idea description limit raised from 300 to 1000 characters — more room to describe the problem, pricing, and target audience",
      "Description character counter shows colour-coded progress bar (green → amber → red)",
    ],
  },
  {
    version: "1.1",
    date: "May 2026",
    tag: "UI",
    items: [
      "Two-column layout on idea page — verdict sticky left, signals scrollable right",
      "Compact signal cards: title truncated, sentiment dot, View ↗ button",
      "Light mode repaired — accent color (#4D6C00 olive), canvas/surface separation, visible borders",
      "ThemeToggle: 3 buttons replaced with single dropdown",
    ],
  },
  {
    version: "1.0",
    date: "May 2026",
    tag: "SIGNALS",
    items: [
      "LLM-generated search queries replace keyword extractor — signals now match full idea text",
      "GitHub: removed sort=reactions (now uses best-match ranking) + in:title qualifier",
      "Reddit: removed type filter that silently returned 0 results",
      "Parallel fetch: 2 queries × 2 sources, deduplicated by URL before save",
      "Prod DB synced — 6 missing migrations applied via supabase db push",
    ],
  },
  {
    version: "0.9",
    date: "May 2026",
    tag: "UI",
    items: [
      "Full nav redesign — all actions consistently visible",
      "Footer with social icons (X, TikTok, Instagram)",
      "Sticky header across all pages",
      "Consistent typographic hierarchy across the entire site",
    ],
  },
  {
    version: "0.8",
    date: "May 2026",
    tag: "DESIGN",
    items: [
      "Dashboard redesign with sparklines and visual pipeline",
      "Animated loading screen with 3 progress panels",
      "Evidence wall with animated score count-up and glow effect",
      "Score dimensions: Market Demand, Competition, Feasibility, Timing",
    ],
  },
  {
    version: "0.7",
    date: "May 2026",
    tag: "CONTENT",
    items: [
      "Blog index and article pages with ToC and reading progress bar",
      "Full Privacy Policy (GDPR, sub-processors, rights Art. 15–21)",
      "Terms of Service (billing, trial, refund policy, governing law EU)",
      "Cookie banner with consent management",
    ],
  },
  {
    version: "0.6",
    date: "May 2026",
    tag: "INTELLIGENCE",
    items: [
      "AI verdict generated by Groq with Zod-validated schema",
      "Versioned prompt (decision-prompt.v1) with 4 weighted dimensions",
      "Score calculated from weighted average (Market Demand ×0.4, etc.)",
      "Full idempotency — each event processed exactly once",
    ],
  },
  {
    version: "0.5",
    date: "May 2026",
    tag: "SIGNALS",
    items: [
      "Reddit adapter — live scraping via Reddit public JSON API",
      "GitHub adapter — issues tagged with sentiment from reactions",
      "Postgres event bus with outbox pattern and cron retry",
      "Graceful degradation when a source is down",
    ],
  },
  {
    version: "0.1",
    date: "Apr 2026",
    tag: "LAUNCH",
    items: [
      "First deploy on pledgeoff.com",
      "Email auth and Google OAuth via Supabase",
      "POST /api/v1/ideas → real-time verdict",
      "RLS enabled on all tables from day one",
    ],
  },
];

const TAG_COLORS: Record<string, string> = {
  UI:          "var(--accent)",
  DESIGN:      "var(--validated)",
  CONTENT:     "var(--caution)",
  INTELLIGENCE:"var(--accent)",
  SIGNALS:     "var(--validated)",
  FIX:         "var(--caution)",
  LAUNCH:      "var(--accent)",
};

export default function ChangelogPage() {
  return (
    <div style={{ background: "var(--canvas)", color: "var(--t1)" }}>
      <PreLoginNav />

      {/* Heading — sticky below PreLoginNav */}
      <section
        className="border-b sticky top-12 z-40"
        style={{ borderColor: "var(--border)", background: "var(--canvas)" }}
      >
        <div className="max-w-275 mx-auto px-8 py-12">
          <div className="mono text-[10px] uppercase tracking-wider mb-3" style={{ color: "var(--t3)" }}>
            CHANGELOG · RELEASES
          </div>
          <h1
            className="display font-semibold"
            style={{ fontSize: "32px", letterSpacing: "-0.04em", color: "var(--t1)" }}
          >
            What&apos;s shipped.
          </h1>
          <p className="mt-3 text-[13px] max-w-120" style={{ color: "var(--t2)" }}>
            Every meaningful change — features, fixes, and improvements — in reverse chronological order.
          </p>
        </div>
      </section>

      {/* Releases */}
      <div className="max-w-275 mx-auto px-8 py-12 space-y-0">
        {RELEASES.map((r, i) => (
          <div
            key={r.version}
            className="grid grid-cols-12 gap-8 py-8"
            style={{ borderBottom: i < RELEASES.length - 1 ? "1px solid var(--border)" : "none" }}
          >
            {/* Left — version + date */}
            <div className="col-span-3">
              <div className="mono text-[11px] font-semibold" style={{ color: "var(--t1)" }}>
                v{r.version}
              </div>
              <div className="mono text-[10px] mt-1" style={{ color: "var(--t3)" }}>
                {r.date}
              </div>
              <span
                className="inline-block mt-3 mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded"
                style={{
                  color: TAG_COLORS[r.tag] ?? "var(--t3)",
                  background: `color-mix(in srgb, ${TAG_COLORS[r.tag] ?? "var(--t3)"} 12%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${TAG_COLORS[r.tag] ?? "var(--t3)"} 30%, transparent)`,
                }}
              >
                {r.tag}
              </span>
            </div>

            {/* Right — items */}
            <ul className="col-span-9 space-y-2">
              {r.items.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[13px]" style={{ color: "var(--t2)" }}>
                  <span className="mt-1.25 w-1 h-1 rounded-full shrink-0" style={{ background: "var(--accent)" }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <Footer />
    </div>
  );
}
