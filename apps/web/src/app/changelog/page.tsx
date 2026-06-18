import type { Metadata } from "next";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: { absolute: "Changelog — PledgeOFF" },
  description: "What's new in PledgeOFF — every release, every fix, every improvement.",
  alternates: { canonical: "https://pledgeoff.com/changelog" },
  robots: { index: true, follow: true },
};

const RELEASES = [
  {
    version: "3.2",
    date: "May 2026",
    tag: "IMPROVED",
    items: [
      "Dashboard: animated score count-up, today's highlight, keyboard shortcuts (N → new idea, / → search), weekly digest opt-in banner",
      "Ideas page: re-validate button with score diff display (Score: 79 → 82 +3), tool group filter pills (All / Analysis / Execution / Intelligence), share verdict clipboard button",
      "Ideas new: 3 clickable example ideas, upgrade CTA when validations exhausted, dynamic loading overlay with 6 rotating messages",
      "Blog: search, article count on filter pills, mid-article CTA at 60% scroll, TOC accordion on mobile, highlight-to-tweet, per-article OG image",
      "Settings: usage stats strip, notification preferences (5 email toggles), GDPR data export as JSON attachment",
      "Homepage: ROI calculator on pricing page, 'Who this is for' profiles, 'Last validated X ago' live badge, animated floating signal cards",
      "Accessibility: :focus-visible ring globally, aria-label on all major inputs, screen-reader utilities",
    ],
  },
  {
    version: "3.1",
    date: "May 2026",
    tag: "NEW",
    items: [
      "Launch Kit: generate a go-to-market brief for any validated idea — positioning statement, target audience, channel mix, and 30-day launch plan (Founder+)",
      "Decision Queue: AI-ranked list of your ideas by strategic priority — updated nightly, with explanation per idea (Team+)",
      "Engineering Intelligence: connect GitHub to unlock velocity metrics (cycle time, throughput, bottlenecks) and delivery estimates per idea (Team+)",
      "Decision Audit Trail: full timeline of every verdict, re-validation, and outcome on an idea — PDF export for Studio+",
      "Data Flywheel: report what happened after each verdict — GO/KILL/PIVOT outcomes feed into your accuracy score over time",
      "Accuracy Report: monthly email with your personal GO / KILL accuracy rate vs. the platform average",
      "Plans: Founder (20 validations/mo, €49/mo) · Team (unlimited, 3 seats, €99/mo) · Studio (unlimited, 8 seats, PDF export, €349/mo) · Enterprise (custom)",
    ],
  },
  {
    version: "3.0",
    date: "May 2026",
    tag: "NEW",
    items: [
      "Studio plan launched at €349/month (€279/month annual) — white-label PDF exports, advanced team analytics, NET30 invoicing on request, and a full activity audit log",
      "Pricing: Founder €49/month · Team €99/month · Studio €349/month — annual plans available with up to ~20% savings",
      "Enterprise tier added for larger organizations: custom pricing, dedicated onboarding, SSO/SAML (Okta), contractual SLA, and custom DPA — contact via /enterprise",
      "Annual billing available for Founder, Team, and Studio — switch in Settings → Billing",
    ],
  },
  {
    version: "2.9",
    date: "May 2026",
    tag: "FEATURE",
    items: [
      "API Keys: Team and Studio users can generate personal API keys (po_live_...) for programmatic access to all validation endpoints",
      "Keys are created and revoked in Settings → API — each key shows creation date and last used timestamp",
      "Authenticate any API request with the X-API-Key header — same rate limits and plan gates as the web interface",
      "Full API documentation at pledgeoff.com/api-docs — all 25 routes documented with request/response schemas and examples",
    ],
  },
  {
    version: "2.8",
    date: "May 2026",
    tag: "FEATURE",
    items: [
      "Signal Feed (Team+): a live feed of trending startup niches ranked by heat score — 15 categories, continuously updated from real market signals, with sparklines showing momentum over the last 7 days",
      "Decision log filters: filter your dashboard by GO, KILL, or PIVOT verdict — counts shown on each chip so you see the breakdown instantly",
      "Team PDF export (Studio+): generate a white-label PDF report for any validated idea — covers the verdict, score breakdown, signals, and all intelligence tools run on the idea",
      "Advanced team analytics (Studio+): verdict distribution donut chart, team velocity sparkline, top contributors ranked by activity, and most-engaged ideas by reaction count",
    ],
  },
  {
    version: "2.7",
    date: "May 2026",
    tag: "FEATURE",
    items: [
      "Studio invoice billing: Studio plan users can request a NET30 invoice directly from Settings → Billing — the request is logged and the finance team follows up within one business day",
      "Activity audit log (Studio+): every action taken by team members — idea creation, tool runs, plan changes, invite activity — recorded and viewable in Settings → Activity",
      "Google Search added as a signal source alongside Reddit and GitHub — broader coverage for market validation",
      "Domain redirect fixed: www.pledgeoff.com now correctly redirects to pledgeoff.com (308 permanent) — no more split authority in search rankings",
    ],
  },
  {
    version: "2.6",
    date: "May 2026",
    tag: "FEATURE",
    items: [
      "Ask Otto — AI Co-Founder chat on every validated idea: ask strategy, competition, go-to-market, or what to build first",
      "Otto remembers the full conversation per idea — close the page and come back later, the context is preserved",
      "Founder plan includes 5 Otto questions/month; Team includes 15/month; Studio includes 50/month — included quota resets on the 1st of every month",
      "Buy more questions anytime with one-time packs: 10 questions (€15), 25 (€30), 60 (€60), 150 (€120) — questions never expire and work across all your ideas",
      "Balance display shows included remaining and extra questions separately — always know exactly what you have",
      "Free users see the Otto panel locked with a direct upgrade prompt",
    ],
  },
  {
    version: "2.5",
    date: "May 2026",
    tag: "IMPROVEMENT",
    items: [
      "Payment recovery flow: when a paid subscription payment fails, you now receive an email immediately with a link to update your card — your account stays active for 24 hours before any downgrade",
      "Automatic retry: after 24 hours, the payment is retried automatically — if it succeeds, nothing changes; if it fails, the account is downgraded to Free",
      "Team tab locked on payment failure: if your payment is unresolved, the Team section shows a clear notice with a direct link to the billing portal",
    ],
  },
  {
    version: "2.4",
    date: "May 2026",
    tag: "IMPROVEMENT",
    items: [
      "Team context on idea creation: Founder and Team users with a team can now choose Personal or Team context when submitting a new idea — ideas tagged as Team appear in the team feed",
      "Security hardening: SECURITY DEFINER functions no longer callable by unauthenticated users; trigger functions hardened against search_path injection",
      "RLS performance: all row-level security policies updated to use the initplan optimization — auth evaluation now runs once per query instead of once per row",
      "Env isolation: development builds now throw immediately if Stripe live keys are used accidentally; all Stripe price IDs validated at startup",
    ],
  },
  {
    version: "2.3",
    date: "May 2026",
    tag: "FIX",
    items: [
      "Seat add-ons fully live: STRIPE_EXTRA_SEAT_PRICE_ID wired in production — extra seats at €20/seat/month now purchasable from Settings → Billing",
      "Webhook fix: customer.subscription.updated no longer nullifies stripe_subscription_id — targeted updatePlan() replaces full upsert for plan/status updates",
    ],
  },
  {
    version: "2.2",
    date: "May 2026",
    tag: "FEATURE",
    items: [
      "Team dashboard: Personal and Team tabs on the dashboard — switch between your own validations and your team's feed",
      "Team pulse: stats bar showing total team validations, GO rate, pending count, and most active member",
      "Verdict reactions: agree (↑) or disagree (↓) on any idea in the team feed — counts update live without a page reload",
      "Team feed filters: filter by verdict (GO / KILL / PIVOT / Pending) and by individual member",
      "Seat add-ons for Team+: buy extra team seats at €20/seat/month directly from Settings → Billing",
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
      "PDF and JSON export no longer marked as coming soon — available to Founder and Team users",
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
      "Paid plan now shows correctly in Settings — Account, Billing, and Team tabs all reflect the active subscription",
      "Team seats now display correctly for Founder (was showing 1/1 due to a billing read failure)",
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
  NEW:         "var(--validated)",
  IMPROVED:    "var(--caution)",
  FIXED:       "var(--t3)",
  UI:          "var(--accent)",
  DESIGN:      "var(--validated)",
  CONTENT:     "var(--caution)",
  INTELLIGENCE:"var(--accent)",
  SIGNALS:     "var(--validated)",
  FIX:         "var(--caution)",
  LAUNCH:      "var(--accent)",
  FEATURE:     "var(--validated)",
  IMPROVEMENT: "var(--caution)",
};

export default function ChangelogPage() {
  return (
    <div style={{ background: "var(--bg)", color: "var(--ink)" }}>
      <PublicNav />

      {/* Masthead strip — sticky */}
      <div
        className="bc-hd"
        style={{ position: "sticky", top: 0, zIndex: 40, padding: "9px 60px" }}
      >
        <span>PledgeOFF Bulletin · Changelog &amp; Releases</span>
        <span className="r">in reverse chronological order</span>
      </div>

      <div className="w-page-sm" style={{ paddingTop: "52px", paddingBottom: "60px" }}>
        <span className="eye">Changelog · Releases</span>
        <h1 className="mkt-h2" style={{ marginBottom: "6px" }}>What&apos;s shipped.</h1>
        <p style={{ fontSize: "13px", color: "var(--dim)", marginBottom: "40px" }}>
          Every meaningful change — features, fixes, and improvements — in reverse chronological order.
        </p>

        <div>
          {RELEASES.map((r) => (
            <div key={r.version} className="cl-entry">
              <div className="cl-meta">{r.date}</div>
              <div className="cl-v">
                v{r.version}
                <span
                  className="cl-tag"
                  style={{
                    color: TAG_COLORS[r.tag] ?? "var(--faint)",
                    borderColor: `color-mix(in srgb, ${TAG_COLORS[r.tag] ?? "var(--faint)"} 30%, transparent)`,
                    background: `color-mix(in srgb, ${TAG_COLORS[r.tag] ?? "var(--faint)"} 10%, transparent)`,
                  }}
                >
                  {r.tag}
                </span>
              </div>
              <div className="cl-items">
                {r.items.map((item) => (
                  <div key={item} className="cl-item">{item}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
