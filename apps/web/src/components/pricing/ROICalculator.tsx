"use client";

import { useState } from "react";

const MIN = 1000;
const MAX = 30000;
const DEFAULT = 6000;
const FOUNDER_PRICE = 49;
const WORK_MINUTES_PER_MONTH = 20 * 8 * 60; // 9600 min

function paybackMinutes(monthlyValue: number): number {
  return Math.round((FOUNDER_PRICE / monthlyValue) * WORK_MINUTES_PER_MONTH);
}

function formatMinutes(min: number): string {
  if (min < 60) return `${min} minutes`;
  const h = Math.round(min / 60 * 10) / 10;
  return h === 1 ? `${h} hour` : `${h} hours`;
}

export function ROICalculator() {
  const [value, setValue] = useState(DEFAULT);
  const minutes = paybackMinutes(value);
  const label = formatMinutes(minutes);

  return (
    <div
      className="mt-16 rounded-md border p-6 sm:p-8"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <div className="mono text-[10px] uppercase tracking-wider mb-3" style={{ color: "var(--t3)" }}>
        ROI CALCULATOR
      </div>
      <h2 className="display text-[22px] sm:text-[28px] font-semibold tracking-tight mb-1" style={{ color: "var(--t1)" }}>
        How much is one month of your work worth?
      </h2>
      <p className="text-[13px] mb-8" style={{ color: "var(--t2)" }}>
        Drag to your monthly output value (salary, revenue, client billing).
      </p>

      <div className="flex items-center gap-4 mb-6">
        <span className="display text-[36px] sm:text-[48px] font-semibold tnum tabular-nums" style={{ color: "var(--accent)", minWidth: "6ch" }}>
          €{value.toLocaleString()}
        </span>
        <span className="mono text-[11px]" style={{ color: "var(--t3)" }}>/ month</span>
      </div>

      <input
        type="range"
        min={MIN}
        max={MAX}
        step={500}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full accent-[color:var(--accent)] h-1 rounded-full cursor-pointer"
        style={{ accentColor: "var(--accent)" }}
      />
      <div className="flex justify-between mono text-[10px] mt-1 mb-8" style={{ color: "var(--t3)" }}>
        <span>€{MIN.toLocaleString()}</span>
        <span>€{MAX.toLocaleString()}</span>
      </div>

      <div
        className="rounded-md border-l-2 pl-5 py-4"
        style={{ borderColor: "var(--accent)", background: "rgba(var(--accent-rgb,99,102,241),0.06)" }}
      >
        <div className="mono text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--accent)" }}>
          Estimated result
        </div>
        <p className="text-[15px] sm:text-[17px] leading-snug" style={{ color: "var(--t1)" }}>
          At €{value.toLocaleString()}/mo, PledgeOFF Founder pays for itself in{" "}
          <strong style={{ color: "var(--accent)" }}>{label} of your time</strong>.
        </p>
        <p className="text-[12px] mt-2" style={{ color: "var(--t3)" }}>
          One avoided mistake — a pivot, a dead feature, a wrong market — is worth multiples of that.
        </p>
        <p className="text-[11px] mt-3" style={{ color: "var(--t3)", opacity: 0.6 }}>
          Based on 160h/mo working time. Estimate only.
        </p>
      </div>
    </div>
  );
}
