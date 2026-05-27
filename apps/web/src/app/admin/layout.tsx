import { requireAdminServer } from '@/lib/admin-auth';
import Link from 'next/link';

const NAV = [
  { href: '/admin/metrics',       label: 'Metrics' },
  { href: '/admin/users',         label: 'Users' },
  { href: '/admin/subscriptions', label: 'Subscriptions' },
  { href: '/admin/outbox',        label: 'Outbox' },
  { href: '/admin/otto',          label: 'Otto usage' },
  { href: '/admin/flags',         label: 'Feature flags' },
  { href: '/admin/ai-cost',       label: 'AI cost' },
  { href: '/admin/flywheel',      label: 'Data Flywheel' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { email } = await requireAdminServer();

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--canvas)', color: 'var(--t1)' }}>
      <aside
        className="flex flex-col shrink-0 py-6"
        style={{ width: 220, borderRight: '1px solid var(--border)', background: 'var(--surface)' }}
      >
        <div
          className="px-5 pb-5 mb-3"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div
            className="font-bold text-[15px] tracking-[-0.04em]"
            style={{ fontFamily: 'var(--font-display, "Inter Tight")', color: 'var(--t1)' }}
          >
            PledgeOFF <span style={{ color: 'var(--accent)' }}>Admin</span>
          </div>
          <div
            className="font-mono text-[11px] mt-1 overflow-hidden text-ellipsis whitespace-nowrap"
            style={{ color: 'var(--t3)' }}
          >
            {email}
          </div>
        </div>

        <nav className="flex flex-col gap-0.5 px-2">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="admin-nav-link block px-3 py-2 rounded-md text-[13px] font-medium no-underline transition-colors"
              style={{ color: 'var(--t2)' }}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div
          className="mt-auto px-5 pt-4"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <Link href="/dashboard" className="text-[12px] no-underline" style={{ color: 'var(--t3)' }}>
            ← Back to app
          </Link>
        </div>
      </aside>

      <main className="flex-1 py-8 px-10 overflow-y-auto">
        {children}
      </main>

      <style>{`
        .admin-nav-link:hover { background: var(--canvas) !important; color: var(--t1) !important; }
      `}</style>
    </div>
  );
}
