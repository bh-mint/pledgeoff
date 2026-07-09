"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAuthToken } from "@/lib/auth-client";
import { CheckoutModal } from "@/components/CheckoutModal";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";
import { PRICING } from "@/lib/pricing.config";
import { PLAN_TOOL_GATES } from "@pledgeoff/core";
import { ROICalculator } from "@/components/pricing/ROICalculator";

const FOUNDER_MONTHLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_FOUNDER_MONTHLY_PRICE_ID ?? "";
const FOUNDER_ANNUAL_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_FOUNDER_ANNUAL_PRICE_ID ?? "";
const TEAM_MONTHLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_PRICE_ID ?? "";
const TEAM_ANNUAL_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_TEAM_ANNUAL_PRICE_ID ?? "";
const STUDIO_MONTHLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_STUDIO_MONTHLY_PRICE_ID ?? "";
const STUDIO_ANNUAL_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_STUDIO_ANNUAL_PRICE_ID ?? "";

type FeatureRow = { k: string; f: string; fo: string; t: string; s: string; soon?: boolean };

const FEATURES: { group: string; rows: FeatureRow[] }[] = [
  {
    group: "Validation",
    rows: [
      { k: "Validations / month",       f: "1",               fo: "20",             t: "60",               s: "100" },
      { k: "Signal sources",            f: "Reddit · GitHub", fo: "All 8 sources",  t: "All 8 sources",    s: "All 8 sources" },
      { k: "PDF / JSON export",         f: "—",               fo: "✓",              t: "✓",                s: "✓ · white-label" },
    ],
  },
  {
    group: "Intelligence tools",
    rows: [
      { k: "ICP Analysis",              f: "Limited",         fo: "✓",              t: "✓",                s: "✓" },
      { k: "Competitive Landscape",     f: "—",               fo: "✓",              t: "✓",                s: "✓" },
      { k: "Revenue Model",             f: "—",               fo: "✓",              t: "✓",                s: "✓" },
      { k: "Build Spec",                f: "—",               fo: "✓",              t: "✓",                s: "✓" },
      { k: "Page Brief",                f: "—",               fo: "✓",              t: "✓",                s: "✓" },
      { k: "Feature Analysis",          f: "—",               fo: "✓",              t: "✓",                s: "✓" },
      { k: "Market Landscape",          f: "—",               fo: "✓",              t: "✓",                s: "✓" },
      { k: "Interview Guide",           f: "—",               fo: "✓",              t: "✓",                s: "✓" },
      { k: "GTM Brief",                 f: "—",               fo: "—",              t: "✓",                s: "✓" },
      { k: "Battlecard",                f: "—",               fo: "—",              t: "✓",                s: "✓" },
      { k: "Transcript Analyzer",       f: "—",               fo: "—",              t: "✓",                s: "✓" },
    ],
  },
  {
    group: "History",
    rows: [
      { k: "Idea history",              f: "7 days",          fo: "1 year",         t: "Unlimited",        s: "Unlimited" },
    ],
  },
  {
    group: "Team",
    rows: [
      { k: "Seats included",            f: "1",               fo: "1",              t: "3",                s: "8" },
      { k: "Extra seats",               f: "—",               fo: "—",              t: `€${PRICING.seats.extraEurPerMonth}/seat/mo`,      s: `€${PRICING.seats.extraEurPerMonth}/seat/mo` },
      { k: "Early access to features",  f: "—",               fo: "—",              t: "✓",                s: "✓" },
    ],
  },
  {
    group: "Otto AI",
    rows: [
      { k: "Otto questions / month",    f: "—",               fo: "15",             t: "45",               s: "120" },
    ],
  },
  {
    group: "Developer",
    rows: [
      { k: "Outgoing webhooks",         f: "—",               fo: "✓",              t: "✓",                s: "✓" },
      { k: "API access",                f: "—",               fo: "—",              t: "✓",                s: "✓" },
      { k: "Signal Feed (trending)",    f: "—",               fo: "—",              t: "✓",                s: "✓" },
    ],
  },
  {
    group: "Support",
    rows: [
      { k: "Response SLA",              f: "Best effort",     fo: "24h",            t: "24h",              s: "4h dedicated" },
      { k: "White-label reports",       f: "—",               fo: "—",              t: "—",                s: "✓", soon: true },
      { k: "Activity log",              f: "—",               fo: "—",              t: "—",                s: "✓" },
      { k: "Invoice billing (NET30)",   f: "—",               fo: "—",              t: "—",                s: "✓" },
    ],
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "What counts as a validation?",
    a: "Each time you submit an idea and receive a GO / PIVOT / KILL verdict, that's one validation. Viewing an existing verdict, sharing it, or running intelligence tools on it does not count.",
  },
  {
    q: "Do unused validations roll over?",
    a: "Monthly allocations reset at the start of each billing period — they don't roll over. Validation Packs, however, never expire and stack on top of your monthly allocation.",
  },
  {
    q: "What is Otto?",
    a: "Otto is the decision co-pilot built into every verdict. You can ask it follow-up questions and it answers with awareness of your specific verdict and signals. Each question uses one Otto credit.",
  },
  {
    q: "What are the intelligence tools?",
    a: "Eleven tools you can run after a verdict — from ICP Analysis, Competitive Landscape, and Revenue Model to Battlecards, Interview Guides, and Transcript Analysis. Founder plan includes eight; Team and above gets all eleven.",
  },
  {
    q: "Can I upgrade or downgrade at any time?",
    a: "Yes. Upgrades are pro-rated and take effect immediately. Downgrades take effect at the end of your current billing period. You won't lose access to existing verdicts.",
  },
  {
    q: "Do you offer refunds?",
    a: "7-day full refund on your first payment, no questions asked. Email billing@pledgeoff.com.",
  },
  {
    q: "Is the verdict really accurate?",
    a: "PledgeOFF doesn't predict the future — it surfaces real signals from Reddit, GitHub, HN, and more to show what the market is saying right now. Every source is linked so you can verify.",
  },
  {
    q: "What happens to my data?",
    a: "Your idea text and validation results are stored in our EU-hosted database (Supabase, Frankfurt region). We don't sell your data or use it to train models. You can export or delete everything from Settings → Danger Zone.",
  },
];

