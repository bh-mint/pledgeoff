'use client';

import { useEffect, useState } from 'react';
import type { EngineeringSnapshot, DeliveryEstimate } from '@pledgeoff/core';

interface Props {
  ideaId: string;
  authToken: string;
}

type State =
  | { phase: 'loading' }
  | { phase: 'no_github' }
  | { phase: 'ready'; snapshot: EngineeringSnapshot; estimate: DeliveryEstimate | null }
  | { phase: 'error' };

function MetricCard({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="rounded-lg border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="text-xs" style={{ color: 'var(--t3)' }}>{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-semibold tabular-nums" style={{ color: 'var(--t1)' }}>{value}</span>
        {unit && <span className="text-sm" style={{ color: 'var(--t2)' }}>{unit}</span>}
      </div>
    </div>
  );
}

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'var(--validated)',
  medium: 'var(--caution)',
  low: 'var(--t3)',
};

export function EngineeringVelocityPanel({ ideaId, authToken }: Props) {
  const [state, setState] = useState<State>({ phase: 'loading' });

  useEffect(() => {
    const headers = { Authorization: `Bearer ${authToken}` };

    async function load() {
      try {
        const [snapshotRes, estimateRes] = await Promise.all([
          fetch('/api/v1/engineering/snapshot', { headers }),
          fetch(`/api/v1/engineering/estimate/${ideaId}`, { headers }),
        ]);

        if (snapshotRes.status === 403 || snapshotRes.status === 404) {
          setState({ phase: 'no_github' });
          return;
        }
        if (!snapshotRes.ok) {
          setState({ phase: 'error' });
          return;
        }

        const snapshotJson = await snapshotRes.json() as { data: EngineeringSnapshot | null };
        if (!snapshotJson.data) {
          setState({ phase: 'no_github' });
          return;
        }

        let estimate: DeliveryEstimate | null = null;
        if (estimateRes.ok) {
          const est = await estimateRes.json() as { data: DeliveryEstimate };
          estimate = est.data;
        }

        setState({ phase: 'ready', snapshot: snapshotJson.data, estimate });
      } catch {
        setState({ phase: 'error' });
      }
    }

    void load();
  }, [ideaId, authToken]);

  if (state.phase === 'loading') {
    return (
      <div className="py-8 text-center text-sm" style={{ color: 'var(--t3)' }}>
        Loading engineering data...
      </div>
    );
  }

  if (state.phase === 'no_github') {
    return (
      <div
        className="rounded-lg border p-6 text-center"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <p className="text-sm font-medium" style={{ color: 'var(--t1)' }}>GitHub not connected</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--t2)' }}>
          Connect your GitHub account in Settings to see team velocity metrics and personalized delivery estimates.
        </p>
        <a
          href="/settings"
          className="mt-4 inline-block rounded px-4 py-2 text-sm font-medium"
          style={{ background: 'var(--accent)', color: '#0A0A0B' }}
        >
          Connect GitHub
        </a>
      </div>
    );
  }

  if (state.phase === 'error') {
    return (
      <div className="py-8 text-center text-sm" style={{ color: 'var(--t3)' }}>
        Failed to load engineering data.
      </div>
    );
  }

  const { snapshot, estimate } = state;
  const vm = snapshot.velocityMetrics;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium" style={{ color: 'var(--t1)' }}>
            Team Velocity — {snapshot.githubOrg}
          </h3>
          <span className="text-xs" style={{ color: 'var(--t3)' }}>
            Last 90 days
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard label="PRs merged / week" value={vm.prMergeRatePerWeek.toFixed(1)} />
          <MetricCard label="Avg cycle time" value={vm.avgCycleTimeDays.toFixed(1)} unit="days" />
          <MetricCard label="Avg lead time" value={vm.avgLeadTimeDays.toFixed(1)} unit="days" />
          <MetricCard label="Issues closed / week" value={vm.issuesClosedPerWeek.toFixed(1)} />
        </div>
      </div>

      {snapshot.bottlenecks.length > 0 && (
        <div>
          <h4 className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--t3)' }}>
            Bottlenecks detected
          </h4>
          <ul className="mt-2 space-y-1">
            {snapshot.bottlenecks.map((b) => (
              <li key={b} className="flex items-center gap-2 text-sm" style={{ color: 'var(--t2)' }}>
                <span style={{ color: 'var(--caution)' }}>&#9679;</span>
                {b}
              </li>
            ))}
          </ul>
        </div>
      )}

      {estimate && (
        <div
          className="rounded-lg border p-5"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium" style={{ color: 'var(--t1)' }}>
              Delivery Estimate
            </h4>
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium capitalize"
              style={{ color: CONFIDENCE_COLORS[estimate.confidence], background: 'var(--border)' }}
            >
              {estimate.confidence} confidence
            </span>
          </div>

          <div className="mt-4 flex items-end gap-4">
            <div>
              <div className="text-xs" style={{ color: 'var(--t3)' }}>Best case</div>
              <div className="text-xl font-semibold tabular-nums" style={{ color: 'var(--t1)' }}>
                {estimate.estimateDays.min}d
              </div>
            </div>
            <div className="pb-1" style={{ color: 'var(--t3)' }}>—</div>
            <div>
              <div className="text-xs" style={{ color: 'var(--t3)' }}>Realistic</div>
              <div className="text-3xl font-bold tabular-nums" style={{ color: 'var(--accent)' }}>
                {estimate.estimateDays.mid}d
              </div>
            </div>
            <div className="pb-1" style={{ color: 'var(--t3)' }}>—</div>
            <div>
              <div className="text-xs" style={{ color: 'var(--t3)' }}>Worst case</div>
              <div className="text-xl font-semibold tabular-nums" style={{ color: 'var(--t1)' }}>
                {estimate.estimateDays.max}d
              </div>
            </div>
          </div>

          <p className="mt-3 text-xs" style={{ color: 'var(--t3)' }}>
            {estimate.reasoning}
          </p>
        </div>
      )}
    </div>
  );
}
