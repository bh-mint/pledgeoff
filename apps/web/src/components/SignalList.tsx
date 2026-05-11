import type { Signal } from "@pledgeoff/core";

const SOURCE_LABELS: Record<string, string> = {
  reddit: "Reddit",
  github: "GitHub",
};

const SENTIMENT_CONFIG = {
  positive: { label: "Positive", dot: "bg-(--validated)" },
  negative: { label: "Negative", dot: "bg-(--kill)" },
  neutral:  { label: "Neutral",  dot: "bg-(--t3)" },
} as const;

const SOURCE_ICON: Record<string, React.ReactNode> = {
  github: (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  ),
  reddit: (
    <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M20 10c0-5.52-4.48-10-10-10S0 4.48 0 10c0 5.51 4.48 10 10 10s10-4.49 10-10zm-13.5 1c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5zm6.5 3.5c-.69.69-1.8 1-3 1s-2.31-.31-3-1a.5.5 0 01.71-.71c.5.5 1.37.71 2.29.71s1.79-.21 2.29-.71a.5.5 0 01.71.71zM14 11.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5zm1.5-4.5a1 1 0 100 2 1 1 0 000-2zm-11 1a1 1 0 100 2 1 1 0 000-2zm3.65-3.77C7.19 3.51 6 4.31 6 5.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5c0-.42-.17-.8-.44-1.09l1.43-.99-.79-.18z" />
    </svg>
  ),
};

function truncate(text: string, max = 160): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}

interface SignalListProps {
  signals: Signal[];
}

export function SignalList({ signals }: SignalListProps) {
  if (signals.length === 0) {
    return (
      <p className="text-[13px] text-(--t3)">No signals collected yet.</p>
    );
  }

  const bySource = signals.reduce<Record<string, Signal[]>>((acc, s) => {
    (acc[s.source] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(bySource).map(([source, items]) => (
        <div key={source}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-(--t3)">{SOURCE_ICON[source]}</span>
            <span className="mono text-[10px] text-(--t3) uppercase tracking-[0.12em]">
              {SOURCE_LABELS[source] ?? source} · {items.length} signal{items.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="space-y-2">
            {items.map((signal) => {
              const sentiment = SENTIMENT_CONFIG[signal.sentiment];
              const summary = signal.summary ? truncate(signal.summary) : null;
              return (
                <a
                  key={signal.id}
                  href={signal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-(--surface) border border-(--border) rounded-lg p-3.5 hover:border-(--accent) transition-colors group"
                >
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <span className="text-[13px] text-(--t1) font-medium leading-snug group-hover:text-(--accent) transition-colors line-clamp-2">
                      {signal.title}
                    </span>
                    <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                      <span
                        className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${sentiment.dot}`}
                      />
                      <span className="mono text-[10px] text-(--t3) uppercase tracking-[0.08em]">
                        {sentiment.label}
                      </span>
                    </div>
                  </div>
                  {summary && (
                    <p className="text-[12px] text-(--t3) leading-relaxed line-clamp-2">
                      {summary}
                    </p>
                  )}
                </a>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