function SoonBadge() {
  return (
    <span
      className="mono"
      style={{
        fontSize: "8px",
        padding: "2px 6px",
        marginLeft: "6px",
        verticalAlign: "middle",
        background: "color-mix(in srgb, var(--pivot) 10%, transparent)",
        color: "var(--pivot)",
        border: "1px solid color-mix(in srgb, var(--pivot) 30%, transparent)",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
      }}
    >
      soon
    </span>
  );
}

function renderCell(val: string, emphasize = false, soon = false) {
  if (val === "—") return <span style={{ color: "var(--faint)" }}>—</span>;
  if (val === "✓") return <><span style={{ color: "var(--go)" }}>✓</span>{soon && <SoonBadge />}</>;
  return (
    <span
      style={{
        fontSize: "12px",
        color: emphasize ? "var(--ink)" : "var(--dim)",
        fontFamily: emphasize ? "var(--font-chivo-mono)" : undefined,
        fontWeight: emphasize ? 600 : undefined,
      }}
    >
      {val}{soon && <SoonBadge />}
    </span>
  );
}

function MarketDataPackSection() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");

  async function join(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "saving" || status === "done") return;
    setStatus("saving");
    const res = await fetch("/api/v1/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, source: "market_data_pack" }),
    }).catch(() => null);
    setStatus(res?.ok ? "done" : "error");
  }

  return (
    <div style={{ marginTop: "48px", border: "1px solid var(--line)", background: "var(--surface)", padding: "24px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "10px", flexWrap: "wrap", marginBottom: "6px" }}>
        <span className="eye" style={{ marginBottom: 0 }}>Add-on</span>
        <SoonBadge />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "24px", alignItems: "start" }}>
        <div>
          <h3 style={{ fontFamily: "var(--font-bitter), serif", fontSize: "22px", fontWeight: 700, color: "var(--ink)", margin: "6px 0 4px" }}>
            Market Data Pack
          </h3>
          <p className="mono" style={{ fontSize: "12px", color: "var(--dim)", marginBottom: "12px" }}>
            €49 / report · or €199 / mo
          </p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, fontSize: "13px", color: "var(--dim)", lineHeight: 2 }}>
            <li>✦ Real market size data (Statista)<SoonBadge /></li>
            <li>✦ Funding &amp; growth data (Crunchbase)<SoonBadge /></li>
            <li>✦ Verified TAM / SAM / SOM in every Revenue Model</li>
          </ul>
        </div>
        <div>
          <p style={{ fontSize: "13px", color: "var(--dim)", margin: "6px 0 12px", lineHeight: 1.7 }}>
            Today PledgeOFF estimates market size from live signals. The Market Data Pack replaces
            estimates with verified research data. Join the waitlist and we&apos;ll email you when it ships.
          </p>
          {status === "done" ? (
            <p className="mono" style={{ fontSize: "12px", color: "var(--go)" }}>
              You&apos;re on the list. We&apos;ll be in touch.
            </p>
          ) : (
            <form onSubmit={join} style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                aria-label="Email for Market Data Pack waitlist"
                style={{ flex: "1 1 200px", padding: "9px 12px", fontSize: "13px", background: "var(--bg)", border: "1px solid var(--line)", color: "var(--ink)", borderRadius: 3 }}
              />
              <button
                type="submit"
                disabled={status === "saving"}
                className="mono"
                style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "9px 18px", background: "var(--ink)", color: "var(--bg)", border: "none", cursor: "pointer", opacity: status === "saving" ? 0.6 : 1, borderRadius: 3 }}
              >
                {status === "saving" ? "Joining…" : "Join waitlist"}
              </button>
              {status === "error" && (
                <p className="mono" style={{ fontSize: "11px", color: "var(--kill)", width: "100%" }}>
                  Something went wrong — try again.
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const id = `faq-${q.slice(0, 20).replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className={`faq-item${open ? " open" : ""}`}>
      <button
        className="faq-q"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={id}
      >
        <span className="faq-qt">{q}</span>
        <span className="faq-ic" aria-hidden="true">+</span>
      </button>
      <div id={id} className="faq-a">{a}</div>
    </div>
  );
}

function UpgradeButton({
  priceId,
  label,
  primary = false,
}: {
  priceId: string;
  label: string;
  primary?: boolean;
}) {
  const router = useRouter();
  const [unavailable, setUnavailable] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  async function handleClick() {
    if (!priceId) { setUnavailable(true); return; }
    setUnavailable(false);
    const token = await getAuthToken();
    if (!token) { router.push("/login?next=/pricing"); return; }
    setModalOpen(true);
  }

  return (
    <>
      <div style={{ width: "100%" }}>
        <button
          onClick={handleClick}
          className={primary ? "btn-p" : "btn-g"}
          style={{ width: "100%", justifyContent: "center" }}
        >
          {label}
        </button>
        {unavailable && (
          <p className="mono" style={{ fontSize: "10px", marginTop: "4px", color: "var(--kill)" }}>
            Plan unavailable — contact support
          </p>
        )}
      </div>
      <CheckoutModal priceId={priceId} isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}

export function PricingClient({ popularPlan }: { popularPlan?: "founder" | "team" | "studio" | null }) {
  const [annual, setAnnual] = useState(false);

  const founderPrice = annual ? PRICING.founder.monthly.annual_equivalent : PRICING.founder.monthly.eur;
  const founderSave  = PRICING.founder.monthly.eur * 12 - PRICING.founder.monthly.annual_total;
  const founderNote  = annual ? `billed €${PRICING.founder.monthly.annual_total}/yr` : "";
  const founderPriceId = annual ? FOUNDER_ANNUAL_PRICE_ID : FOUNDER_MONTHLY_PRICE_ID;
  const founderCpv   = `€${(founderPrice / 20).toFixed(2)}/validation`;

  const teamPrice = annual ? PRICING.team.monthly.annual_equivalent : PRICING.team.monthly.eur;
  const teamSave  = PRICING.team.monthly.eur * 12 - PRICING.team.monthly.annual_total;
  const teamNote  = annual ? `billed €${PRICING.team.monthly.annual_total}/yr` : "";
  const teamPriceId = annual ? TEAM_ANNUAL_PRICE_ID : TEAM_MONTHLY_PRICE_ID;
  const teamCpv   = `€${(teamPrice / 60).toFixed(2)}/validation`;

  const studioPrice = annual ? PRICING.studio.monthly.annual_equivalent : PRICING.studio.monthly.eur;
  const studioSave  = PRICING.studio.monthly.eur * 12 - PRICING.studio.monthly.annual_total;
  const studioNote  = annual ? `billed €${PRICING.studio.monthly.annual_total}/yr` : "";
  const studioPriceId = annual ? STUDIO_ANNUAL_PRICE_ID : STUDIO_MONTHLY_PRICE_ID;

  return (
    <div style={{ background: "var(--bg)", color: "var(--ink)" }}>
      <PublicNav />

      {/* Masthead strip */}
      <div
        className="mono"
        style={{
          background: "var(--ink)",
          color: "var(--bg)",
          padding: "8px 60px",
          fontSize: "8px",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>PledgeOFF Bulletin · Pricing</span>
        <span style={{ color: "rgba(243,239,227,0.35)" }}>Straightforward plans · no long-term commitment</span>
      </div>

      <div className="w-bleed" style={{ paddingTop: "52px", paddingBottom: "20px" }}>
        <span className="eye">Pricing</span>
        <h1 className="mkt-h2" style={{ marginBottom: "8px" }}>Straightforward plans.</h1>
        <p className="mkt-lead" style={{ marginBottom: "28px" }}>
          Start free. Upgrade when you need more. No long-term commitment.
        </p>

        {/* Annual toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
          <div
            className="ann-tog"
            onClick={() => setAnnual(!annual)}
            role="switch"
            aria-checked={annual}
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" || e.key === " " ? setAnnual(!annual) : undefined}
          >
            <span className={`ann-tog-lbl${!annual ? " on" : ""}`}>Monthly</span>
            <div className={`ann-track${annual ? " on" : ""}`}><div className="ann-thumb" /></div>
            <span className={`ann-tog-lbl${annual ? " on" : ""}`}>
              Annual <span style={{ color: "var(--go)", marginLeft: "4px" }}>−20%</span>
            </span>
          </div>
        </div>

        {/* Main 3 tiers: Free · Founder · Team */}
        <div className="plan-row">
          {/* Free */}
          <div className="plan-c">
            <div className="plan-hd">
              <div className="plan-nm">Free</div>
              <div className="plan-desc">Try before you commit.</div>
              <div className="plan-pr"><span className="plan-amt">€0</span></div>
              <div className="plan-annual-note">&nbsp;</div>
            </div>
            <div className="plan-features">
              <div className="pf yes">1 validation per month</div>
              <div className="pf yes">Full verdict — GO / PIVOT / KILL</div>
              <div className="pf yes">4 scored dimensions</div>
              <div className="pf yes">Reddit · GitHub signals</div>
              <div className="pf no">Intelligence tools</div>
              <div className="pf no">Otto co-pilot</div>
              <div className="pf no">API access</div>
            </div>
            <div className="plan-foot">
              <Link href="/login" className="btn-g" style={{ width: "100%", justifyContent: "center" }}>
                Start free
              </Link>
            </div>
          </div>

          {/* Founder */}
          <div className={`plan-c${popularPlan === "founder" || !popularPlan ? " feat" : ""}`}>
            <div className="plan-hd">
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                <div className="plan-nm">Founder</div>
                <span className="mono" style={{ fontSize: "8.5px", color: "var(--go)" }}>
                  {popularPlan === "founder" ? "● most popular" : "● best value"}
                </span>
              </div>
              <div className="plan-desc">For solo founders and individuals.</div>
              <div className="plan-pr">
                <span className="plan-amt">€{founderPrice}</span>
                <span className="plan-per">&nbsp;/&nbsp;mo</span>
              </div>
              <div className="plan-cpv">{founderCpv}</div>
              <div className="plan-annual-note">
                {founderNote || " "}
                {annual && <span className="plan-save"> · save €{founderSave}</span>}
              </div>
            </div>
            <div className="plan-features">
              <div className="pf yes">20 validations / month</div>
              <div className="pf yes">All 8 signal sources</div>
              <div className="pf yes">{PLAN_TOOL_GATES.founder.length} of {PLAN_TOOL_GATES.team.length} intelligence tools</div>
              <div className="pf yes">15 Otto questions / mo</div>
              <div className="pf yes">1-year history · PDF + JSON export</div>
              <div className="pf yes">Outgoing webhooks · 24h SLA</div>
              <div className="pf no">GTM Brief <span className="mono" style={{ fontSize: "8px" }}>Team+</span></div>
            </div>
            <div className="plan-foot">
              <UpgradeButton priceId={founderPriceId} label="Start Founder" primary />
              <p className="mono" style={{ fontSize: "8px", marginTop: "6px", color: "var(--faint)" }}>
                cancel anytime · 7-day refund
              </p>
            </div>
          </div>

          {/* Team */}
          <div className={`plan-c${popularPlan === "team" ? " feat" : ""}`}>
            <div className="plan-hd">
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                <div className="plan-nm">Team</div>
                {popularPlan === "team" && (
                  <span className="mono" style={{ fontSize: "8.5px", color: "var(--go)" }}>● most popular</span>
                )}
              </div>
              <div className="plan-desc">For small teams validating together.</div>
              <div className="plan-pr">
                <span className="plan-amt">€{teamPrice}</span>
                <span className="plan-per">&nbsp;/&nbsp;mo</span>
              </div>
              <div className="plan-cpv">{teamCpv}</div>
              <div className="plan-annual-note">
                {teamNote || " "}
                {annual && <span className="plan-save"> · save €{teamSave}</span>}
              </div>
            </div>
            <div className="plan-features">
              <div className="pf yes">60 validations / month</div>
              <div className="pf yes">All {PLAN_TOOL_GATES.team.length} intelligence tools</div>
              <div className="pf yes">45 Otto questions / mo</div>
              <div className="pf yes">3 team seats · add more at €{PRICING.seats.extraEurPerMonth}/seat</div>
              <div className="pf yes">Shared team library · early access</div>
              <div className="pf yes">API access · Signal Feed</div>
              <div className="pf yes">Validation + Otto Packs</div>
            </div>
            <div className="plan-foot">
              <UpgradeButton priceId={teamPriceId} label="Start Team" primary />
              <p className="mono" style={{ fontSize: "8px", marginTop: "6px", color: "var(--faint)" }}>
                cancel anytime · 7-day refund
              </p>
            </div>
          </div>
        </div>

        {/* Studio + Enterprise — 2-col */}
        <div className="plan-row-2">
          {/* Studio */}
          <div className={`plan-c${popularPlan === "studio" ? " feat" : ""}`}>
            <div className="plan-hd">
              <div className="plan-nm">Studio</div>
              <div className="plan-desc">For agencies and power users.</div>
              <div className="plan-pr">
                <span className="plan-amt">€{studioPrice}</span>
                <span className="plan-per">&nbsp;/&nbsp;mo</span>
              </div>
              <div className="plan-annual-note">
                {studioNote || " "}
                {annual && <span className="plan-save"> · save €{studioSave}</span>}
              </div>
            </div>
            <div className="plan-features" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div className="pf yes">100 validations / month</div>
              <div className="pf yes">All tools · 120 Otto questions</div>
              <div className="pf yes">8 team seats</div>
              <div className="pf yes">All 8 signal sources</div>
              <div className="pf yes">Audit log · NET30 invoicing</div>
              <div className="pf yes">4h dedicated SLA</div>
            </div>
            <div className="plan-foot">
              <UpgradeButton priceId={studioPriceId} label="Start Studio" />
            </div>
          </div>

          {/* Enterprise */}
          <div className="plan-c">
            <div className="plan-hd">
              <div className="plan-nm">Enterprise</div>
              <div className="plan-desc">Custom limits, SSO, and a dedicated account manager.</div>
              <div className="plan-pr">
                <span className="plan-amt" style={{ fontSize: "22px" }}>Custom pricing</span>
              </div>
              <div className="plan-annual-note">&nbsp;</div>
            </div>
            <div className="plan-features" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div className="pf yes">Everything in Studio</div>
              <div className="pf yes">SSO / SAML (coming)</div>
              <div className="pf yes">Domain allowlist</div>
              <div className="pf yes">SLA guarantee</div>
              <div className="pf yes">Custom contract · DPA</div>
              <div className="pf yes">Dedicated support</div>
            </div>
            <div className="plan-foot">
              <Link href="/enterprise" className="btn-g" style={{ width: "100%", justifyContent: "center" }}>
                Talk to sales
              </Link>
            </div>
          </div>
        </div>

        {/* Validation Packs */}
        <div className="sec">
          <div className="sec-hd">
            Validation Packs
            <span className="r">Never expire · Founder+</span>
          </div>
          <div className="sec-bd">
            <p style={{ fontSize: "13.5px", color: "var(--dim)", marginBottom: 0 }}>
              Top up beyond your monthly allocation. Packs stack with included validations and carry forward indefinitely.
            </p>
            <div className="pack-grid">
              {PRICING.validationPacks.packs.map((pack) => (
                <div key={pack.count} className="pack-c">
                  <div className="pack-nm">{pack.label}</div>
                  <div className="pack-qty">{pack.count} validations</div>
                  <div className="pack-pr">€{pack.eur}</div>
                  <div className="pack-per">€{(pack.eur / pack.count).toFixed(2)} each</div>
                </div>
              ))}
            </div>
            <p className="mono" style={{ fontSize: "8px", marginTop: "8px", color: "var(--faint)" }}>
              Purchase from Settings → Billing · one-time · no subscription
            </p>
          </div>
        </div>

        {/* Otto Packs */}
        <div className="sec">
          <div className="sec-hd">
            Otto Packs
            <span className="r">Never expire · Founder+</span>
          </div>
          <div className="sec-bd">
            <p style={{ fontSize: "13.5px", color: "var(--dim)", marginBottom: 0 }}>
              Need more Otto questions? Top up — credits stack with your plan quota.
            </p>
            <div className="pack-grid">
              {PRICING.otto.packs.map((pack) => (
                <div key={pack.count} className="pack-c">
                  <div className="pack-nm">{pack.count} questions</div>
                  <div className="pack-pr">€{pack.eur}</div>
                </div>
              ))}
            </div>
            <p className="mono" style={{ fontSize: "8px", marginTop: "8px", color: "var(--faint)" }}>
              Purchase from Settings → Billing · one-time · no subscription
            </p>
          </div>
        </div>

        <p className="mono" style={{ fontSize: "9px", marginTop: "8px", marginBottom: "40px", color: "var(--faint)" }}>
          All prices in EUR · excl. VAT where applicable
        </p>

        {/* Feature comparison table */}
        <div style={{ marginTop: "24px" }}>
          <span className="eye" style={{ marginBottom: "8px" }}>What&apos;s included</span>
          <h2 className="mkt-h2" style={{ fontSize: "clamp(20px,3vw,32px)", marginBottom: "6px" }}>
            Specific features, not &ldquo;Full access&rdquo;.
          </h2>
          <p style={{ fontSize: "13px", marginBottom: "24px", color: "var(--dim)" }}>
            Every row, every plan.
          </p>
          <div style={{ overflowX: "auto", margin: "0 -24px" }}>
            <div className="sec" style={{ minWidth: "640px", margin: "0 24px" }}>
              {/* Header */}
              <div
                className="mono"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 80px 80px 80px 80px",
                  gap: "8px",
                  padding: "9px 16px",
                  fontSize: "8.5px",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  background: "var(--surface-2)",
                  borderBottom: "1px solid var(--line)",
                  color: "var(--faint)",
                }}
              >
                <div>Feature</div>
                <div>Free</div>
                <div style={{ color: "var(--go)" }}>Founder</div>
                <div>Team</div>
                <div>Studio</div>
              </div>
              {FEATURES.map((g) => (
                <div key={g.group}>
                  <div
                    className="mono"
                    style={{
                      padding: "7px 16px",
                      fontSize: "8.5px",
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      background: "var(--surface)",
                      borderBottom: "1px solid var(--line)",
                      color: "var(--dim)",
                    }}
                  >
                    {g.group}
                  </div>
                  {g.rows.map((r) => (
                    <div
                      key={r.k}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 80px 80px 80px 80px",
                        gap: "8px",
                        padding: "9px 16px",
                        borderBottom: "1px solid var(--line-soft)",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ fontSize: "12px", color: "var(--ink)" }}>
                        {r.k}{r.soon && <SoonBadge />}
                      </div>
                      <div>{renderCell(r.f)}</div>
                      <div>{renderCell(r.fo, true)}</div>
                      <div>{renderCell(r.t)}</div>
                      <div>{renderCell(r.s, false, r.soon)}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Market Data Pack — coming soon + waitlist (16.1) */}
        <MarketDataPackSection />

        {/* ROI Calculator */}
        <ROICalculator />

        {/* FAQ */}
        <div style={{ marginTop: "48px", marginBottom: "52px" }}>
          <span className="eye" style={{ marginBottom: "16px" }}>Frequently asked</span>
          <div>
            {FAQ.map((f) => (
              <FAQItem key={f.q} {...f} />
            ))}
          </div>
        </div>
      </div>

      {/* CTA band */}
      <div className="cta-band">
        <div style={{ maxWidth: "820px", margin: "0 auto" }}>
          <span className="cta-eye">No long-term commitment</span>
          <h2 className="cta-h">Start with one free validation.</h2>
          <p className="cta-sub">See a GO, PIVOT, or KILL verdict on your own idea before paying anything.</p>
          <div className="btns">
            <Link href="/ideas/new" className="btn-inv">Validate free →</Link>
          </div>
          <p className="cta-note">Free forever · No card · Upgrade when ready</p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
