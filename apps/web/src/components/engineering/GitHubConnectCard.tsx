'use client';

import { useState } from 'react';

interface Props {
  isConnected: boolean;
  githubOrg?: string;
  loginProvider?: string;
  onDisconnect?: () => void;
}

export function GitHubConnectCard({ isConnected, githubOrg, loginProvider, onDisconnect }: Props) {
  const [disconnecting, setDisconnecting] = useState(false);

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      const res = await fetch('/api/v1/engineering/disconnect', { method: 'DELETE' });
      if (res.ok) onDisconnect?.();
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div
      className="rounded-lg border p-6"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium" style={{ color: 'var(--t1)' }}>
            GitHub Integration
          </h3>
          <p className="mt-1 text-sm" style={{ color: 'var(--t2)' }}>
            {isConnected
              ? `Connected as ${githubOrg}. Delivery estimates are based on your team's actual cycle time, refreshed daily.`
              : 'When you validate an idea, PledgeOFF estimates how long it would take your team to ship — based on your real PR cycle time, not generic benchmarks.'}
          </p>
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
          style={
            isConnected
              ? { background: '#1a2e1a', color: 'var(--validated)' }
              : { background: '#1a1a1f', color: 'var(--t3)' }
          }
        >
          {isConnected ? 'Connected' : 'Not connected'}
        </span>
      </div>

      <div className="mt-4 flex gap-3">
        {isConnected ? (
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="rounded px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
            style={{ background: 'var(--border)', color: 'var(--t2)' }}
          >
            {disconnecting ? 'Disconnecting...' : 'Disconnect GitHub'}
          </button>
        ) : (
          <a
            href="/api/auth/github"
            className="inline-flex items-center gap-2 rounded px-4 py-2 text-sm font-medium"
            style={{ background: 'var(--accent)', color: '#0A0A0B' }}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Connect GitHub
          </a>
        )}
      </div>

      {!isConnected && loginProvider === 'github' && (
        <div
          className="mt-4 rounded-md border px-4 py-3 text-xs"
          style={{ borderColor: 'var(--border)', background: 'var(--canvas)', color: 'var(--t2)' }}
        >
          You signed in with GitHub.{' '}
          <a href="/api/auth/github" className="underline" style={{ color: 'var(--t1)' }}>
            Connect your repositories →
          </a>{' '}
          to enable delivery estimates based on your team&apos;s real cycle time.
        </div>
      )}

      {!isConnected && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium" style={{ color: 'var(--t2)' }}>After connecting you get:</p>
          <ul className="space-y-1.5">
            {[
              'Delivery estimates per idea — based on your team\'s real cycle time, not industry averages',
              'Velocity metrics: PRs merged per week, review lag, avg story size',
              'Engineering bottlenecks surfaced automatically for each GO decision',
            ].map((benefit) => (
              <li key={benefit} className="flex items-start gap-2 text-xs" style={{ color: 'var(--t3)' }}>
                <span className="mt-px shrink-0" style={{ color: 'var(--validated)' }}>✓</span>
                {benefit}
              </li>
            ))}
          </ul>
          <p className="text-xs pt-1" style={{ color: 'var(--t3)' }}>
            Requires read:org and repo permissions · Team plan and above
          </p>
        </div>
      )}
    </div>
  );
}
