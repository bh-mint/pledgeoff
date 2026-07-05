'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { CheckoutModal } from '@/components/CheckoutModal';
import { getAuthToken } from '@/lib/auth-client';
import { PRICING } from '@/lib/pricing.config';

type PlanKey = 'founder' | 'team' | 'studio';
type Billing  = 'monthly' | 'annual';

type PlanModalParams = { planKey: PlanKey; planLabel: string; toolLabel: string };
type UpgradeModalCtx = {
  openPlanModal:  (p: PlanModalParams) => void;
  openQuotaModal: () => void;
};

const Ctx = createContext<UpgradeModalCtx | null>(null);

export function useUpgradeModal(): UpgradeModalCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useUpgradeModal must be inside UpgradeModalProvider');
  return ctx;
}

// ── Price IDs (NEXT_PUBLIC – inlined at build time) ─────────────────────────
const PRICE_IDS: Record<PlanKey, { monthly: string; annual: string }> = {
  founder: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_FOUNDER_MONTHLY_PRICE_ID ?? '',
    annual:  process.env.NEXT_PUBLIC_STRIPE_FOUNDER_ANNUAL_PRICE_ID  ?? '',
  },
  team: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_PRICE_ID ?? '',
    annual:  process.env.NEXT_PUBLIC_STRIPE_TEAM_ANNUAL_PRICE_ID  ?? '',
  },
  studio: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_STUDIO_MONTHLY_PRICE_ID ?? '',
    annual:  process.env.NEXT_PUBLIC_STRIPE_STUDIO_ANNUAL_PRICE_ID  ?? '',
  },
};

// ── Static plan data ──────────────────────────────────────────────────────────
const PLAN_DATA: Record<PlanKey, {
  monthly: number; annual: number; annualTotal: number; saveEur: number;
  tag: string;
  features: { txt: string; note?: string }[];
}> = {
  founder: {
    monthly: 49, annual: 39, annualTotal: 468, saveEur: 120,
    tag: '20 validations / cycle · cancel anytime',
    features: [
      { txt: '5 intelligence tools', note: 'ICP, Competitive, Revenue, Build Spec, Page Brief' },
      { txt: '20 validations per cycle', note: 'survey freely, not just once' },
      { txt: 'Otto Q&A', note: '15 questions per month' },
      { txt: 'Export verdict boards to PDF' },
    ],
  },
  team: {
    monthly: 99, annual: 79, annualTotal: 948, saveEur: 240,
    tag: '60 validations / cycle · up to 5 seats',
    features: [
      { txt: 'All 11 tools including GTM Brief', note: 'full launch playbook' },
      { txt: '60 validations per cycle', note: 'built for active teams' },
      { txt: 'Otto Q&A', note: '45 questions per month' },
      { txt: 'Up to 5 seats with shared team feed' },
    ],
  },
  studio: {
    monthly: 349, annual: 279, annualTotal: 3348, saveEur: 840,
    tag: '100 validations / cycle · up to 10 seats',
    features: [
      { txt: 'All 11 tools + white-label PDF reports' },
      { txt: '100 validations per cycle' },
      { txt: 'Otto Q&A', note: '120 questions per month' },
      { txt: 'Up to 10 seats + API access' },
    ],
  },
};

const PACKS = PRICING.validationPacks.packs;
const DEFAULT_PACK = PACKS[2].count; // Sprint (60) — best mainstream value

