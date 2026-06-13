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

export function BillingClient({
  plan,
  ideasThisMonth,
  renewsAt,
  extraSeats: initialExtraSeats = 0,
  cancelAtPeriodEnd: initialCancelAtPeriodEnd = false,
  billingInterval = "monthly",
  availablePlans = [],
  currentVatId = null,
}: Props) {
  const router = useRouter();
  const isPaid = plan !== "free";

  const ideasLimit = PLAN_LIMITS[plan].verificationsPerMonth;
  const isUnlimited = ideasLimit === Infinity;
  const usagePct = isUnlimited ? 0 : Math.min(1, ideasThisMonth / ideasLimit);

  const currentPriceId = (() => {
    const ap = availablePlans.find((p) => p.id === plan);
    if (!ap) return "";
    return billingInterval === "annual" ? ap.annualPriceId : ap.monthlyPriceId;
  })();

  const [selectedPriceId, setSelectedPriceId] = useState(currentPriceId);
  const [seatExtra, setSeatExtra] = useState(initialExtraSeats);
  const [seatState, setSeatState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [billingAction, setBillingAction] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [invoiceState, setInvoiceState] = useState<
    "idle" | "loading" | "sent" | "error"
  >("idle");
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(
    initialCancelAtPeriodEnd,
  );
  const [modifyOpen, setModifyOpen] = useState(false);
  const [checkoutPriceId, setCheckoutPriceId] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [vatId, setVatId] = useState(currentVatId ?? "");
  const [vatState, setVatState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [vatError, setVatError] = useState("");

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

  const handleVatSave = async (e: React.FormEvent<HTMLFormElement>) => {
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

  return (
    <div>
      <h1 className="display text-[28px] font-semibold tracking-tight text-(--t1) mb-1">
        Billing
      </h1>
      <p className="text-[13px] mb-8" style={{ color: "var(--t2)" }}>
        {isPaid
          ? `${PLAN_LABELS[plan]} · billed ${billingInterval}`
          : "Free plan · no credit card required"}
      </p>

      {/* Cancel-at-period-end banner */}
      {cancelAtPeriodEnd && renewsAt && (
        <div
          className="border rounded-md p-4 mb-5 flex items-center justify-between gap-4"
          style={{
            borderColor: "var(--caution)",
            background:
              "color-mix(in srgb, var(--caution) 8%, transparent)",
          }}
        >
          <span className="mono text-[11px]" style={{ color: "var(--caution)" }}>
            Cancels on {formatDate(renewsAt)} — you&apos;ll drop to Free.
          </span>
          <button
            onClick={handleReactivate}
            disabled={billingAction === "loading"}
            className="mono text-[11px] h-8 px-4 rounded-md transition-opacity hover:opacity-80 disabled:opacity-50 shrink-0"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            Reactivate
          </button>
        </div>
      )}

      {/* Error banner */}
      {billingAction === "error" && (
        <div
          className="border rounded-md p-3 mb-5 mono text-[11px]"
          style={{
            borderColor: "var(--kill)",
            color: "var(--kill)",
            background: "color-mix(in srgb, var(--kill) 8%, transparent)",
          }}
        >
          Something went wrong. Please try again.
        </div>
      )}

      {/* Current plan card */}
      <div
        className="border rounded-md p-5 mb-3"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div
              className="mono text-[10px] uppercase tracking-[0.12em] mb-1"
              style={{ color: "var(--t3)" }}
            >
              Current plan
            </div>
            <div className="display text-[22px] font-semibold text-(--t1)">
              {PLAN_LABELS[plan]}
            </div>
            {isPaid && renewsAt && !cancelAtPeriodEnd && (
              <div
                className="mono text-[10px] mt-1"
                style={{ color: "var(--t3)" }}
              >
                Billed {billingInterval} · renews {formatDate(renewsAt)}
              </div>
            )}
            {!isPaid && (
              <div
                className="mono text-[10px] mt-1"
                style={{ color: "var(--t3)" }}
              >
                1 validation / month · no credit card required
              </div>
            )}
          </div>

          {isPaid && !cancelAtPeriodEnd && (
            <div className="flex gap-2 shrink-0 flex-wrap">
              <button
                onClick={handlePortal}
                disabled={portalLoading}
                className="mono text-[11px] h-9 px-4 rounded-md border transition-colors hover:border-[var(--accent)] disabled:opacity-50"
                style={{ borderColor: "var(--border)", color: "var(--t2)" }}
              >
                {portalLoading ? "Opening…" : "Manage billing →"}
              </button>
              <button
                onClick={() => {
                  setModifyOpen((v) => !v);
                  setSelectedPriceId(currentPriceId);
                }}
                disabled={billingAction === "loading"}
                className="mono text-[11px] h-9 px-4 rounded-md border transition-colors hover:border-[var(--accent)] disabled:opacity-50"
                style={{ borderColor: "var(--border)", color: "var(--t2)" }}
              >
                Modify plan
              </button>
              {cancelConfirm ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancel}
                    disabled={billingAction === "loading"}
                    className="mono text-[11px] h-9 px-4 rounded-md disabled:opacity-50"
                    style={{ background: "var(--kill)", color: "#fff" }}
                  >
                    Yes, cancel
                  </button>
                  <button
                    onClick={() => setCancelConfirm(false)}
                    className="mono text-[11px] h-9 px-3 rounded-md border"
                    style={{
                      borderColor: "var(--border)",
                      color: "var(--t3)",
                    }}
                  >
                    Never mind
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setCancelConfirm(true)}
                  className="mono text-[11px] h-9 px-4 rounded-md border transition-colors hover:border-[var(--kill)] hover:text-[var(--kill)]"
                  style={{ borderColor: "var(--border)", color: "var(--t3)" }}
                >
                  Cancel
                </button>
              )}
            </div>
          )}

          {!isPaid && (
            <Link
              href="/pricing"
              className="display text-[13px] font-semibold px-5 h-9 rounded-md inline-flex items-center transition-opacity hover:opacity-90 shrink-0"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              Upgrade →
            </Link>
          )}
        </div>

        {/* Modify panel */}
        {modifyOpen && isPaid && (
          <div
            className="mt-5 pt-5 border-t"
            style={{ borderColor: "var(--border)" }}
          >
            <div
              className="mono text-[10px] uppercase tracking-[0.12em] mb-3"
              style={{ color: "var(--t3)" }}
            >
              Select plan
            </div>
            <div className="flex flex-col gap-2 mb-4">
              {availablePlans
                .flatMap((ap) => [
                  {
                    priceId: ap.monthlyPriceId,
                    label: `${ap.label} — Monthly`,
                    price: `€${ap.monthlyEur}/mo`,
                  },
                  {
                    priceId: ap.annualPriceId,
                    label: `${ap.label} — Annual`,
                    price: `€${ap.annualEquivalentEur}/mo · €${ap.annualTotalEur}/yr · save ~20%`,
                  },
                ])
                .map((opt) => {
                  const isSelected = selectedPriceId === opt.priceId;
                  const isCurrent = currentPriceId === opt.priceId;
                  return (
                    <label
                      key={opt.priceId}
                      className="flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors"
                      style={{
                        borderColor: isSelected
                          ? "var(--accent)"
                          : "var(--border)",
                        background: isSelected
                          ? "color-mix(in srgb, var(--accent) 6%, transparent)"
                          : "transparent",
                      }}
                    >
                      <input
                        type="radio"
                        name="plan-select"
                        value={opt.priceId}
                        checked={isSelected}
                        onChange={() => setSelectedPriceId(opt.priceId)}
                        className="accent-[var(--accent)]"
                      />
                      <div className="flex-1">
                        <span className="text-[13px] text-(--t1)">
                          {opt.label}
                        </span>
                        {isCurrent && (
                          <span
                            className="mono text-[9px] ml-2 px-1.5 py-0.5 rounded"
                            style={{
                              background: "var(--accent)",
                              color: "var(--accent-fg)",
                            }}
                          >
                            current
                          </span>
                        )}
                        <div
                          className="mono text-[10px] mt-0.5"
                          style={{ color: "var(--t3)" }}
                        >
                          {opt.price}
                        </div>
                      </div>
                    </label>
                  );
                })}
            </div>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (selectedPriceId && selectedPriceId !== currentPriceId) {
                    await handleChangePlan(selectedPriceId);
                    setModifyOpen(false);
                  }
                }}
                disabled={
                  billingAction === "loading" ||
                  !selectedPriceId ||
                  selectedPriceId === currentPriceId
                }
                className="mono text-[11px] h-9 px-5 rounded-md transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
              >
                {billingAction === "loading" ? "Applying…" : "Apply changes"}
              </button>
              <button
                onClick={() => setModifyOpen(false)}
                className="mono text-[11px] h-9 px-4 rounded-md border"
                style={{ borderColor: "var(--border)", color: "var(--t3)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Free users: plan option cards */}
      {!isPaid && (
        <div className="flex flex-col gap-3 mb-3">
          {availablePlans.map((ap) => (
            <div
              key={ap.id}
              className="border rounded-md p-5"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface)",
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="display text-[17px] font-semibold text-(--t1) mb-0.5">
                    {ap.label}
                  </div>
                  <div
                    className="mono text-[11px]"
                    style={{ color: "var(--t2)" }}
                  >
                    €{ap.monthlyEur}/mo · or €{ap.annualEquivalentEur}/mo
                    billed annually (€{ap.annualTotalEur}/yr)
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleCheckout(ap.monthlyPriceId)}
                    disabled={
                      billingAction === "loading" || !ap.monthlyPriceId
                    }
                    className="mono text-[11px] h-8 px-4 rounded-md transition-opacity hover:opacity-80 disabled:opacity-50"
                    style={{
                      background: "var(--accent)",
                      color: "var(--accent-fg)",
                    }}
                  >
                    Monthly →
                  </button>
                  <button
                    onClick={() => handleCheckout(ap.annualPriceId)}
                    disabled={
                      billingAction === "loading" || !ap.annualPriceId
                    }
                    className="mono text-[11px] h-8 px-4 rounded-md border transition-colors hover:border-[var(--accent)] disabled:opacity-50"
                    style={{
                      borderColor: "var(--border)",
                      color: "var(--t2)",
                    }}
                  >
                    Annual →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Usage */}
      <div
        className="border rounded-md p-5 mb-5"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div
          className="mono text-[10px] uppercase tracking-[0.12em] mb-4"
          style={{ color: "var(--t3)" }}
        >
          Usage this month
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] text-(--t2)">Validations</span>
          <span className="mono text-[11px] tnum text-(--t1)">
            {ideasThisMonth} / {isUnlimited ? "∞" : ideasLimit}
          </span>
        </div>
        {!isUnlimited && (
          <div
            className="h-1.5 rounded-full"
            style={{ background: "var(--border)" }}
          >
            <div
              className="h-1.5 rounded-full transition-all"
              style={{
                width: `${usagePct * 100}%`,
                background:
                  usagePct >= 0.9
                    ? "var(--kill)"
                    : usagePct >= 0.6
                      ? "var(--caution)"
                      : "var(--accent)",
              }}
            />
          </div>
        )}
      </div>

      {/* Invoice billing — Studio only */}
      {(plan === "studio" || plan === "enterprise") && (
        <div
          className="border rounded-md p-5 mb-3"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <div
            className="mono text-[10px] uppercase tracking-[0.12em] mb-1"
            style={{ color: "var(--t3)" }}
          >
            Invoice billing
          </div>
          <p className="text-[12px] mb-5" style={{ color: "var(--t2)" }}>
            Need to pay by invoice with NET30 terms? Send us a request and
            we&apos;ll set it up within 24h.
          </p>
          <div className="flex items-center justify-between">
            <div className="mono text-[11px]" style={{ color: "var(--t3)" }}>
              {invoiceState === "sent" && (
                <span style={{ color: "var(--validated)" }}>
                  Request received — we&apos;ll reach out within 24h.
                </span>
              )}
              {invoiceState === "error" && (
                <span style={{ color: "var(--kill)" }}>
                  Something went wrong. Try again.
                </span>
              )}
            </div>
            <button
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
              disabled={
                invoiceState === "loading" || invoiceState === "sent"
              }
              className="mono text-[11px] h-9 px-5 rounded-md border transition-colors disabled:opacity-50 shrink-0"
              style={{
                borderColor:
                  invoiceState === "sent" ? "var(--validated)" : "var(--border)",
                color:
                  invoiceState === "sent" ? "var(--validated)" : "var(--t2)",
              }}
            >
              {invoiceState === "loading"
                ? "Sending…"
                : invoiceState === "sent"
                  ? "Request sent ✓"
                  : "Request Invoice (NET30)"}
            </button>
          </div>
        </div>
      )}

      {/* Seat add-ons — Team and Studio */}
      {(plan === "team" || plan === "studio") && (() => {
        const baseSeats = plan === "team" ? 3 : 8;
        const seatPrice = PRICING.seats.extraEurPerMonth;
        return (
        <div
          className="border rounded-md p-5"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <div
            className="mono text-[10px] uppercase tracking-[0.12em] mb-1"
            style={{ color: "var(--t3)" }}
          >
            {plan === "team" ? "Team" : "Studio"} seats
          </div>
          <p className="text-[12px] mb-5" style={{ color: "var(--t2)" }}>
            {plan === "team" ? "Team" : "Studio"} includes {baseSeats} seats. Add extra seats at €{seatPrice}/seat/month, billed to
            your subscription.
          </p>

          <div className="flex flex-col sm:flex-row sm:items-center gap-6 mb-5">
            <div className="flex-1 flex items-center gap-3">
              <div className="text-center">
                <div className="mono text-[22px] font-semibold text-(--t1)">
                  {baseSeats + seatExtra}
                </div>
                <div
                  className="mono text-[9px] uppercase tracking-[0.12em] mt-0.5"
                  style={{ color: "var(--t3)" }}
                >
                  total seats
                </div>
              </div>
              <div className="text-(--t3) text-[18px]">=</div>
              <div className="text-center">
                <div className="mono text-[16px] text-(--t2)">{baseSeats}</div>
                <div
                  className="mono text-[9px] uppercase tracking-[0.12em] mt-0.5"
                  style={{ color: "var(--t3)" }}
                >
                  included
                </div>
              </div>
              <div className="text-(--t3)">+</div>
              <div className="text-center">
                <div
                  className="mono text-[16px]"
                  style={{ color: "var(--accent)" }}
                >
                  {seatExtra}
                </div>
                <div
                  className="mono text-[9px] uppercase tracking-[0.12em] mt-0.5"
                  style={{ color: "var(--t3)" }}
                >
                  extra
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSeatExtra((n) => Math.max(0, n - 1))}
                disabled={seatExtra === 0}
                className="w-10 h-10 rounded-md border mono text-[16px] flex items-center justify-center transition-colors disabled:opacity-30"
                style={{ borderColor: "var(--border)", color: "var(--t2)" }}
              >
                −
              </button>
              <span className="mono text-[15px] w-8 text-center tnum text-(--t1)">
                {seatExtra}
              </span>
              <button
                onClick={() => setSeatExtra((n) => Math.min(97, n + 1))}
                disabled={seatExtra >= 97}
                className="w-10 h-10 rounded-md border mono text-[16px] flex items-center justify-center transition-colors disabled:opacity-30"
                style={{ borderColor: "var(--border)", color: "var(--t2)" }}
              >
                +
              </button>
            </div>
          </div>

          <div
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t"
            style={{ borderColor: "var(--border)" }}
          >
            <div>
              {seatExtra > 0 ? (
                <span className="mono text-[12px] text-(--t2)">
                  {seatExtra} × €{seatPrice} ={" "}
                  <span className="text-(--t1) font-semibold">
                    €{seatExtra * seatPrice}/month
                  </span>{" "}
                  added to your subscription
                </span>
              ) : (
                <span
                  className="mono text-[12px]"
                  style={{ color: "var(--t3)" }}
                >
                  No extra seats — only the {baseSeats} included ones.
                </span>
              )}
            </div>
            <button
              onClick={handleUpdateSeats}
              disabled={seatState === "loading" || seatExtra === initialExtraSeats}
              className="mono text-[11px] h-9 px-5 rounded-md border transition-colors disabled:opacity-40 shrink-0"
              style={{
                borderColor:
                  seatState === "success"
                    ? "var(--validated)"
                    : "var(--border)",
                color:
                  seatState === "success"
                    ? "var(--validated)"
                    : seatState === "error"
                      ? "var(--kill)"
                      : "var(--t2)",
              }}
            >
              {seatState === "loading"
                ? "Updating…"
                : seatState === "success"
                  ? "Updated ✓"
                  : seatState === "error"
                    ? "Error — retry"
                    : "Update seats"}
            </button>
          </div>
        </div>
        );
      })()}

      {/* VAT ID — only for paid plans */}
      {isPaid && (
        <div
          className="rounded-md border p-5"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <div className="mb-4">
            <h3 className="display text-[14px] font-semibold" style={{ color: "var(--t1)" }}>
              VAT ID
            </h3>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--t2)" }}>
              EU businesses: add your VAT number to apply reverse charge on future invoices.
            </p>
          </div>

          <form onSubmit={handleVatSave} className="flex items-start gap-2">
            <div
              className="flex-1 rounded-md border px-3 h-9 flex items-center"
              style={{ borderColor: vatState === "error" ? "rgba(229,91,60,0.5)" : "var(--border)", background: "var(--canvas)" }}
            >
              <input
                type="text"
                value={vatId}
                onChange={(e) => { setVatId(e.target.value.toUpperCase()); if (vatState === "error") setVatState("idle"); }}
                placeholder="e.g. RO12345678"
                maxLength={20}
                disabled={vatState === "loading"}
                className="w-full mono text-[12px] bg-transparent outline-none placeholder:text-(--t3)"
                style={{ color: "var(--t1)" }}
              />
              {vatId && vatState !== "loading" && (
                <button
                  type="button"
                  onClick={() => { setVatId(""); setVatState("idle"); setVatError(""); }}
                  className="ml-1 mono text-[10px] shrink-0 hover:opacity-70"
                  style={{ color: "var(--t3)" }}
                >
                  ×
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={vatState === "loading"}
              className="shrink-0 h-9 px-4 rounded-md mono text-[11px] transition-colors disabled:opacity-50"
              style={{
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: vatState === "success" ? "var(--validated)" : "var(--border)",
                color: vatState === "success" ? "var(--validated)" : vatState === "error" ? "var(--kill)" : "var(--t2)",
                background: "transparent",
              }}
            >
              {vatState === "loading" ? "Saving…" : vatState === "success" ? "Saved ✓" : "Save"}
            </button>
          </form>

          {vatState === "error" && vatError && (
            <p className="mono text-[10px] mt-2" style={{ color: "var(--kill)" }}>{vatError}</p>
          )}
          <p className="mono text-[10px] mt-2" style={{ color: "var(--t3)" }}>
            Leave blank to remove. Changes apply to future invoices only.
          </p>
        </div>
      )}

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
