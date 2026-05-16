"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PreLoginNav } from "@/components/PreLoginNav";
import { Footer } from "@/components/Footer";

const PRO_MONTHLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID ?? "";
const PRO_ANNUAL_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID ?? "";
const PRO_PLUS_MONTHLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRO_PLUS_MONTHLY_PRICE_ID ?? "";
const PRO_PLUS_ANNUAL_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRO_PLUS_ANNUAL_PRICE_ID ?? "";

const FEATURES = [
  {
    group: "Validation",
    rows: [
      { k: "Validations / month",       f: "1",               p: "20",              pp: "Unlimited",       a: "Unlimited" },
      { k: "Signal sources",            f: "Reddit + GitHub", p: "All 5 sources",   pp: "All 5 sources",   a: "All + custom" },
      { k: "Competitor Intelligence",   f: "—",               p: "✓",               pp: "✓",               a: "✓" },
      { k: "PDF / JSON export",         f: "—",               p: "✓",               pp: "✓",               a: "✓ · white-label" },
    ],
  },
  {
    group: "History",
    rows: [
      { k: "Idea history",              f: "7 days",          p: "1 year",          pp: "Unlimited",       a: "Unlimited" },
    ],
  },
  {
    group: "Team",
    rows: [
      { k: "Seats included",            f: "1",               p: "1",               pp: "3",               a: "Custom" },
      { k: "Early access to features",  f: "—",               p: "—",               pp: "✓",               a: "✓" },
    ],
  },
  {
    group: "Support",
    rows: [
      { k: "Response SLA",              f: "Best effort",     p: "24h",             pp: "24h",             a: "4h dedicated" },
      { k: "White-label reports",       f: "—",               p: "—",               pp: "—",               a: "✓" },
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
    q: "What's the difference between Pro and Pro+?",
    a: "Pro gives you 20 validations/month and all signal sources. Pro+ removes the monthly limit, adds 3 team seats, and gets you early access to every new feature we ship.",
  },
];

function renderCell(val: string, emphasize = false) {
  if (val === "—") return <span style={{ color: "var(--t3)" }}>—</span>;
  if (val === "✓") return <span style={{ color: "var(--validated)" }}>✓</span>;
  return (
    <span
      className={emphasize ? "display tnum text-[13px] font-semibold" : "text-[13px]"}
      style={{ color: emphasize ? "var(--t1)" : "var(--t2)" }}
    >
      {val}
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
        <span className="mono text-[14px] flex-shrink-0" style={{ color: "var(--t3)" }}>
          {open ? "−" : "+"}
        </span>
      </button>
      <div style={{ maxHeight: open ? 400 : 0, overflow: "hidden", transition: "max-height 400ms cubic-bezier(0.16,1,0.3,1)" }}>
        <p className="text-[14px] leading-[1.65] pb-5 max-w-[680px]" style={{ color: "var(--t2)" }}>{a}</p>
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
      const token = document.cookie
        .split("; ")
        .find((c) => c.startsWith("sb-access-token="))
        ?.split("=")[1];

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
        className="display block w-full h-10 flex items-center justify-center rounded-md text-[13px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
        style={{ background: "var(--accent)", color: "#000" }}
      >
        {loading ? "Redirecting…" : label}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="block w-full h-10 flex items-center justify-center rounded-md border text-[13px] transition-colors disabled:opacity-60"
      style={{ borderColor: "var(--border)", color: "var(--t1)" }}
    >
      {loading ? "Redirecting…" : label}
    </button>
  );
}

export function PricingClient() {
  const [billing, setBilling] = useState<"month" | "year">("month");

  const proPrice = billing === "month" ? "39" : "32";
  const proSub = billing === "month" ? "/mo" : "/mo · billed annually · €374/yr";
  const proPriceId = billing === "month" ? PRO_MONTHLY_PRICE_ID : PRO_ANNUAL_PRICE_ID;

  const proPlusPrice = billing === "month" ? "79" : "63";
  const proPlusSub = billing === "month" ? "/mo" : "/mo · billed annually · €758/yr";
  const proPlusPriceId = billing === "month" ? PRO_PLUS_MONTHLY_PRICE_ID : PRO_PLUS_ANNUAL_PRICE_ID;

  return (
    <div className="min-h-screen" style={{ background: "var(--canvas)" }}>
      <PreLoginNav />

      {/* Hero */}
      <div className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-10 sm:py-16 flex flex-col sm:grid sm:grid-cols-12 sm:gap-8 sm:items-end gap-6">
          <div className="sm:col-span-7">
            <div className="mono text-[10px] uppercase tracking-[0.14em] mb-4" style={{ color: "var(--t3)" }}>
              upgrade
            </div>
            <h1 className="display text-[36px] sm:text-[56px] font-semibold tracking-tight leading-[0.95]" style={{ color: "var(--t1)" }}>
              Free until you&apos;re sure.
              <br />
              <span style={{ color: "var(--t3)" }}>Then validate without limits.</span>
            </h1>
            <p className="mt-6 max-w-[520px] text-[14px] sm:text-[15px] leading-[1.6]" style={{ color: "var(--t2)" }}>
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

      <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-8 sm:py-12">
        {/* Plans — 4 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-4 border rounded-md overflow-hidden" style={{ borderColor: "var(--border)" }}>

          {/* Free */}
          <div className="p-6 border-b sm:border-b-0 sm:border-r" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div className="display text-[18px] font-semibold mb-1" style={{ color: "var(--t1)" }}>Free</div>
            <div className="text-[12px] mb-6" style={{ color: "var(--t3)" }}>kick the tires</div>
            <div className="display text-[48px] tnum font-semibold mb-1 leading-none" style={{ color: "var(--t1)" }}>€0</div>
            <div className="mono text-[11px] mb-6" style={{ color: "var(--t3)" }}>forever</div>
            <Link
              href="/login"
              className="block w-full h-10 flex items-center justify-center rounded-md border text-[13px] transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--t1)" }}
            >
              Get started
            </Link>
            <div className="mt-4 mono text-[10px] leading-[1.6]" style={{ color: "var(--t3)" }}>
              1 validation / mo · Reddit + GitHub
            </div>
          </div>

          {/* Pro */}
          <div className="p-6 border-b sm:border-b-0 sm:border-r relative" style={{ borderColor: "var(--border)", background: "var(--canvas)" }}>
            <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "var(--accent)" }} />
            <div className="flex items-baseline justify-between mb-1">
              <div className="display text-[18px] font-semibold" style={{ color: "var(--t1)" }}>Pro</div>
              <span className="mono text-[10px]" style={{ color: "var(--accent)" }}>● recommended</span>
            </div>
            <div className="text-[12px] mb-6" style={{ color: "var(--t3)" }}>for serious founders</div>
            <div className="flex items-baseline gap-1">
              <span className="display text-[48px] tnum font-semibold leading-none" style={{ color: "var(--t1)" }}>€{proPrice}</span>
            </div>
            <div className="mono text-[11px] mb-6" style={{ color: "var(--t3)" }}>{proSub}</div>
            <UpgradeButton priceId={proPriceId} label="Upgrade to Pro" primary />
            <div className="mt-4 mono text-[10px] leading-[1.6]" style={{ color: "var(--t3)" }}>
              cancel anytime · 30-day refund
            </div>
          </div>

          {/* Pro+ */}
          <div className="p-6 border-b sm:border-b-0 sm:border-r" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div className="display text-[18px] font-semibold mb-1" style={{ color: "var(--t1)" }}>Pro+</div>
            <div className="text-[12px] mb-6" style={{ color: "var(--t3)" }}>unlimited everything</div>
            <div className="flex items-baseline gap-1">
              <span className="display text-[48px] tnum font-semibold leading-none" style={{ color: "var(--t1)" }}>€{proPlusPrice}</span>
            </div>
            <div className="mono text-[11px] mb-6" style={{ color: "var(--t3)" }}>{proPlusSub}</div>
            <UpgradeButton priceId={proPlusPriceId} label="Upgrade to Pro+" />
            <div className="mt-4 mono text-[10px] leading-[1.6]" style={{ color: "var(--t3)" }}>
              3 seats · early access · cancel anytime
            </div>
          </div>

          {/* Agency */}
          <div className="p-6" style={{ background: "var(--canvas)" }}>
            <div className="display text-[18px] font-semibold mb-1" style={{ color: "var(--t1)" }}>Agency</div>
            <div className="text-[12px] mb-6" style={{ color: "var(--t3)" }}>vet client briefs</div>
            <div className="display text-[48px] tnum font-semibold mb-1 leading-none" style={{ color: "var(--t1)" }}>—</div>
            <div className="mono text-[11px] mb-6" style={{ color: "var(--t3)" }}>custom pricing</div>
            <a
              href="mailto:hello@pledgeoff.com"
              className="block w-full h-10 flex items-center justify-center rounded-md border text-[13px] transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--t1)" }}
            >
              Contact us
            </a>
            <div className="mt-4 mono text-[10px] leading-[1.6]" style={{ color: "var(--t3)" }}>
              white-label · custom seats · 4h SLA
            </div>
          </div>
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
            <div className="border rounded-md overflow-hidden min-w-[640px] mx-4 sm:mx-0" style={{ borderColor: "var(--border)" }}>
              {/* Column headers */}
              <div
                className="grid grid-cols-12 gap-3 px-6 py-3 mono text-[10px] uppercase tracking-[0.14em] border-b"
                style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--t3)" }}
              >
                <div className="col-span-4">Feature</div>
                <div className="col-span-2">Free</div>
                <div className="col-span-2" style={{ color: "var(--accent)" }}>Pro</div>
                <div className="col-span-2">Pro+</div>
                <div className="col-span-2">Agency</div>
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
                      <div className="col-span-4 text-[13px]" style={{ color: "var(--t1)" }}>{r.k}</div>
                      <div className="col-span-2">{renderCell(r.f)}</div>
                      <div className="col-span-2">{renderCell(r.p, true)}</div>
                      <div className="col-span-2">{renderCell(r.pp)}</div>
                      <div className="col-span-2">{renderCell(r.a)}</div>
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
          <UpgradeButton priceId={proPriceId} label={`Upgrade to Pro · €${proPrice}/mo →`} primary />
        </div>
      </div>
      <Footer />
    </div>
  );
}
