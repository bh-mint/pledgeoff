'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import type { TeamFeedRow } from '@/app/dashboard/DashboardClient';
import type { Plan } from '@pledgeoff/core';

type Props = {
  rows: TeamFeedRow[];
  plan: Plan;
};

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const w = 80;
  const h = 28;
  const step = w / (data.length - 1);
  const points = data.map((v, i) => `${i * step},${h - (v / max) * h}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function DonutSlice({ pct, color, offset, r }: { pct: number; color: string; offset: number; r: number }) {
  const circ = 2 * Math.PI * r;
  return (
    <circle
      cx="20" cy="20" r={r}
      fill="none"
      stroke={color}
      strokeWidth="6"
      strokeDasharray={`${(pct / 100) * circ} ${circ}`}
      strokeDashoffset={-offset}
      transform="rotate(-90 20 20)"
    />
  );
}

export function TeamAnalytics({ rows, plan }: Props) {
  const isAgency = plan === 'agency' || plan === 'enterprise';
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  const analytics = useMemo(() => {
    if (rows.length === 0) return null;

    // Verdict distribution
    const go    = rows.filter((r) => r.verdict === 'GO').length;
    const kill  = rows.filter((r) => r.verdict === 'KILL').length;
    const pivot = rows.filter((r) => r.verdict === 'PIVOT').length;
    const total = rows.length;

    // Weekly velocity — last 8 weeks
    const weekMs = 7 * 86_400_000;
    const weekly = Array.from({ length: 8 }, (_, i) => {
      const start = now - (7 - i) * weekMs;
      const end   = now - (6 - i) * weekMs;
      return rows.filter((r) => {
        const t = new Date(r.createdAt).getTime();
        return r.verdict !== null && t >= start && t < end;
      }).length;
    });

    // Top contributors — by ideas + reactions received
    const memberMap = new Map<string, { initials: string; ideas: number; reactionsReceived: number }>();
    for (const r of rows) {
      if (!memberMap.has(r.userId)) {
        memberMap.set(r.userId, { initials: r.memberInitials, ideas: 0, reactionsReceived: 0 });
      }
      const m = memberMap.get(r.userId)!;
      m.ideas++;
      m.reactionsReceived += (r.reactions.agree + r.reactions.disagree);
    }
    const contributors = [...memberMap.values()]
      .sort((a, b) => (b.ideas + b.reactionsReceived) - (a.ideas + a.reactionsReceived))
      .slice(0, 5);

    // Most engaged ideas
    const topIdeas = [...rows]
      .filter((r) => r.verdict !== null)
      .sort((a, b) => (b.reactions.agree + b.reactions.disagree) - (a.reactions.agree + a.reactions.disagree))
      .slice(0, 3);

    return { go, kill, pivot, total, weekly, contributors, topIdeas };
  }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!analytics) return null;

  const { go, kill, pivot, total, weekly, contributors, topIdeas } = analytics;
  const goP    = total > 0 ? Math.round((go / total) * 100) : 0;
  const killP  = total > 0 ? Math.round((kill / total) * 100) : 0;
  const pivotP = total > 0 ? Math.round((pivot / total) * 100) : 0;

  // Donut offsets
  const r = 14;
  const circ = 2 * Math.PI * r;
  const goOff    = 0;
  const killOff  = (goP / 100) * circ;
  const pivotOff = ((goP + killP) / 100) * circ;

  const avgWeekly = (weekly.reduce((a, b) => a + b, 0) / 8).toFixed(1);

  const content = (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Verdict distribution */}
      <div className="rounded-md border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <p className="mono text-[10px] uppercase tracking-[0.1em] text-(--t3) mb-3">Verdict distribution</p>
        <div className="flex items-center gap-4">
          <svg width="40" height="40" viewBox="0 0 40 40">
            {total > 0 ? (
              <>
                <DonutSlice pct={goP}    color="var(--validated)" offset={goOff}    r={r} />
                <DonutSlice pct={killP}  color="var(--kill)"      offset={killOff}  r={r} />
                <DonutSlice pct={pivotP} color="var(--caution)"   offset={pivotOff} r={r} />
              </>
            ) : (
              <circle cx="20" cy="20" r={r} fill="none" stroke="var(--border)" strokeWidth="6" />
            )}
          </svg>
          <div className="space-y-1">
            {[
              { label: 'GO',    count: go,    pct: goP,    color: 'var(--validated)' },
              { label: 'KILL',  count: kill,  pct: killP,  color: 'var(--kill)' },
              { label: 'PIVOT', count: pivot, pct: pivotP, color: 'var(--caution)' },
            ].map(({ label, count, pct, color }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                <span className="mono text-[10px] text-(--t2)">{label}</span>
                <span className="mono text-[10px] text-(--t1) font-semibold">{count}</span>
                <span className="mono text-[9px] text-(--t3)">{pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Weekly velocity */}
      <div className="rounded-md border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="mono text-[10px] uppercase tracking-[0.1em] text-(--t3)">Decision velocity</p>
          <span className="mono text-[10px] text-(--t2)">{avgWeekly}/week avg</span>
        </div>
        <MiniSparkline data={weekly} color="var(--accent)" />
        <p className="mono text-[9px] text-(--t3) mt-1">Last 8 weeks</p>
      </div>

      {/* Top contributors */}
      <div className="rounded-md border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <p className="mono text-[10px] uppercase tracking-[0.1em] text-(--t3) mb-3">Top contributors</p>
        <div className="space-y-2">
          {contributors.map((c, i) => (
            <div key={c.initials + i} className="flex items-center gap-2">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center mono text-[8px] font-semibold shrink-0"
                style={{ background: 'var(--border)', color: 'var(--t2)' }}
              >
                {c.initials}
              </span>
              <div className="flex-1 min-w-0">
                <div className="h-1 rounded-full" style={{ background: 'var(--border)' }}>
                  <div
                    className="h-1 rounded-full"
                    style={{
                      width: `${Math.max(10, (c.ideas / (contributors[0]?.ideas ?? 1)) * 100)}%`,
                      background: 'var(--accent)',
                    }}
                  />
                </div>
              </div>
              <span className="mono text-[10px] text-(--t2) shrink-0">{c.ideas} idea{c.ideas !== 1 ? 's' : ''}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Most engaged ideas */}
      <div className="rounded-md border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <p className="mono text-[10px] uppercase tracking-[0.1em] text-(--t3) mb-3">Most engaged</p>
        <div className="space-y-2">
          {topIdeas.length === 0 && (
            <p className="mono text-[10px] text-(--t3)">No reactions yet.</p>
          )}
          {topIdeas.map((r) => {
            const total = r.reactions.agree + r.reactions.disagree;
            return (
              <Link
                key={r.id}
                href={`/ideas/${r.id}`}
                className="flex items-start gap-2 group"
              >
                <span
                  className="mono text-[8px] px-1 py-0.5 rounded shrink-0 mt-0.5"
                  style={{
                    color: r.verdict === 'GO' ? 'var(--validated)' : r.verdict === 'KILL' ? 'var(--kill)' : 'var(--caution)',
                    border: `1px solid currentColor`,
                    opacity: 0.8,
                  }}
                >
                  {r.verdict}
                </span>
                <span className="mono text-[10px] text-(--t2) truncate group-hover:text-(--t1) transition-colors">
                  {r.text.slice(0, 55)}{r.text.length > 55 ? '…' : ''}
                </span>
                <span className="mono text-[10px] text-(--t3) shrink-0">{total}↕</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (!isAgency) {
    return (
      <div className="relative mt-4">
        <div className="blur-sm pointer-events-none select-none">{content}</div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <span className="mono text-[10px] uppercase tracking-[0.1em] text-(--t3)">Agency plan required</span>
          <Link
            href="/pricing"
            className="mono text-[11px] font-semibold px-3 py-1.5 rounded"
            style={{ background: 'var(--accent)', color: '#000' }}
          >
            Upgrade →
          </Link>
        </div>
      </div>
    );
  }

  return <div className="mt-4">{content}</div>;
}
