"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAuthToken } from "@/lib/auth-client";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";
import { PRICING } from "@/lib/pricing.config";
import { ROICalculator } from "@/components/pricing/ROICalculator";
import { CheckoutModal } from "@/components/CheckoutModal";

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
      { k: "Signal sources",            f: "Reddit + GitHub", fo: "All 5 sources",  t: "All 5 sources",    s: "All + custom" },
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
      { k: "GTM Brief",                 f: "—",               fo: "—",              t: "✓",                s: "✓" },
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
    group: "Support",
    rows: [
      { k: "Response SLA",              f: "Best effort",     fo: "24h",            t: "24h",              s: "4h dedicated" },
      { k: "White-label reports",       f: "—",               fo: "—",              t: "—",                s: "✓", soon: true },
      { k: "Invoice billing (NET30)",   f: "—",               fo: "—",              t: "—",                s: "✓" },
    ],
  },
];

const FAQ = [
  {
    q: "Where does the data actually come from?",
    a: "Reddit, GitHub, Hacker News, Dev.to, and Brave Search. Every signal has a source link. Nothing is invented — data is fetched live when you submit your idea.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes — one click in Settings → Billing. You keep access until the end of the period. No retention emails, no \"are you sure\" gauntlet.",
  },
  {
    q: "Do you offer refunds?",
    a: "7-day full refund on your first payment, no questions asked. Email billing@pledgeoff.com — done.",
  },
  {
    q: "What's the catch on Free?",
    a: "1 validation a month is enough to experience the product. If it's not for you, stay on Free forever. We mean it.",
  },
  {
    q: "What's the difference between Founder and Team?",
    a: "Founder gives you 20 validations/month, all 5 signal sources, and 5 of the 6 intelligence tools — perfect for solo builders. Team raises the cap to 60 validations/month, adds GTM Brief (the 6th tool), 3 seats, 45 Otto questions, and early access to every new feature we ship.",
  },
  {
    q: "Is the verdict really accurate?",
    a: "It depends on what you mean by accurate. PledgeOFF doesn't predict the future — it surfaces real signals from Reddit, GitHub, HN, and more to show what the market is saying right now. Every source is linked so you can verify. We track your outcomes over time: GO verdicts where founders built and it worked, KILL verdicts where they didn't build and saved months. The accuracy rate is visible in your settings.",
  },
  {
    q: "What happens to my data?",
    a: "Your idea text and validation results are stored in our EU-hosted database (Supabase, Frankfurt region). We don't sell your data, use it to train models, or share it with third parties — except the infrastructure providers listed in our Privacy Policy. You can export everything or delete your account at any time from Settings → Danger Zone.",
  },
];

function SoonBadge() {
  return (
    <span
      className="mono text-[9px] px-1.5 py-0.5 rounded uppercase tracking-[0.06em] ml-1.5 align-middle"
      style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)" }}
    >
      soon
    </span>
  );
}

