import { requireAdminServer } from '@/lib/admin-auth';
import Link from 'next/link';

const NAV = [
  { href: '/admin/metrics',       label: 'Metrics' },
  { href: '/admin/users',         label: 'Users' },
  { href: '/admin/subscriptions', label: 'Subscriptions' },
  { href: '/admin/outbox',        label: 'Outbox' },
  { href: '/admin/otto',          label: 'Otto usage' },
  { href: '/admin/flags',         label: 'Feature flags' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { email } = await requireAdminServer();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--canvas)', color: 'var(--t1)' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220,
        borderRight: '1px solid var(--border)',
        background: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
        flexShrink: 0,
      }}>
        <div style={{ padding: '0 20px 20px', borderBottom: '1px solid var(--border)', marginBottom: 12 }}>
          <div style={{ fontFamily: 'var(--font-display, "Inter Tight")', fontWeight: 700, fontSize: 15, letterSpacing: '-0.04em', color: 'var(--t1)' }}>
            PledgeOFF <span style={{ color: 'var(--accent)' }}>Admin</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'monospace', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {email}
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 8px' }}>
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={{
                display: 'block',
                padding: '8px 12px',
                borderRadius: 6,
                fontSize: 13,
                color: 'var(--t2)',
                textDecoration: 'none',
                fontWeight: 500,
              }}
              className="admin-nav-link"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
          <Link href="/dashboard" style={{ fontSize: 12, color: 'var(--t3)', textDecoration: 'none' }}>
            ← Back to app
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>
        {children}
      </main>

      <style>{`
        .admin-nav-link:hover { background: var(--canvas) !important; color: var(--t1) !important; }
      `}</style>
    </div>
  );
}
