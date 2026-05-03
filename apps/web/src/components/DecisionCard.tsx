import type { Decision } from "@pledgeoff/core";

const VERDICT_CONFIG = {
  GO: {
    label: "GO",
    color: "text-[var(--validated)]",
    bg: "bg-[var(--validated)]/10",
    border: "border-[var(--validated)]/30",
    dot: "bg-[var(--validated)]",
    description: "Strong signal. Build it.",
  },
  KILL: {
    label: "KILL",
    color: "text-[var(--kill)]",
    bg: "bg-[var(--kill)]/10",
    border: "border-[var(--kill)]/30",
    dot: "bg-[var(--kill)]",
    description: "Weak signal. Don't build it.",
  },
  PIVOT: {
    label: "PIVOT",
    color: "text-[#F5A623]",
    bg: "bg-[#F5A623]/10",
    border: "border-[#F5A623]/30",
    dot: "bg-[#F5A623]",
    description: "Mixed signal. Change direction.",
  },
} as const;

interface DecisionCardProps {
  decision: Decision;
}

export function DecisionCard({ decision }: DecisionCardProps) {
  const cfg = VERDICT_CONFIG[decision.verdict];
  const confidencePct = Math.round(decision.confidence * 100);

  return (
    <div className={`rounded-md border ${cfg.border} ${cfg.bg} p-8`}>
      {/* Verdict */}
      <div className="flex items-center gap-3 mb-6">
        <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot} flex-shrink-0`} />
        <span className={`display text-[48px] font-black leading-none ${cfg.color}`}>
          {cfg.label}
        </span>
        <span className="text-[14px] text-[var(--t3)] self-end mb-1.5">
          {cfg.description}
        </span>
      </div>

      {/* Confidence bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1.5">
          <span className="mono text-[10px] text-[var(--t3)] uppercase tracking-[0.1em]">
            Confidence
          </span>
          <span className={`mono text-[11px] font-semibold ${cfg.color}`}>
            {confidencePct}%
          </span>
        </div>
        <div className="h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${cfg.dot} transition-all duration-700`}
            style={{ width: `${confidencePct}%` }}
          />
        </div>
      </div>

      {/* Reasoning */}
      <div>
        <p className="mono text-[10px] text-[var(--t3)] uppercase tracking-[0.1em] mb-3">
          Reasoning
        </p>
        <p className="text-[14px] text-[var(--t2)] leading-relaxed">
          {decision.reasoning}
        </p>
      </div>
    </div>
  );
}

export function DecisionPending() {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-8 flex flex-col items-center justify-center gap-4 min-h-[180px]">
      <div className="flex items-center gap-2">
        <span className="pulse-dot w-2 h-2 rounded-full bg-[var(--accent)] inline-block" />
        <span className="mono text-[11px] text-[var(--t3)] uppercase tracking-[0.1em]">
          Analyzing signals…
        </span>
      </div>
      <p className="text-[13px] text-[var(--t3)] text-center max-w-xs">
        We&apos;re scanning Reddit and GitHub. This takes ~15 seconds.
      </p>
    </div>
  );
}
