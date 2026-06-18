"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAuthToken } from "@/lib/auth-client";
import { CheckoutModal } from "@/components/CheckoutModal";
import type { Plan, SubscriptionStatus } from "@pledgeoff/core";
import { PLAN_LIMITS } from "@pledgeoff/core";
import { PRICING } from "@/lib/pricing.config";

type AvailablePlan = {
  id: "founder" | "team" | "studio" | "enterprise";
  label: string;
  monthlyEur: number;
  annualEquivalentEur: number;
  annualTotalEur: number;
  monthlyPriceId: string;
  annualPriceId: string;
};

type Props = {
  plan: Plan;
  subscriptionStatus?: SubscriptionStatus | null;
  ideasThisMonth: number;
  renewsAt?: string | null;
  extraSeats?: number;
  cancelAtPeriodEnd?: boolean;
  billingInterval?: "monthly" | "annual";
  availablePlans?: AvailablePlan[];
  currentVatId?: string | null;
  ottoPurchased?: number;
  verificationsPurchased?: number;
  ottoUsedThisMonth?: number;
};

const PLAN_LABELS: Record<Plan, string> = {
  free: "Free",
  founder: "Founder",
  team: "Team",
  studio: "Studio",
  enterprise: "Enterprise",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const VAL_PACKS = [
  { name: "Starter", count: 10, price: 19, per: "€1.90 each" },
  { name: "Builder", count: 25, price: 42, per: "€1.68 each" },
  { name: "Sprint", count: 60, price: 85, per: "€1.42 each" },
  { name: "Scale", count: 100, price: 120, per: "€1.20 each" },
];

const OTTO_PACKS = [
  { name: "Spark", count: 10, price: 15, per: "€1.50 each" },
  { name: "Boost", count: 25, price: 30, per: "€1.20 each" },
  { name: "Fuel", count: 60, price: 60, per: "€1.00 each" },
  { name: "Deep", count: 150, price: 120, per: "€0.80 each" },
];

export function BillingClient({
  plan,
  ideasThisMonth,
  renewsAt,
  extraSeats: initialExtraSeats = 0,
  cancelAtPeriodEnd: initialCancelAtPeriodEnd = false,
  billingInterval = "monthly",
  availablePlans = [],
  currentVatId = null,
  ottoPurchased = 0,
  verificationsPurchased = 0,
  ottoUsedThisMonth = 0,
}: Props) {
  const router = useRouter();
  const isPaid = plan !== "free";

  const ideasLimit = PLAN_LIMITS[plan].verificationsPerMonth;
  const isUnlimited = ideasLimit === Infinity;
  const usagePct = isUnlimited ? 0 : Math.min(1, ideasThisMonth / ideasLimit);

  const ottoLimit = PLAN_LIMITS[plan].ottoQuestionsPerMonth;
  const ottoUnlimited = ottoLimit === Infinity || ottoLimit === 0;
  const ottoPct = ottoUnlimited ? 0 : Math.min(1, ottoUsedThisMonth / ottoLimit);

  const currentPriceId = (() => {
    const ap = availablePlans.find((p) => p.id === plan);
    if (!ap) return "";
    return billingInterval === "annual" ? ap.annualPriceId : ap.monthlyPriceId;
  })();

  const [selectedPriceId, setSelectedPriceId] = useState(currentPriceId);
  const [seatExtra, setSeatExtra] = useState(initialExtraSeats);
  const [seatState, setSeatState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [billingAction, setBillingAction] = useState<"idle" | "loading" | "error">("idle");
  const [invoiceState, setInvoiceState] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(initialCancelAtPeriodEnd);
  const [modifyOpen, setModifyOpen] = useState(false);
  const [checkoutPriceId, setCheckoutPriceId] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [vatId, setVatId] = useState(currentVatId ?? "");
  const [vatState, setVatState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [vatError, setVatError] = useState("");
  const [buyingValPack, setBuyingValPack] = useState<number | null>(null);
  const [buyingOttoPack, setBuyingOttoPack] = useState<number | null>(null);

  const handleChangePlan = async (priceId: string) => {
    setBillingAction("loading");
    const token = await getAuthToken();
    const res = await fetch("/api/v1/billing/change-plan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ priceId }),
    });
    if (res.ok) {
      setBillingAction("idle");
      router.refresh();
    } else {
      setBillingAction("error");
    }
  };

  const handleCancel = async () => {
    setBillingAction("loading");
    setCancelConfirm(false);
    const token = await getAuthToken();
    const res = await fetch("/api/v1/billing/cancel", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      setCancelAtPeriodEnd(true);
      setBillingAction("idle");
    } else {
      setBillingAction("error");
    }
  };

  const handleReactivate = async () => {
    setBillingAction("loading");
    const token = await getAuthToken();
    const res = await fetch("/api/v1/billing/reactivate", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      setCancelAtPeriodEnd(false);
      setBillingAction("idle");
    } else {
      setBillingAction("error");
    }
  };

  const handleCheckout = (priceId: string) => {
    setCheckoutPriceId(priceId);
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    const token = await getAuthToken();
    const res = await fetch("/api/v1/billing/portal", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const json = (await res.json()) as { data: { url: string } };
      window.location.href = json.data.url;
    } else {
      setPortalLoading(false);
    }
  };

  const handleVatSave = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setVatState("loading");
    setVatError("");
    const token = await getAuthToken();
    const res = await fetch("/api/v1/billing/vat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ vatId: vatId.trim() || null }),
    });
    if (res.ok) {
      setVatState("success");
      setTimeout(() => setVatState("idle"), 2500);
    } else {
      const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      setVatError(json.error?.message ?? "Failed to save VAT ID.");
      setVatState("error");
    }
  };

  const handleUpdateSeats = async () => {
    setSeatState("loading");
    const token = await getAuthToken();
    const res = await fetch("/api/v1/billing/seats", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ extraSeats: seatExtra }),
    });
    if (res.ok) {
      setSeatState("success");
      setTimeout(() => setSeatState("idle"), 2500);
    } else {
      setSeatState("error");
    }
  };

  const handleBuyValPack = async (count: number) => {
    setBuyingValPack(count);
    const token = await getAuthToken();
    const res = await fetch("/api/v1/billing/validation-pack", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ validationCount: count }),
    });
    if (res.ok) {
      const json = (await res.json()) as { data: { url: string } };
      window.location.assign(json.data.url);
    } else {
      setBuyingValPack(null);
    }
  };

  const handleBuyOttoPack = async (count: number) => {
    setBuyingOttoPack(count);
    const token = await getAuthToken();
    const res = await fetch("/api/v1/billing/otto-pack", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ questionCount: count }),
    });
    if (res.ok) {
      const json = (await res.json()) as { data: { url: string } };
      window.location.assign(json.data.url);
    } else {
      setBuyingOttoPack(null);
    }
  };

  const now = new Date();
  const monthLabel = now.toLocaleString("en-GB", { month: "short", year: "numeric" });
  const nextMonthLabel = new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleString("en-GB", { month: "short", day: "numeric" });

  return (
    <div>
      {/* Cancel banner */}
      {cancelAtPeriodEnd && renewsAt && (
        <div
          style={{
            border: "1px solid var(--pivot)",
            background: "rgba(139,96,16,0.06)",
            padding: "12px 18px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <span style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: 11, color: "var(--pivot)" }}>
            Cancels on {formatDate(renewsAt)} — you&apos;ll drop to Free.
          </span>
          <button
            className="btn-xs p"
            onClick={handleReactivate}
            disabled={billingAction === "loading"}
          >
            Reactivate
          </button>
        </div>
      )}

      {/* Error banner */}
      {billingAction === "error" && (
        <div
          style={{
            border: "1px solid var(--kill)",
            color: "var(--kill)",
            background: "rgba(158,42,26,0.05)",
            padding: "10px 14px",
            marginBottom: 16,
            fontFamily: "var(--font-chivo-mono), monospace",
            fontSize: 11,
          }}
        >
          Something went wrong. Please try again.
        </div>
      )}

      {/* Current plan */}
      <div className="sec">
        <div className="sec-hd">
          Current plan
          <span className="r">
            <span className={`bdg ${isPaid ? "bdg-go" : "bdg-faint"}`}>{PLAN_LABELS[plan]}</span>
          </span>
        </div>
        <div className="sec-bd">
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, paddingBottom: isPaid ? 16 : 0, borderBottom: isPaid ? "1px solid var(--line-soft)" : "none", marginBottom: isPaid ? 16 : 0 }}>
            <div>
              {isPaid ? (
                <>
                  <div style={{ fontFamily: "var(--font-bitter), Georgia, serif", fontSize: 22, fontWeight: 700, color: "var(--ink)", marginBottom: 3 }}>
                    {PLAN_LABELS[plan]}
                  </div>
                  {renewsAt && !cancelAtPeriodEnd && (
                    <div style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: "8.5px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--faint)" }}>
                      Billed {billingInterval} · renews {formatDate(renewsAt)}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontFamily: "var(--font-bitter), Georgia, serif", fontSize: 16, color: "var(--dim)" }}>
                  Free — 1 validation / month · no credit card required
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {isPaid && !cancelAtPeriodEnd && (
                <>
                  <button
                    className="btn-xs"
                    onClick={handlePortal}
                    disabled={portalLoading}
                  >
                    {portalLoading ? "Opening…" : "Manage billing →"}
                  </button>
                  <button
                    className="btn-xs p"
                    onClick={() => { setModifyOpen((v) => !v); setSelectedPriceId(currentPriceId); }}
                    disabled={billingAction === "loading"}
                  >
                    Change plan
                  </button>
                  {cancelConfirm ? (
                    <>
                      <button className="btn-xs d" onClick={handleCancel} disabled={billingAction === "loading"}>
                        Yes, cancel
                      </button>
                      <button className="btn-xs" onClick={() => setCancelConfirm(false)}>Never mind</button>
                    </>
                  ) : (
                    <button className="btn-xs d" onClick={() => setCancelConfirm(true)}>
                      Cancel
                    </button>
                  )}
                </>
              )}
              {!isPaid && (
                <Link href="/pricing" className="btn-xs p" style={{ padding: "5px 14px" }}>
                  Upgrade →
                </Link>
              )}
            </div>
          </div>

          {/* Billing interval toggle — paid only */}
          {isPaid && !cancelAtPeriodEnd && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <div>
                <div style={{ fontFamily: "var(--font-bitter), Georgia, serif", fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 1 }}>
                  Annual billing
                </div>
                <div style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: "8.5px", letterSpacing: "0.06em", color: "var(--faint)" }}>
                  Save ~20% vs monthly
                </div>
              </div>
              <div className="tog">
                <div className={`tog-t${billingInterval === "annual" ? " on" : ""}`}>
                  <div className="tog-th" />
                </div>
              </div>
            </div>
          )}

          {/* Modify plan panel */}
          {modifyOpen && isPaid && (
            <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid var(--line-soft)" }}>
              <div className="flbl" style={{ marginBottom: 12 }}>Select plan</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                {availablePlans
                  .flatMap((ap) => [
                    { priceId: ap.monthlyPriceId, label: `${ap.label} — Monthly`, price: `€${ap.monthlyEur}/mo` },
                    { priceId: ap.annualPriceId, label: `${ap.label} — Annual`, price: `€${ap.annualEquivalentEur}/mo · €${ap.annualTotalEur}/yr · save ~20%` },
                  ])
                  .map((opt) => {
                    const isSelected = selectedPriceId === opt.priceId;
                    const isCurrent = currentPriceId === opt.priceId;
                    return (
                      <label
                        key={opt.priceId}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "10px 14px",
                          border: `1px solid ${isSelected ? "var(--ink)" : "var(--line)"}`,
                          background: isSelected ? "var(--surface-2)" : "transparent",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="radio"
                          name="plan-select"
                          value={opt.priceId}
                          checked={isSelected}
                          onChange={() => setSelectedPriceId(opt.priceId)}
                        />
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: 14, color: "var(--ink)" }}>{opt.label}</span>
                          {isCurrent && <span className="bdg bdg-go" style={{ marginLeft: 8 }}>Current</span>}
                          <div className="fine" style={{ marginTop: 2 }}>{opt.price}</div>
                        </div>
                      </label>
                    );
                  })}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn-p"
                  onClick={async () => {
                    if (selectedPriceId && selectedPriceId !== currentPriceId) {
                      await handleChangePlan(selectedPriceId);
                      setModifyOpen(false);
                    }
                  }}
                  disabled={billingAction === "loading" || !selectedPriceId || selectedPriceId === currentPriceId}
                >
                  {billingAction === "loading" ? "Applying…" : "Apply changes"}
                </button>
                <button className="btn-xs" onClick={() => setModifyOpen(false)}>Cancel</button>
              </div>
            </div>
          )}

          {/* Free: show plan cards */}
          {!isPaid && availablePlans.length > 0 && (
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {availablePlans.map((ap) => (
                <div key={ap.id} style={{ border: "1px solid var(--line)", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-bitter), Georgia, serif", fontSize: 16, fontWeight: 700, color: "var(--ink)", marginBottom: 2 }}>
                      {ap.label}
                    </div>
                    <div className="fine" style={{ marginTop: 0 }}>
                      €{ap.monthlyEur}/mo · or €{ap.annualEquivalentEur}/mo billed annually (€{ap.annualTotalEur}/yr)
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button className="btn-xs p" onClick={() => handleCheckout(ap.monthlyPriceId)} disabled={!ap.monthlyPriceId}>Monthly →</button>
                    <button className="btn-xs" onClick={() => handleCheckout(ap.annualPriceId)} disabled={!ap.annualPriceId}>Annual →</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Usage this month */}
      <div className="sec">
        <div className="sec-hd">
          Usage this month
          <span className="r">{monthLabel} · resets {nextMonthLabel}</span>
        </div>
        <div className="sec-bd">
          <div className="meter-row">
            <span className="meter-lbl">Validations</span>
            <div className="meter">
              {!isUnlimited && (
                <div
                  className={`mf${usagePct >= 0.85 ? " w" : ""}`}
                  style={{ width: `${usagePct * 100}%` }}
                />
              )}
            </div>
            <span className="meter-val">
              {ideasThisMonth} / {isUnlimited ? "∞" : ideasLimit}
            </span>
          </div>

          {ottoLimit > 0 && (
            <div className="meter-row">
              <span className="meter-lbl">Otto questions</span>
              <div className="meter">
                {!ottoUnlimited && (
                  <div
                    className={`mf${ottoPct >= 0.85 ? " w" : ""}`}
                    style={{ width: `${ottoPct * 100}%` }}
                  />
                )}
              </div>
              <span className="meter-val">
                {ottoUsedThisMonth} / {ottoUnlimited ? "∞" : ottoLimit}
              </span>
            </div>
          )}

          <div style={{ display: "flex", gap: 32, flexWrap: "wrap", marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line-soft)" }}>
            <div>
              <div style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: 8, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--faint)", marginBottom: 3 }}>
                Validation pack balance
              </div>
              <div style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: 15, fontWeight: 600, color: verificationsPurchased > 0 ? "var(--ink)" : "var(--faint)" }}>
                {verificationsPurchased} remaining
              </div>
            </div>
            {ottoLimit > 0 && (
              <div>
                <div style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: 8, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--faint)", marginBottom: 3 }}>
                  Otto pack balance
                </div>
                <div style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: 15, fontWeight: 600, color: ottoPurchased > 0 ? "var(--ink)" : "var(--kill)" }}>
                  {ottoPurchased > 0 ? `${ottoPurchased} remaining` : "0 remaining"}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Validation Packs — Founder+ */}
      {isPaid && (
        <div className="sec">
          <div className="sec-hd">
            Validation Packs
            <span className="r">Never expire · Founder+</span>
          </div>
          <div className="sec-bd">
            <p style={{ fontSize: 13, color: "var(--dim)", marginBottom: 0 }}>
              Top up your balance. Packs stack with monthly included validations and carry forward indefinitely.
            </p>
            <div className="pack-grid">
              {VAL_PACKS.map((p) => (
                <div key={p.count} className="pack-c">
                  <div className="pack-nm">{p.name}</div>
                  <div className="pack-q">{p.count} validations</div>
                  <div className="pack-pr">€{p.price}</div>
                  <div className="pack-per">{p.per}</div>
                  <button
                    className="btn-xs p"
                    onClick={() => handleBuyValPack(p.count)}
                    disabled={buyingValPack !== null}
                  >
                    {buyingValPack === p.count ? "…" : "Buy"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Otto Packs — Founder+ with Otto enabled */}
      {isPaid && PLAN_LIMITS[plan].ottoQuestionsPerMonth > 0 && (
        <div className="sec">
          <div className="sec-hd">
            Otto Packs
            <span className="r">Never expire · Founder+</span>
          </div>
          <div className="sec-bd">
            <p style={{ fontSize: 13, color: "var(--dim)", marginBottom: 0 }}>
              Add questions to Otto. Your balance hits zero at month end — packs cover the gap.
            </p>
            <div className="pack-grid">
              {OTTO_PACKS.map((p) => (
                <div key={p.count} className="pack-c">
                  <div className="pack-nm">{p.name}</div>
                  <div className="pack-q">{p.count} questions</div>
                  <div className="pack-pr">€{p.price}</div>
                  <div className="pack-per">{p.per}</div>
                  <button
                    className="btn-xs p"
                    onClick={() => handleBuyOttoPack(p.count)}
                    disabled={buyingOttoPack !== null}
                  >
                    {buyingOttoPack === p.count ? "…" : "Buy"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Billing details — VAT */}
      <div className="sec">
        <div className="sec-hd">Billing details</div>
        <div className="sec-bd">
          <div className="fg">
            <label className="flbl" htmlFor="b-vat">
              VAT number <span style={{ color: "var(--faint)" }}>(optional)</span>
            </label>
            <form onSubmit={handleVatSave} className="finp-row">
              <input
                id="b-vat"
                className="finp"
                type="text"
                value={vatId}
                onChange={(e) => { setVatId(e.target.value.toUpperCase()); if (vatState === "error") setVatState("idle"); }}
                placeholder="e.g. DE123456789"
                maxLength={20}
                disabled={vatState === "loading"}
                style={{ flex: 1, borderColor: vatState === "error" ? "rgba(158,42,26,0.4)" : undefined }}
              />
              <button
                type="submit"
                className="btn-xs p"
                style={{ padding: "10px 14px" }}
                disabled={vatState === "loading"}
              >
                {vatState === "loading" ? "…" : vatState === "success" ? "Saved ✓" : "Save"}
              </button>
            </form>
            {vatState === "error" && vatError && (
              <p className="fine" style={{ color: "var(--kill)" }}>{vatError}</p>
            )}
            <p className="fine">EU businesses: adds reverse charge to future invoices. Leave blank to remove.</p>
          </div>

          {/* NET30 — Studio/Enterprise */}
          {(plan === "studio" || plan === "enterprise") ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginTop: 18, paddingTop: 18, borderTop: "1px solid var(--line-soft)" }}>
              <div>
                <div style={{ fontFamily: "var(--font-bitter), Georgia, serif", fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 1 }}>NET30 invoicing</div>
                <div className="fine" style={{ marginTop: 0 }}>Pay invoices 30 days after issue date</div>
              </div>
              <button
                className="btn-xs p"
                onClick={async () => {
                  if (invoiceState === "sent") return;
                  setInvoiceState("loading");
                  const token = await getAuthToken();
                  const res = await fetch("/api/v1/billing/request-invoice", {
                    method: "POST",
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                  });
                  setInvoiceState(res.ok ? "sent" : "error");
                }}
                disabled={invoiceState === "loading" || invoiceState === "sent"}
              >
                {invoiceState === "loading" ? "Sending…" : invoiceState === "sent" ? "Request sent ✓" : "Request NET30 →"}
              </button>
            </div>
          ) : (
            <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid var(--line-soft)" }}>
              <div style={{ opacity: 0.5 }}>
                <div style={{ fontFamily: "var(--font-bitter), Georgia, serif", fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 1 }}>NET30 invoicing</div>
                <div className="fine" style={{ marginTop: 0 }}>Pay invoices 30 days after issue date</div>
              </div>
              <div className="plan-gate" style={{ marginTop: 10 }}>
                <span className="pg-tag">Studio+</span>
                <div>
                  <div className="pg-ttl">Requires Studio or Enterprise</div>
                  <p className="pg-desc">NET30 invoicing is available on Studio (€349/mo) and Enterprise plans.</p>
                  <Link href="/pricing" className="btn-xs p">Upgrade to Studio</Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Extra seats — Team and Studio */}
      {(plan === "team" || plan === "studio") && (() => {
        const baseSeats = plan === "team" ? 3 : 8;
        const seatPrice = PRICING.seats.extraEurPerMonth;
        return (
          <div className="sec">
            <div className="sec-hd">
              Extra seats
              <span className="r">€{seatPrice} / seat / month</span>
            </div>
            <div className="sec-bd">
              <p style={{ fontSize: 13, color: "var(--dim)", marginBottom: 14 }}>
                {PLAN_LABELS[plan]} includes {baseSeats} seats. Add more at €{seatPrice}/seat/month, pro-rated and billed with your next invoice.
              </p>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                <div style={{ width: 100 }}>
                  <label className="flbl" htmlFor="t-seats">Add seats</label>
                  <input
                    id="t-seats"
                    className="finp"
                    type="number"
                    value={seatExtra}
                    onChange={(e) => setSeatExtra(Math.max(0, Math.min(97, parseInt(e.target.value) || 0)))}
                    min={0}
                    max={50}
                  />
                </div>
                <button
                  className="btn-xs p"
                  style={{ padding: "10px 14px" }}
                  onClick={handleUpdateSeats}
                  disabled={seatState === "loading" || seatExtra === initialExtraSeats}
                >
                  {seatState === "loading" ? "Updating…" : seatState === "success" ? "Updated ✓" : seatExtra > 0 ? `Add — €${seatExtra * seatPrice}/mo` : "Update seats"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {checkoutPriceId && (
        <CheckoutModal
          priceId={checkoutPriceId}
          isOpen={true}
          onClose={() => setCheckoutPriceId(null)}
        />
      )}
    </div>
  );
}