function renderCell(val: string, emphasize = false, soon = false) {
  if (val === "—") return <span style={{ color: "var(--t3)" }}>—</span>;
  if (val === "✓") return <><span style={{ color: "var(--validated)" }}>✓</span>{soon && <SoonBadge />}</>;
  return (
    <span
      className={emphasize ? "display tnum text-[13px] font-semibold" : "text-[13px]"}
      style={{ color: emphasize ? "var(--t1)" : "var(--t2)" }}
    >
      {val}{soon && <SoonBadge />}
    </span>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const id = `faq-${q.slice(0, 20).replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className="border-b" style={{ borderColor: "var(--border)" }}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={id}
        className="w-full text-left py-5 flex items-center justify-between gap-4"
      >
        <span className="display text-[16px] font-semibold tracking-tight" style={{ color: "var(--t1)" }}>
          {q}
        </span>
        <span className="mono text-[14px] shrink-0" style={{ color: "var(--t3)" }} aria-hidden="true">
          {open ? "−" : "+"}
        </span>
      </button>
      <div id={id} style={{ maxHeight: open ? 400 : 0, overflow: "hidden", transition: "max-height 400ms cubic-bezier(0.16,1,0.3,1)" }}>
        <p className="text-[14px] leading-[1.65] pb-5 max-w-170" style={{ color: "var(--t2)" }}>{a}</p>
      </div>
    </div>
  );
}

function UpgradeButton({
  priceId,
  label,
  primary = false,
  variant,
}: {
  priceId: string;
  label: string;
  primary?: boolean;
  variant?: "text";
}) {
  const router = useRouter();
  const [unavailable, setUnavailable] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  async function handleClick() {
    if (!priceId) { setUnavailable(true); return; }
    setUnavailable(false);

    const token = await getAuthToken();
    if (!token) {
      router.push("/login?next=/pricing");
      return;
    }

    setModalOpen(true);
  }

  if (variant === "text") {
    return (
      <>
        <button
          onClick={handleClick}
          className="mono text-[11px] transition-opacity hover:opacity-70"
          style={{ color: "var(--t2)" }}
        >
          {label}
        </button>
        <CheckoutModal priceId={priceId} isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    );
  }

  if (primary) {
    return (
      <>
        <div className="w-full sm:w-auto">
          <button
            onClick={handleClick}
            className="display w-full sm:w-auto px-6 h-10 flex items-center justify-center rounded-md text-[13px] font-semibold hover:opacity-90 transition-opacity"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            {label}
          </button>
          {unavailable && (
            <p className="mono text-[10px] mt-1 text-center" style={{ color: "var(--kill)" }}>
              Plan unavailable — contact support
            </p>
          )}
        </div>
        <CheckoutModal priceId={priceId} isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    );
  }

  return (
    <>
      <div className="w-full">
        <button
          onClick={handleClick}
          className="w-full h-10 flex items-center justify-center rounded-md border text-[13px] transition-colors"
          style={{ borderColor: "var(--border)", color: "var(--t1)" }}
        >
          {label}
        </button>
        {unavailable && (
          <p className="mono text-[10px] mt-1 text-center" style={{ color: "var(--kill)" }}>
            Plan unavailable — contact support
          </p>
        )}
      </div>
      <CheckoutModal priceId={priceId} isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}

export function PricingClient({ popularPlan }: { popularPlan?: "founder" | "team" | "studio" | null }) {
  const [billing, setBilling] = useState<"month" | "year">("month");

  const founderPrice = billing === "month" ? String(PRICING.founder.monthly.eur) : String(PRICING.founder.monthly.annual_equivalent);
  const founderSub = billing === "month" ? "/mo" : `/mo · billed annually · €${PRICING.founder.monthly.annual_total}/yr`;
  const founderPriceId = billing === "month" ? FOUNDER_MONTHLY_PRICE_ID : FOUNDER_ANNUAL_PRICE_ID;

  const teamPrice = billing === "month" ? String(PRICING.team.monthly.eur) : String(PRICING.team.monthly.annual_equivalent);
  const teamSub = billing === "month" ? "/mo" : `/mo · billed annually · €${PRICING.team.monthly.annual_total}/yr`;
  const teamPriceId = billing === "month" ? TEAM_MONTHLY_PRICE_ID : TEAM_ANNUAL_PRICE_ID;

  const studioPrice = billing === "month" ? String(PRICING.studio.monthly.eur) : String(PRICING.studio.monthly.annual_equivalent);
  const studioSub = billing === "month" ? "/mo" : `/mo · billed annually · €${PRICING.studio.monthly.annual_total}/yr`;
  const studioPriceId = billing === "month" ? STUDIO_MONTHLY_PRICE_ID : STUDIO_ANNUAL_PRICE_ID;

  return (
    <div className="min-h-screen" style={{ background: "var(--canvas)" }}>
      <PublicNav />

      {/* Hero */}
      <div className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-360 mx-auto px-4 sm:px-10 py-10 sm:py-16 flex flex-col sm:grid sm:grid-cols-12 sm:gap-8 sm:items-end gap-6">
          <div className="sm:col-span-7">
            <div className="mono text-[10px] uppercase tracking-[0.14em] mb-4" style={{ color: "var(--t3)" }}>
              upgrade
            </div>
            <h1 className="display text-[36px] sm:text-[56px] font-semibold tracking-tight leading-[0.95]" style={{ color: "var(--t1)" }}>
              Start free.
              <br />
              <span style={{ color: "var(--t3)" }}>Pay when it saves you a month of work.</span>
            </h1>
            <p className="mt-6 max-w-130 text-[14px] sm:text-[15px] leading-[1.6]" style={{ color: "var(--t2)" }}>
              Validate ideas with real signals from Reddit, GitHub, HN, Dev.to, and more.{" "}
              <span style={{ color: "var(--t3)" }}>Cancel anytime — really.</span>
            </p>
          </div>
          {/* Billing toggle — pill buttons */}
          <div className="sm:col-span-5 flex sm:justify-end items-center gap-2">
            <div className="flex rounded-md border overflow-hidden" style={{ borderColor: "var(--border)" }} role="group" aria-label="Billing interval">
              <button
                onClick={() => setBilling("month")}
                className="mono text-[11px] px-4 h-9 transition-colors"
                style={billing === "month"
                  ? { background: "var(--accent)", color: "var(--accent-fg)" }
                  : { background: "var(--surface)", color: "var(--t2)" }}
                aria-pressed={billing === "month"}
              >
                Monthly
              </button>
              <button
                onClick={() => setBilling("year")}
                className="mono text-[11px] px-4 h-9 transition-colors"
                style={billing === "year"
                  ? { background: "var(--accent)", color: "var(--accent-fg)" }
                  : { background: "var(--surface)", color: "var(--t2)" }}
                aria-pressed={billing === "year"}
              >
                Annual
              </button>
            </div>
            <span className="mono text-[10px] tnum" style={{ color: "var(--accent)" }}>save ~20%</span>
          </div>
        </div>
      </div>

      <div className="max-w-360 mx-auto px-4 sm:px-10 py-8 sm:py-12">
        {/* Plans — 4 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-4 border rounded-md overflow-hidden" style={{ borderColor: "var(--border)" }}>

          {/* Free */}
          <div className="p-6 border-b sm:border-b-0 sm:border-r flex flex-col" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div className="display text-[18px] font-semibold mb-1" style={{ color: "var(--t1)" }}>Free</div>
            <div className="text-[12px] mb-4" style={{ color: "var(--t3)" }}>before you commit</div>
            <div className="display text-[42px] tnum font-semibold mb-0.5 leading-none" style={{ color: "var(--t1)" }}>€0</div>
            <div className="mono text-[11px] mb-5" style={{ color: "var(--t3)" }}>forever</div>
            <Link
              href="/login"
              className="w-full h-10 flex items-center justify-center rounded-md border text-[13px] transition-colors mb-5"
              style={{ borderColor: "var(--border)", color: "var(--t1)" }}
            >
              Get started
            </Link>
            <ul className="space-y-2 flex-1">
              {[
                "1 validation / month",
                "Reddit + GitHub signals",
                "7-day idea history",
                "1 seat",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="mono text-[11px] mt-0.5 shrink-0" style={{ color: "var(--t3)" }}>✓</span>
                  <span className="text-[12px]" style={{ color: "var(--t2)" }}>{f}</span>
                </li>
              ))}
              {["Intelligence tools", "PDF / JSON export"].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="mono text-[11px] mt-0.5 shrink-0" style={{ color: "var(--border)" }}>—</span>
                  <span className="text-[12px]" style={{ color: "var(--t3)" }}>{f}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
              <p className="text-[11px] leading-[1.55]" style={{ color: "var(--t3)" }}>
                Hit your free validation?{" "}
                <span style={{ color: "var(--t2)" }}>You&apos;re building seriously.</span>
              </p>
              <a
                href="#founder"
                className="mono text-[10px] mt-1 inline-block transition-opacity hover:opacity-70"
                style={{ color: "var(--accent)" }}
              >
                Upgrade to Founder →
              </a>
            </div>
          </div>

          {/* Founder */}
          <div id="founder" className="p-6 border-b sm:border-b-0 sm:border-r relative flex flex-col" style={{ borderColor: "var(--border)", background: "var(--canvas)" }}>
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "var(--accent)" }} />
            <div className="flex items-baseline justify-between mb-1">
              <div className="display text-[18px] font-semibold" style={{ color: "var(--t1)" }}>Founder</div>
              <span className="mono text-[10px]" style={{ color: "var(--accent)" }}>
                {popularPlan === "founder" ? "● most popular" : "● best value"}
              </span>
            </div>
            <div className="text-[12px] mb-4" style={{ color: "var(--t3)" }}>solo builder</div>
            <div className="flex items-baseline gap-1">
              <span className="display text-[42px] tnum font-semibold leading-none" style={{ color: "var(--t1)" }}>€{founderPrice}</span>
            </div>
            <div className="mono text-[11px] mb-5" style={{ color: "var(--t3)" }}>{founderSub}</div>
            <div className="mb-5">
              <UpgradeButton priceId={founderPriceId} label="Upgrade to Founder" primary />
              <div className="mono text-[10px] mt-2 text-center" style={{ color: "var(--t3)" }}>cancel anytime · 7-day refund</div>
            </div>
            <ul className="space-y-2 flex-1">
              {([
                { label: "20 validations / month" },
                { label: "All 5 signal sources" },
                { label: "ICP Analysis · Competitive · Revenue · Build · Page" },
                { label: "PDF + JSON export" },
                { label: "1-year idea history" },
                { label: "15 Otto questions / mo" },
                { label: "24h support SLA" },
              ] as { label: string; soon?: boolean }[]).map((f) => (
                <li key={f.label} className="flex items-start gap-2">
                  <span className="mono text-[11px] mt-0.5 shrink-0" style={{ color: "var(--accent)" }}>✓</span>
                  <span className="text-[12px]" style={{ color: "var(--t1)" }}>{f.label}{f.soon && <SoonBadge />}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Team */}
          <div className="p-6 border-b sm:border-b-0 sm:border-r flex flex-col" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div className="flex items-baseline justify-between">
              <div className="display text-[18px] font-semibold" style={{ color: "var(--t1)" }}>Team</div>
              {popularPlan === "team" && (
                <span className="mono text-[10px]" style={{ color: "var(--validated)" }}>● most popular</span>
              )}
            </div>
            <div className="text-[12px] mb-4 mt-1" style={{ color: "var(--t3)" }}>unlimited + collaborate</div>
            <div className="flex items-baseline gap-1">
              <span className="display text-[42px] tnum font-semibold leading-none" style={{ color: "var(--t1)" }}>€{teamPrice}</span>
            </div>
            <div className="mono text-[11px] mb-5" style={{ color: "var(--t3)" }}>{teamSub}</div>
            <div className="mb-5">
              <UpgradeButton priceId={teamPriceId} label="Upgrade to Team" primary />
              <div className="mono text-[10px] mt-2 text-center" style={{ color: "var(--t3)" }}>cancel anytime · 7-day refund</div>
            </div>
            <ul className="space-y-2 flex-1">
              {([
                { label: "60 validations / month" },
                { label: "All 5 signal sources" },
                { label: "All 6 intelligence tools incl. GTM Brief" },
                { label: "PDF + JSON export" },
                { label: "Unlimited idea history" },
                { label: "3 team seats" },
                { label: "45 Otto questions / mo" },
                { label: "Early access to features" },
              ] as { label: string; soon?: boolean }[]).map((f) => (
                <li key={f.label} className="flex items-start gap-2">
                  <span className="mono text-[11px] mt-0.5 shrink-0" style={{ color: "var(--validated)" }}>✓</span>
                  <span className="text-[12px]" style={{ color: "var(--t1)" }}>{f.label}{f.soon && <SoonBadge />}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Studio */}
          <div className="p-6 flex flex-col" style={{ background: "var(--canvas)" }}>
            <div className="flex items-baseline justify-between">
              <div className="display text-[18px] font-semibold" style={{ color: "var(--t1)" }}>Studio</div>
              {popularPlan === "studio" && (
                <span className="mono text-[10px]" style={{ color: "var(--t2)" }}>● most popular</span>
              )}
            </div>
            <div className="text-[12px] mb-4 mt-1" style={{ color: "var(--t3)" }}>agencies & studios</div>
            <div className="flex items-baseline gap-1">
              <span className="display text-[42px] tnum font-semibold leading-none" style={{ color: "var(--t1)" }}>€{studioPrice}</span>
            </div>
            <div className="mono text-[11px] mb-5" style={{ color: "var(--t3)" }}>{studioSub}</div>
            <div className="mb-5">
              <UpgradeButton priceId={studioPriceId} label="Upgrade to Studio" />
              <div className="mono text-[10px] mt-2 text-center" style={{ color: "var(--t3)" }}>cancel anytime · 7-day refund</div>
            </div>
            <ul className="space-y-2 flex-1">
              {([
                { label: "100 validations / month" },
                { label: "All sources + custom" },
                { label: "All 6 intelligence tools" },
                { label: "White-label reports", soon: true },
                { label: "8 team seats" },
                { label: "120 Otto questions / mo" },
                { label: "Invoice billing (NET30)" },
                { label: "4h dedicated SLA" },
              ] as { label: string; soon?: boolean }[]).map((f) => (
                <li key={f.label} className="flex items-start gap-2">
                  <span className="mono text-[11px] mt-0.5 shrink-0" style={{ color: "var(--validated)" }}>✓</span>
                  <span className="text-[12px]" style={{ color: "var(--t2)" }}>{f.label}{f.soon && <SoonBadge />}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Enterprise nudge */}
        <div
          className="mt-4 border rounded-md px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <div>
            <span className="text-[13px] text-(--t1)">Need custom signal sources, SSO, DPA, or invoice billing?</span>
            <span className="text-[12px] ml-2" style={{ color: "var(--t3)" }}>10+ seats · annual contract</span>
          </div>
          <a
            href="/enterprise"
            className="mono text-[11px] px-4 h-10 rounded-md border inline-flex items-center shrink-0 transition-colors"
            style={{ borderColor: "var(--border)", color: "var(--t2)" }}
          >
            Enterprise →
          </a>
        </div>

        {/* Validation Packs */}
        <div className="mt-8">
          <div className="flex items-baseline gap-3 mb-1">
            <h2 className="display text-[18px] font-semibold tracking-tight" style={{ color: "var(--t1)" }}>
              Validation Packs
            </h2>
            <span className="mono text-[10px]" style={{ color: "var(--t3)" }}>Founder+ · never expire</span>
          </div>
          <p className="text-[13px] mb-4" style={{ color: "var(--t2)" }}>
            Need more validations this month? Top up — credits stack with your plan quota.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PRICING.validationPacks.packs.map((pack) => (
              <div
                key={pack.count}
                className="border rounded-md px-5 py-4 flex items-center justify-between"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <div>
                  <div className="display text-[15px] font-semibold" style={{ color: "var(--t1)" }}>
                    {pack.label}
                    <span className="mono text-[11px] font-normal ml-2" style={{ color: "var(--t3)" }}>
                      {pack.count} validations
                    </span>
                  </div>
                  <div className="mono text-[11px] mt-0.5" style={{ color: "var(--t3)" }}>
                    €{(pack.eur / pack.count).toFixed(2)}/validation
                  </div>
                </div>
                <div className="display text-[22px] tnum font-semibold shrink-0" style={{ color: "var(--t1)" }}>
                  €{pack.eur}
                </div>
              </div>
            ))}
          </div>
          <p className="mono text-[10px] mt-2" style={{ color: "var(--t3)" }}>
            Purchase from Settings → Billing · one-time · no subscription
          </p>
        </div>

        {/* VAT footnote */}
        <p className="mono text-[10px] mt-4 text-center" style={{ color: "var(--t3)" }}>
          All prices in EUR · excl. VAT where applicable
        </p>

        {/* Feature comparison table */}
        <div className="mt-12 sm:mt-16">
          <h2 className="display text-[24px] sm:text-[28px] font-semibold tracking-tight mb-2" style={{ color: "var(--t1)" }}>
            What&apos;s actually included.
          </h2>
          <p className="text-[13px] mb-6 sm:mb-8" style={{ color: "var(--t2)" }}>
            Specific features, not &ldquo;Limited&rdquo; vs &ldquo;Full access&rdquo;.
          </p>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="border rounded-md overflow-hidden min-w-160 mx-4 sm:mx-0" style={{ borderColor: "var(--border)" }}>
              {/* Column headers */}
              <div
                className="grid grid-cols-12 gap-3 px-6 py-3 mono text-[10px] uppercase tracking-[0.14em] border-b"
                style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--t3)" }}
              >
                <div className="col-span-4">Feature</div>
                <div className="col-span-2">Free</div>
                <div className="col-span-2" style={{ color: "var(--accent)" }}>Founder</div>
                <div className="col-span-2">Team</div>
                <div className="col-span-2">Studio</div>
              </div>
              {FEATURES.map((g) => (
                <div key={g.group}>
                  <div
                    className="px-6 py-2.5 mono text-[10px] uppercase tracking-[0.14em] border-b"
                    style={{ borderColor: "var(--border)", color: "var(--t2)", background: "var(--surface)" }}
                  >
                    {g.group}
                  </div>
                  {g.rows.map((r) => (
                    <div key={r.k} className="grid grid-cols-12 gap-3 px-6 py-3 border-b items-center" style={{ borderColor: "var(--border)" }}>
                      <div className="col-span-4 text-[13px]" style={{ color: "var(--t1)" }}>
                        {r.k}{r.soon && <SoonBadge />}
                      </div>
                      <div className="col-span-2">{renderCell(r.f)}</div>
                      <div className="col-span-2">{renderCell(r.fo, true)}</div>
                      <div className="col-span-2">{renderCell(r.t)}</div>
                      <div className="col-span-2">{renderCell(r.s)}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ROI Calculator */}
        <ROICalculator />

        {/* FAQ */}
        <div className="mt-16">
          <h2 className="display text-[28px] font-semibold tracking-tight mb-2" style={{ color: "var(--t1)" }}>
            Real questions.
          </h2>
          <p className="text-[13px] mb-6" style={{ color: "var(--t2)" }}>
            If something&apos;s missing, email us. No bots, no tickets.
          </p>
          <div>
            {FAQ.map((f) => (
              <FAQItem key={f.q} {...f} />
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div
          className="mt-16 mb-10 border-t pt-10"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="display text-[28px] font-semibold tracking-tight mb-1" style={{ color: "var(--t1)" }}>
            Ready when you are.
          </div>
          <div className="mono text-[11px] mb-8" style={{ color: "var(--t3)" }}>
            still on Free?{" "}
            <Link href="/dashboard" className="transition-colors" style={{ color: "var(--t1)" }}>
              back to dashboard →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Founder mini-card */}
            <div
              className="relative rounded-md p-5 flex flex-col gap-3"
              style={{ background: "var(--surface)", border: "1px solid var(--accent)" }}
            >
              <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-md" style={{ background: "var(--accent)" }} />
              <div>
                <div className="display text-[15px] font-semibold" style={{ color: "var(--t1)" }}>Founder</div>
                <div className="mono text-[10px] mt-0.5" style={{ color: "var(--t3)" }}>solo builder</div>
              </div>
              <div className="display text-[28px] tnum font-semibold leading-none" style={{ color: "var(--t1)" }}>
                €{founderPrice}<span className="text-[13px] font-normal ml-1" style={{ color: "var(--t3)" }}>/mo</span>
              </div>
              <UpgradeButton priceId={founderPriceId} label="Upgrade to Founder →" primary />
            </div>

            {/* Team mini-card */}
            <div
              className="rounded-md p-5 flex flex-col gap-3"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div>
                <div className="display text-[15px] font-semibold" style={{ color: "var(--t1)" }}>Team</div>
                <div className="mono text-[10px] mt-0.5" style={{ color: "var(--t3)" }}>unlimited + collaborate</div>
              </div>
              <div className="display text-[28px] tnum font-semibold leading-none" style={{ color: "var(--t1)" }}>
                €{teamPrice}<span className="text-[13px] font-normal ml-1" style={{ color: "var(--t3)" }}>/mo</span>
              </div>
              <UpgradeButton priceId={teamPriceId} label="Upgrade to Team →" />
            </div>

            {/* Studio mini-card */}
            <div
              className="rounded-md p-5 flex flex-col gap-3"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div>
                <div className="display text-[15px] font-semibold" style={{ color: "var(--t1)" }}>Studio</div>
                <div className="mono text-[10px] mt-0.5" style={{ color: "var(--t3)" }}>agencies &amp; studios</div>
              </div>
              <div className="display text-[28px] tnum font-semibold leading-none" style={{ color: "var(--t1)" }}>
                €{studioPrice}<span className="text-[13px] font-normal ml-1" style={{ color: "var(--t3)" }}>/mo</span>
              </div>
              <UpgradeButton priceId={studioPriceId} label="Upgrade to Studio →" />
            </div>
          </div>

          <div className="mono text-[10px] mt-4" style={{ color: "var(--t3)" }}>
            cancel anytime · 7-day refund on first payment
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
