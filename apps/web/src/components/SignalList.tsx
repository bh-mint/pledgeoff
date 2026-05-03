import type { Signal } from "@pledgeoff/core";

const SOURCE_LABELS: Record<string, string> = {
  reddit: "Reddit",
  github: "GitHub",
};

const SENTIMENT_CONFIG = {
  positive: { label: "POSITIVE", color: "text-[var(--validated)]" },
  negative: { label: "NEGATIVE", color: "text-[var(--kill)]" },
  neutral:  { label: "NEUTRAL",  color: "text-[var(--t3)]" },
} as const;

interface SignalListProps {
  signals: Signal[];
}

export function SignalList({ signals }: SignalListProps) {
  if (signals.length === 0) {
    return (
      <p className="text-[13px] text-[var(--t3)]">No signals collected yet.</p>
    );
  }

  const bySource = signals.reduce<Record<string, Signal[]>>((acc, s) => {
    (acc[s.source] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {Object.entries(bySource).map(([source, items]) => (
        <div key={source}>
          <p className="mono text-[10px] text-[var(--t3)] uppercase tracking-[0.12em] mb-3">
            {SOURCE_LABELS[source] ?? source} · {items.length} signal{items.length !== 1 ? "s" : ""}
          </p>
          <div className="space-y-3">
            {items.map((signal) => {
              const sentiment = SENTIMENT_CONFIG[signal.sentiment];
              return (
                <div
                  key={signal.id}
                  className="bg-[var(--surface)] border border-[var(--border)] rounded-md p-4"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <a
                      href={signal.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[13px] text-[var(--t1)] font-medium hover:text-[var(--accent)] transition-colors leading-snug"
                    >
                      {signal.title}
                    </a>
                    <span
                      className={`mono text-[10px] uppercase tracking-[0.1em] flex-shrink-0 ${sentiment.color}`}
                    >
                      {sentiment.label}
                    </span>
                  </div>
                  {signal.summary && (
                    <p className="text-[12px] text-[var(--t3)] leading-relaxed">
                      {signal.summary}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
