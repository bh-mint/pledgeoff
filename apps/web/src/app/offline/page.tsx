import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'You\'re offline',
  robots: { index: false },
};

export default function OfflinePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 text-center">
      <p className="text-4xl">📡</p>
      <h1 className="text-xl font-semibold" style={{ color: 'var(--ink)' }}>
        You&apos;re offline
      </h1>
      <p className="text-sm max-w-xs" style={{ color: 'var(--dim)' }}>
        No internet connection. Check your network and try again.
      </p>
      <Link
        href="/dashboard"
        className="text-sm underline underline-offset-4"
        style={{ color: 'var(--dim)' }}
      >
        Try again →
      </Link>
    </main>
  );
}
