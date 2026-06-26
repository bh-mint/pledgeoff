"use client";

import { useState } from "react";
import type { Simulation } from "@pledgeoff/core";
import { getAuthToken } from "@/lib/auth-client";
import { InfoTooltip } from "@/components/InfoTooltip";
import { RevenueAreaChart } from "../VerdictCharts";

interface Props {
  ideaId: string;
  initialSimulation: Simulation | null;
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

const SCENARIO_LABELS: Record<string, string> = {
  conservative: "Conservative",
  moderate: "Moderate",
  optimistic: "Optimistic",
};

const SCENARIO_COLORS: Record<string, string> = {
  conservative: "var(--t3)",
  moderate: "var(--accent)",
  optimistic: "var(--validated)",
};

export function SimulateClient({ ideaId, initialSimulation }: Props) {
  const [simulation, setSimulation] = useState<Simulation | null>(initialSimulation);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runSimulation() {
    setLoading(true);
    setError(null);
    try {
      const token = await getAuthToken();
      if (!token) { setError("Not authenticated."); setLoading(false); return; }
      const res = await fetch(`/api/v1/ideas/${ideaId}/simulate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError((body as { error?: { message?: string } }).error?.message ?? "Simulation failed. Try again.");
        return;
      }
      const body = await res.json() as { data: Simulation };
      setSimulation(body.data);
    } catch {
      setError("Network error. Check connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!simulation) {
    if (loading) {
      return (
        <div
          className="rounded-md border p-8 text-center"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <p className="mono text-[11px] animate-pulse mb-2" style={{ color: "var(--t3)" }}>
            Running revenue simulation…
          </p>
          <p className="mono text-[10px]" style={{ color: "var(--t3)" }}>
            This may take 15–30 seconds
          </p>
        </div>
      );
    }

    return (
      <div
        className="rounded-md border p-8 text-center"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="mono text-[11px] mb-3" style={{ color: "var(--t3)" }}>
          Revenue simulation not yet generated
        </div>
        <p className="text-[14px] mb-6" style={{ color: "var(--t2)" }}>
          PledgeOFF will estimate your TAM, model 3 revenue scenarios, and calculate break-even.
        </p>
        {error && (
          <p className="mono text-[11px] mb-4" style={{ color: "var(--caution)" }}>{error}</p>
        )}
        <button
          onClick={runSimulation}
          className="inline-flex items-center gap-2 h-10 px-6 rounded-md display text-[13px] font-semibold transition-opacity hover:opacity-90"
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
        >
          Run simulation →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8" style={{ opacity: loading ? 0.5 : 1, transition: "opacity 0.2s" }}>
      {/* TAM */}
      <div
        className="rounded-md border p-6"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="mono text-[10px] mb-4 uppercase tracking-[0.12em]" style={{ color: "var(--t3)" }}>
          Total Addressable Market
        </div>
        <div className="flex items-end gap-3">
          <span className="display text-4xl font-bold" style={{ color: "var(--t1)", letterSpacing: "-0.03em" }}>
            {formatCurrency(simulation.tamLow)}
          </span>
          <span className="mono text-[14px] pb-2" style={{ color: "var(--t3)" }}>–</span>
          <span className="display text-4xl font-bold" style={{ color: "var(--accent)", letterSpacing: "-0.03em" }}>
            {formatCurrency(simulation.tamHigh)}
          </span>
        </div>
        <p className="mono text-[11px] mt-2" style={{ color: "var(--t3)" }}>
          Estimated serviceable market for this category
        </p>
      </div>

      {/* Revenue projection chart */}
      <div
        className="rounded-md border p-5 no-print"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="mono text-[10px] mb-3 uppercase tracking-[0.12em]" style={{ color: "var(--t3)" }}>
          Revenue Projection · 3 scenarios · 24 months
        </div>
        <RevenueAreaChart simulation={simulation} />
      </div>

      {/* Scenarios */}
      <div>
        <div className="mono text-[10px] mb-4 uppercase tracking-[0.12em]" style={{ color: "var(--t3)" }}>
          Revenue Scenarios{" "}
          <span className="sm:hidden">(Monthly Recurring Revenue)</span>
          <InfoTooltip content="Monthly Recurring Revenue — total subscription income earned per month" align="center">
            <span className="hidden sm:inline cursor-default">(MRR)</span>
          </InfoTooltip>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {simulation.scenarios.map((scenario) => (
            <div
              key={scenario.name}
              className="rounded-md border p-5"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <div
                className="mono text-[10px] uppercase tracking-widest mb-4 font-semibold"
                style={{ color: SCENARIO_COLORS[scenario.name] ?? "var(--t3)" }}
              >
                {SCENARIO_LABELS[scenario.name] ?? scenario.name}
              </div>
              <div className="mono text-[11px] mb-1" style={{ color: "var(--t3)" }}>Price / user</div>
              <div className="display text-[18px] font-semibold mb-4" style={{ color: "var(--t1)" }}>
                ${scenario.pricePerUser}/mo
              </div>
              <div className="space-y-2">
                {[
                  { label: "6 months", value: scenario.mrr6 },
                  { label: "12 months", value: scenario.mrr12 },
                  { label: "24 months", value: scenario.mrr24 },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="mono text-[10px]" style={{ color: "var(--t3)" }}>{label}</span>
                    <span className="mono text-[12px] font-semibold" style={{ color: "var(--t1)" }}>
                      {formatCurrency(value)}/mo
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Break-even */}
      <div
        className="rounded-md border p-5 flex items-center justify-between"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div>
          <div className="mono text-[10px] uppercase tracking-[0.12em] mb-1" style={{ color: "var(--t3)" }}>
            Break-even estimate
          </div>
          <p className="text-[13px]" style={{ color: "var(--t2)" }}>
            Months until MRR covers base operating costs (~$2-5K/mo)
          </p>
        </div>
        <div className="display font-bold text-right ml-6 shrink-0" style={{ fontSize: "32px", color: "var(--t1)", letterSpacing: "-0.03em" }}>
          {simulation.breakEvenMonths}
          <span className="mono text-[12px] font-normal ml-1" style={{ color: "var(--t3)" }}>mo</span>
        </div>
      </div>

      {/* Assumptions */}
      {simulation.assumptions.length > 0 && (
        <div>
          <div className="mono text-[10px] mb-3 uppercase tracking-[0.12em]" style={{ color: "var(--t3)" }}>
            Key assumptions
          </div>
          <ul className="space-y-1.5">
            {simulation.assumptions.map((a, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mono text-[10px] mt-0.5" style={{ color: "var(--t3)" }}>—</span>
                <span className="text-[13px]" style={{ color: "var(--t2)" }}>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {error && (
          <p className="mono text-[11px] text-right" style={{ color: "var(--caution)" }}>{error}</p>
        )}
        <div className="flex items-center justify-between">
          <p className="mono text-[10px]" style={{ color: "var(--t3)" }}>
            Simulation generated {new Date(simulation.createdAt).toLocaleDateString()} · Not financial advice
          </p>
          <button
            onClick={runSimulation}
            disabled={loading}
            className="mono text-[10px] px-3 py-1.5 rounded transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ border: "1px solid var(--border)", color: "var(--t2)" }}
          >
            {loading ? "Simulating…" : "Re-run"}
          </button>
        </div>
      </div>
    </div>
  );
}