// ── Provider ──────────────────────────────────────────────────────────────────
export function UpgradeModalProvider({ children }: { children: React.ReactNode }) {
  const [variant, setVariant]     = useState<'plan' | 'quota' | null>(null);
  const [planKey, setPlanKey]     = useState<PlanKey>('founder');
  const [planLabel, setPlanLabel] = useState('Founder');
  const [toolLabel, setToolLabel] = useState('');
  const [billing, setBilling]     = useState<Billing>('monthly');
  const [selPack, setSelPack]     = useState<number>(DEFAULT_PACK);
  const [buying, setBuying]       = useState(false);
  const [checkoutId, setCheckoutId] = useState<string | null>(null);

  const isOpen = variant !== null;

  const openPlanModal = useCallback((p: PlanModalParams) => {
    setPlanKey(p.planKey);
    setPlanLabel(p.planLabel);
    setToolLabel(p.toolLabel);
    setBilling('monthly');
    setVariant('plan');
  }, []);

  const openQuotaModal = useCallback(() => {
    setSelPack(DEFAULT_PACK);
    setVariant('quota');
  }, []);

  const close = useCallback(() => setVariant(null), []);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, close]);

  function handleUpgrade() {
    const priceId = PRICE_IDS[planKey][billing];
    setVariant(null);
    setCheckoutId(priceId);
  }

  async function handleBuyPack() {
    setBuying(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/v1/billing/validation-pack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ validationCount: selPack }),
      });
      if (res.ok) {
        const json = (await res.json()) as { data: { url: string } };
        window.location.assign(json.data.url);
      }
    } finally {
      setBuying(false);
    }
  }

  const pd    = PLAN_DATA[planKey];
  const price = billing === 'monthly' ? pd.monthly : pd.annual;

  return (
    <Ctx.Provider value={{ openPlanModal, openQuotaModal }}>
      {children}

      {isOpen && (
        <div
          className="upg-scrim"
          onMouseDown={e => { if (e.target === e.currentTarget) close(); }}
        >
          <div className="upg-modal" role="dialog" aria-modal="true" aria-labelledby="upg-title">

            {/* ── VARIANT A: Plan lock ─────────────────────────────── */}
            {variant === 'plan' && (
              <>
                <div className="upg-hd">
                  <span>Plan gate</span>
                  <span className="upg-hd-r">
                    <span className="upg-hd-hr">Authorize access</span>
                    <button className="upg-close" onClick={close} aria-label="Close">✕</button>
                  </span>
                </div>
                <div className="upg-body">
                  <div className="upg-eyebrow">
                    <span className="upg-eyebrow-gl">▲</span>
                    Locked · {toolLabel || planLabel}
                    <span className="upg-eyebrow-meta"> · Requires {planLabel}</span>
                  </div>
                  <h2 className="upg-title" id="upg-title">
                    This instrument needs {planLabel}.
                  </h2>
                  <p className="upg-lede">
                    <em>{toolLabel || 'This tool'}</em> is bundled with every {planLabel} intelligence
                    instrument — the full decision toolkit, not a single tool.
                    Upgrade once, unlock everything.
                  </p>

                  <div className="upg-rule" />

                  <div className="upg-plan-row">
                    <div className="upg-plan-id">
                      <div className="upg-plan-name">
                        {planLabel}
                        <span className="upg-plan-badge">Unlocks all tools</span>
                      </div>
                      <div className="upg-plan-tag">{pd.tag}</div>
                    </div>
                    <div className="upg-price">
                      <div className="upg-price-amt">€{price}</div>
                      <div className="upg-price-per">per month</div>
                      <div className="upg-price-bill">
                        {billing === 'annual'
                          ? `billed €${pd.annualTotal} yearly · save €${pd.saveEur}`
                          : ' '}
                      </div>
                    </div>
                  </div>

                  <div className="upg-billing">
                    <button
                      className={`upg-bill-opt${billing === 'monthly' ? ' on' : ''}`}
                      onClick={() => setBilling('monthly')}
                    >Monthly</button>
                    <button
                      className={`upg-bill-opt${billing === 'annual' ? ' on' : ''}`}
                      onClick={() => setBilling('annual')}
                    >Annual <span className="upg-bill-save">−20%</span></button>
                  </div>

                  <div className="upg-feat-lbl">What {planLabel} puts in your hands</div>
                  <ul className="upg-feats">
                    {pd.features.map((f, i) => (
                      <li key={i} className="upg-feat">
                        <span className="upg-feat-tick">✓</span>
                        <span className="upg-feat-txt">
                          {f.txt}
                          {f.note && <span className="upg-feat-note"> — {f.note}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="upg-acts">
                    <button className="btn-p" onClick={handleUpgrade}>
                      Upgrade to {planLabel}
                      <span className="upg-stripe"> → Stripe</span>
                    </button>
                    <div className="upg-act2">
                      <button className="upg-ghost" onClick={close}>Maybe later</button>
                      <span className="upg-assure">No charge today · cancel in two clicks</span>
                    </div>
                  </div>

                  <div className="upg-alt">
                    Just out of validations?{' '}
                    <button
                      className="upg-alt-a"
                      onClick={() => { setSelPack(DEFAULT_PACK); setVariant('quota'); }}
                    >Top up without upgrading →</button>
                  </div>
                </div>
              </>
            )}

            {/* ── VARIANT B: Quota gate ─────────────────────────────── */}
            {variant === 'quota' && (
              <>
                <div className="upg-hd">
                  <span>Quota gate</span>
                  <span className="upg-hd-r">
                    <span className="upg-hd-hr">Active plan</span>
                    <button className="upg-close" onClick={close} aria-label="Close">✕</button>
                  </span>
                </div>
                <div className="upg-body">
                  <div className="upg-eyebrow">
                    <span className="upg-eyebrow-gl">○</span>
                    Quota spent · validations
                  </div>
                  <h2 className="upg-title" id="upg-title">
                    You&apos;ve used all your validations this cycle.
                  </h2>
                  <p className="upg-lede">
                    Your plan is fine — the meter just hit zero. It refills next month.
                    If you can&apos;t wait, drop in a validation pack; it stacks on top
                    without touching your subscription.
                  </p>

                  <div className="upg-rule" />

                  <div className="upg-feat-lbl">Validation packs · one-time top-up</div>
                  <div className="upg-packs">
                    <div className="upg-packs-hd">
                      <span>Pack</span><span>Price</span>
                    </div>
                    {PACKS.map(pack => {
                      const unitCost = (pack.eur / pack.count).toFixed(2);
                      return (
                        <div
                          key={pack.count}
                          className={`upg-pack${selPack === pack.count ? ' sel' : ''}`}
                          onClick={() => setSelPack(pack.count)}
                          role="radio"
                          aria-checked={selPack === pack.count}
                          tabIndex={0}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setSelPack(pack.count); }}
                        >
                          <div className="upg-pack-l">
                            <div className="upg-pack-radio" aria-hidden="true" />
                            <div>
                              <div className="upg-pack-qty">
                                {pack.count} validations
                                {pack.label === 'Scale' && <span className="upg-pack-best">Best rate</span>}
                              </div>
                              <div className="upg-pack-note">never expire · roll into next cycle</div>
                            </div>
                          </div>
                          <div>
                            <div className="upg-pack-price">€{pack.eur}</div>
                            <div className="upg-pack-unit">€{unitCost} each</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="upg-acts">
                    <button className="btn-p" onClick={handleBuyPack} disabled={buying}>
                      {buying
                        ? 'Redirecting…'
                        : <>{`Add ${selPack} validations`}<span className="upg-stripe"> → Stripe</span></>
                      }
                    </button>
                    <div className="upg-act2">
                      <button className="upg-ghost" onClick={close}>Wait for refill</button>
                      <span className="upg-assure">Packs apply instantly · no subscription changes</span>
                    </div>
                  </div>

                  <div className="upg-alt">
                    Need more headroom long-term?{' '}
                    <button
                      className="upg-alt-a"
                      onClick={() => {
                        setPlanKey('founder');
                        setPlanLabel('Founder');
                        setToolLabel('');
                        setBilling('monthly');
                        setVariant('plan');
                      }}
                    >Compare higher plans →</button>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {checkoutId && (
        <CheckoutModal
          priceId={checkoutId}
          isOpen={true}
          onClose={() => setCheckoutId(null)}
        />
      )}
    </Ctx.Provider>
  );
}
