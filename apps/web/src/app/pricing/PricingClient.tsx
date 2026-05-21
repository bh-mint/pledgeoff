"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { PreLoginNav } from "@/components/PreLoginNav";
import { Footer } from "@/components/Footer";
import { PRICING } from "@/lib/pricing.config";

const PRO_MONTHLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID ?? "";
const PRO_ANNUAL_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID ?? "";
const PRO_PLUS_MONTHLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRO_PLUS_MONTHLY_PRICE_ID ?? "";
const PRO_PLUS_ANNUAL_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRO_PLUS_ANNUAL_PRICE_ID ?? "";
const AGENCY_MONTHLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_AGENCY_MONTHLY_PRICE_ID ?? "";
const AGENCY_ANNUAL_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_AGENCY_ANNUAL_PRICE_ID ?? "";

type FeatureRow = { k: string; f: string; fo: string; t: string; s: string; soon?: boolean };

const FEATURES: { group: string; rows: FeatureRow[] }[] = [
  {
    group: "Validation",
    rows: [
      { k: "Validations / month",       f: "1",               fo: "20",             t: "Unlimited",        s: "Unlimited" },
      { k: "Signal sources",            f: "Reddit + GitHub", fo: "All 5 sources",  t: "All 5 sources",    s: "All + custom" },
      { k: "Competitor Intelligence",   f: "—",               fo: "✓",              t: "✓",                s: "✓" },
      { k: "PDF / JSON export",         f: "—",               fo: "✓",              t: "✓",                s: "✓ · white-label" },
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
      { k: "Extra seats",               f: "—",               fo: "—",              t: "€12/seat/mo",      s: "€20/seat/mo" },
      { k: "Early access to features",  f: "—",               fo: "—",              t: "✓",                s: "✓" },
    ],
  },
  {
    group: "Otto AI",
    rows: [
      { k: "Otto questions / month",    f: "—",               fo: "5",              t: "15",               s: "50" },
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
    a: "30-day full refund, no questions. After 30 days we'll prorate the remaining time on request.",
  },
  {
    q: "What's the catch on Free?",
    a: "1 validation a month is enough to experience the product. If it's not for you, stay on Free forever. We mean it.",
  },
  {
    q: "What's the difference between Founder and Team?",
    a: "Founder gives you 20 validations/month and all signal sources — perfect for solo builders. Team removes the monthly cap, adds 3 seats, extra Otto AI questions, and early access to every new feature we ship.",
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
  return (
    <div className="border-b" style={{ borderColor: "var(--border)" }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left py-5 flex items-center justify-between gap-4"
      >
        <span className="display text-[16px] font-semibold tracking-tight" style={{ color: "var(--t1)" }}>
          {q}
        </span>
        <span className="mono text-[14px] shrink-0" style={{ color: "var(--t3)" }}>
          {open ? "−" : "+"}
        </span>
      </button>
      <div style={{ maxHeight: open ? 400 : 0, overflow: "hidden", transition: "max-height 400ms cubic-bezier(0.16,1,0.3,1)" }}>
        <p className="text-[14px] leading-[1.65] pb-5 max-w-170" style={{ color: "var(--t2)" }}>{a}</p>
      </div>
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
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch("/api/v1/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ priceId }),
      });

      if (res.status === 401) {
        router.push("/login?next=/pricing");
        return;
      }

      const json = await res.json() as { data?: { url: string } };
      if (json.data?.url) {
        window.location.href = json.data.url;
      }
    } finally {
      setLoading(false);
    }
  }

  if (primary) {
    return (
      <button
        onClick={handleClick}
        disabled={loading}
        className="display w-full h-10 flex items-center justify-center rounded-md text-[13px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
        style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
      >
        {loading ? "Redirecting…" : label}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="w-full h-10 flex items-center justify-center rounded-md border text-[13px] transition-colors disabled:opacity-60"
      style={{ borderColor: "var(--border)", color: "var(--t1)" }}
    >
      {loading ? "Redirecting…" : label}
    </button>
  );
}

export function PricingClient() {
  const [billing, setBilling] = useState<"month" | "year">("month");

  const founderPrice = billing === "month" ? String(PRICING.founder.monthly.eur) : String(PRICING.founder.monthly.annual_equivalent);
  const founderSub = billing === "month" ? "/mo" : `/mo · billed annually · €${PRICING.founder.monthly.annual_total}/yr`;
  const founderPriceId = billing === "month" ? PRO_MONTHLY_PRICE_ID : PRO_ANNUAL_PRICE_ID;

  const teamPrice = billing === "month" ? String(PRICING.team.monthly.eur) : String(PRICING.team.monthly.annual_equivalent);
  const teamSub = billing === "month" ? "/mo" : `/mo · billed annually · €${PRICING.team.monthly.annual_total}/yr`;
  const teamPriceId = billing === "month" ? PRO_PLUS_MONTHLY_PRICE_ID : PRO_PLUS_ANNUAL_PRICE_ID;

  const studioPrice = billing === "month" ? String(PRICING.studio.monthly.eur) : String(PRICING.studio.monthly.annual_equivalent);
  const studioSub = billing === "month" ? "/mo" : `/mo · billed annually · €${PRICING.studio.monthly.annual_total}/yr`;
  const studioPriceId = billing === "month" ? AGENCY_MONTHLY_PRICE_ID : AGENCY_ANNUAL_PRICE_ID;

  return (
    <div className="min-h-screen" style={{ background: "var(--canvas)" }}>
      <PreLoginNav />

      {/* Hero */}
      <div className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-300 mx-auto px-4 sm:px-8 py-10 sm:py-16 flex flex-col sm:grid sm:grid-cols-12 sm:gap-8 sm:items-end gap-6">
          <div className="sm:col-span-7">
            <div className="mono text-[10px] uppercase tracking-[0.14em] mb-4" style={{ color: "var(--t3)" }}>
              upgrade
            </div>
            <h1 className="display text-[36px] sm:text-[56px] font-semibold tracking-tight leading-[0.95]" style={{ color: "var(--t1)" }}>
              Free until you&apos;re sure.
              <br />
              <span style={{ color: "var(--t3)" }}>Then validate without limits.</span>
            </h1>
            <p className="mt-6 max-w-130 text-[14px] sm:text-[15px] leading-[1.6]" style={{ color: "var(--t2)" }}>
              Validate ideas with real signals from Reddit, GitHub, HN, Dev.to, and more.{" "}
              <span style={{ color: "var(--t3)" }}>Cancel anytime — really.</span>
            </p>
          </div>
          {/* Billing toggle */}
          <div className="sm:col-span-5 flex sm:justify-end items-center gap-3">
            <span className="mono text-[11px]" style={{ color: billing === "month" ? "var(--t1)" : "var(--t3)" }}>monthly</span>
            <button
              onClick={() => setBilling(billing === "month" ? "year" : "month")}
              className="w-10 h-5 rounded-full border relative"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <span
                className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                style={{ left: billing === "year" ? "calc(100% - 18px)" : "2px", background: "var(--accent)" }}
              />
            </button>
            <span className="mono text-[11px]" style={{ color: billing === "year" ? "var(--t1)" : "var(--t3)" }}>annual</span>
            <span className="mono text-[10px] tnum" style={{ color: "var(--accent)" }}>save ~20%</span>
          </div>
        </div>
      </div>

      <div className="max-w-300 mx-auto px-4 sm:px-8 py-8 sm:py-12">
        {/* Plans — 4 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-4 border rounded-md overflow-hidden" style={{ borderColor: "var(--border)" }}>

          {/* Free */}
          <div className="p-6 border-b sm:border-b-0 sm:border-r flex flex-col" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div className="display text-[18px] font-semibold mb-1" style={{ color: "var(--t1)" }}>Free</div>
            <div className="text-[12px] mb-4" style={{ color: "var(--t3)" }}>kick the tires</div>
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
              {["Competitor Intelligence", "PDF / JSON export"].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="mono text-[11px] mt-0.5 shrink-0" style={{ color: "var(--border)" }}>—</span>
                  <span className="text-[12px]" style={{ color: "var(--t3)" }}>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Founder */}
          <div className="p-6 border-b sm:border-b-0 sm:border-r relative flex flex-col" style={{ borderColor: "var(--border)", background: "var(--canvas)" }}>
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "var(--accent)" }} />
            <div className="flex items-baseline justify-between mb-1">
              <div className="display text-[18px] font-semibold" style={{ color: "var(--t1)" }}>Founder</div>
              <span className="mono text-[10px]" style={{ color: "var(--accent)" }}>● best value</span>
            </div>
            <div className="text-[12px] mb-4" style={{ color: "var(--t3)" }}>solo builder</div>
            <div className="flex items-baseline gap-1">
              <span className="display text-[42px] tnum font-semibold leading-none" style={{ color: "var(--t1)" }}>€{founderPrice}</span>
            </div>
            <div className="mono text-[11px] mb-5" style={{ color: "var(--t3)" }}>{founderSub}</div>
            <div className="mb-5">
              <UpgradeButton priceId={founderPriceId} label="Upgrade to Founder" primary />
              <div className="mono text-[10px] mt-2 text-center" style={{ color: "var(--t3)" }}>cancel anytime · 30-day refund</div>
            </div>
            <ul className="space-y-2 flex-1">
              {([
                { label: "20 validations / month" },
                { label: "All 5 signal sources" },
                { label: "Competitor Intelligence" },
                { label: "PDF + JSON export" },
                { label: "1-year idea history" },
                { label: "5 Otto questions / mo" },
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
            <div className="display text-[18px] font-semibold mb-1" style={{ color: "var(--t1)" }}>Team</div>
            <div className="text-[12px] mb-4" style={{ color: "var(--t3)" }}>unlimited + collaborate</div>
            <div className="flex items-baseline gap-1">
              <span className="display text-[42px] tnum font-semibold leading-none" style={{ color: "var(--t1)" }}>€{teamPrice}</span>
            </div>
            <div className="mono text-[11px] mb-5" style={{ color: "var(--t3)" }}>{teamSub}</div>
            <div className="mb-5">
              <UpgradeButton priceId={teamPriceId} label="Upgrade to Team" />
              <div className="mono text-[10px] mt-2 text-center" style={{ color: "var(--t3)" }}>cancel anytime · 30-day refund</div>
            </div>
            <ul className="space-y-2 flex-1">
              {([
                { label: "Unlimited validations" },
                { label: "All 5 signal sources" },
                { label: "Competitor Intelligence" },
                { label: "PDF + JSON export" },
                { label: "Unlimited idea history" },
                { label: "3 team seats" },
                { label: "15 Otto questions / mo" },
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
            <div className="display text-[18px] font-semibold mb-1" style={{ color: "var(--t1)" }}>Studio</div>
            <div className="text-[12px] mb-4" style={{ color: "var(--t3)" }}>agencies & studios</div>
            <div className="flex items-baseline gap-1">
              <span className="display text-[42px] tnum font-semibold leading-none" style={{ color: "var(--t1)" }}>€{studioPrice}</span>
            </div>
            <div className="mono text-[11px] mb-5" style={{ color: "var(--t3)" }}>{studioSub}</div>
            <div className="mb-5">
              <UpgradeButton priceId={studioPriceId} label="Upgrade to Studio" />
              <div className="mono text-[10px] mt-2 text-center" style={{ color: "var(--t3)" }}>cancel anytime · 30-day refund</div>
            </div>
            <ul className="space-y-2 flex-1">
              {([
                { label: "Unlimited validations" },
                { label: "All sources + custom" },
                { label: "Competitor Intelligence" },
                { label: "White-label reports", soon: true },
                { label: "8 team seats" },
                { label: "50 Otto questions / mo" },
                { label: "Invoice billing (NET30)" },
                { label: "4h dedicated SLA" },
              ] as { label: string; soon?: boolean }[]).map((f) => (
                <li key={f.label} className="flex items-start gap-2">
                  <span className="mono text-[11px] mt-0.5 shrink-0" style={{ color: "var(--t2)" }}>✓</span>
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
            className="mono text-[11px] px-4 h-8 rounded-md border inline-flex items-center shrink-0 transition-colors"
            style={{ borderColor: "var(--border)", color: "var(--t2)" }}
          >
            Enterprise →
          </a>
        </div>

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
                <div className="col-span-3">Feature</div>
                <div className="col-span-2">Free</div>
                <div className="col-span-2" style={{ color: "var(--accent)" }}>Founder</div>
                <div className="col-span-2">Team</div>
                <div className="col-span-3">Studio</div>
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
                      <div className="col-span-3 text-[13px]" style={{ color: "var(--t1)" }}>
                        {r.k}{r.soon && <SoonBadge />}
                      </div>
                      <div className="col-span-2">{renderCell(r.f)}</div>
                      <div className="col-span-2">{renderCell(r.fo, true)}</div>
                      <div className="col-span-2">{renderCell(r.t)}</div>
                      <div className="col-span-3">{renderCell(r.s)}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

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
          className="mt-16 mb-10 flex flex-col sm:flex-row items-start sm:items-center justify-between border-t pt-10 gap-6 sm:gap-0"
          style={{ borderColor: "var(--border)" }}
        >
          <div>
            <div className="display text-[28px] font-semibold tracking-tight" style={{ color: "var(--t1)" }}>
              Ready when you are.
            </div>
            <div className="mono text-[11px] mt-2" style={{ color: "var(--t3)" }}>
              still on Free?{" "}
              <Link href="/dashboard" className="transition-colors" style={{ color: "var(--t1)" }}>
                back to dashboard →
              </Link>
            </div>
          </div>
          <UpgradeButton priceId={founderPriceId} label={`Upgrade to Founder · €${founderPrice}/mo →`} primary />
        </div>
      </div>
      <Footer />
    </div>
  );
}
