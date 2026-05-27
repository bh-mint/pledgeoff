'use client';

import Link from 'next/link';
import type { SignalFeedNiche } from '@/app/api/v1/signal-feed/route';

type Props = {
  niches: SignalFeedNiche[];
  locked: boolean;
};

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  const w = 56;
  const h = 20;
  const step = w / (data.length - 1);

  const points = data
    .map((v, i) => `${i * step},${h - (v / max) * h}`)
    .join(' ');

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke="var(--validated)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HeatBar({ score, max }: { score: number; max: number }) {
  const pct = max > 0 ? Math.round((score / max) * 100) : 0;
  return (
    <div className="h-0.5 rounded-full w-full" style={{ background: 'var(--border)' }}>
      <div
        className="h-0.5 rounded-full transition-all"
        style={{ width: `${pct}%`, background: 'var(--validated)' }}
      />
    </div>
  );
}

export function SignalFeed({ niches, locked }: Props) {
  if (locked) {
    return (
      <div className="relative overflow-hidden">
        {/* Blurred preview */}
        <div className="blur-sm pointer-events-none select-none space-y-3 px-5 py-4">
          {(['AI / ML', 'Dev Tools', 'SaaS / B2B', 'Fintech', 'Productivity'] as const).map((label) => (
            <div key={label} className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="mono text-[11px] text-(--t2)">{label}</span>
                  <span className="mono text-[10px] text-(--t3)">— ideas</span>
                </div>
                <div className="h-0.5 rounded-full w-full" style={{ background: 'var(--border)' }}>
                  <div className="h-0.5 rounded-full w-3/5" style={{ background: 'var(--validated)' }} />
                </div>
              </div>
              <div className="w-14 h-5 rounded" style={{ background: 'var(--border)' }} />
            </div>
          ))}
        </div>
        {/* Lock overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <span className="mono text-[10px] uppercase tracking-[0.1em] text-(--t3)">Team+ required</span>
          <Link
            href="/pricing"
            className="mono text-[11px] font-semibold px-3 py-1.5 rounded transition-colors"
            style={{ background: 'var(--accent)', color: '#000' }}
          >
            Upgrade →
          </Link>
        </div>
      </div>
    );
  }

  if (niches.length === 0) {
    return (
      <div className="px-5 py-8 text-center">
        <div className="mono text-[11px] text-(--t3)">
          Not enough data yet — validate more ideas to see trending niches.
        </div>
      </div>
    );
  }

  const maxScore = Math.max(...niches.map((n) => n.heatScore), 1);

  return (
    <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
      {niches.map((n) => (
        <div key={n.niche} className="px-5 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="display text-[12px] font-semibold text-(--t1) truncate">{n.label}</span>
              <span className="mono text-[10px] text-(--t3) shrink-0 ml-2">
                {n.totalIdeas} idea{n.totalIdeas !== 1 ? 's' : ''}
              </span>
            </div>
            <HeatBar score={n.heatScore} max={maxScore} />
            <div className="flex items-center gap-2 mt-1">
              <span className="mono text-[10px]" style={{ color: 'var(--validated)' }}>
                {n.goCount} GO
              </span>
              {n.pivotCount > 0 && (
                <span className="mono text-[10px] text-(--t3)">{n.pivotCount} PIVOT</span>
              )}
            </div>
          </div>
          <Sparkline data={n.sparkline} />
        </div>
      ))}
    </div>
  );
}
