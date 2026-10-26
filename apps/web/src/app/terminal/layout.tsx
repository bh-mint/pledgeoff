import Link from 'next/link';
import { requireTerminalUser } from '@/lib/terminal-auth';
import { LogoutButton } from '@/components/terminal/LogoutButton';
import { SessionHygiene } from '@/components/terminal/SessionHygiene';

export const dynamic = 'force-dynamic';
const sections = ['Overview', 'Markets', 'Strategies', 'Activity', 'Portfolio', 'History', 'Settings'];
const symbols = ['◫', '⌁', '◇', '≋', '◴', '↶', '⚙'];

export default async function TerminalLayout({ children }: { children: React.ReactNode }) {
  await requireTerminalUser();
  return <div className="pt-shell">
    <SessionHygiene />
    <aside className="pt-sidebar">
      <Link href="/terminal/overview" className="pt-wordmark">Pledge<span>OFF</span><i /></Link>
      <div className="pt-workspace-tag">PERSONAL TERMINAL <span>01</span></div>
      <p className="pt-nav-label">WORKSPACE</p>
      <nav aria-label="Workspace">{sections.map((name, i) => <Link className={`pt-nav-link pt-link-${name.toLowerCase()}`} key={name} href={`/terminal/${name.toLowerCase()}`}><span aria-hidden="true">{symbols[i]}</span>{name}{name === 'Activity' && <small>3</small>}</Link>)}</nav>
      <div className="pt-sidebar-bottom">
        <div className="pt-engine"><span className="pt-dot" /><span>Paper environment<small>Live execution disabled</small></span><span className="pt-demo">DEMO</span></div>
        <div className="pt-account"><span className="pt-avatar">B</span><span>bashui<small>Private account</small></span></div>
        <LogoutButton />
      </div>
    </aside>
    <div className="pt-main">
      <header className="pt-topbar"><span className="pt-breadcrumb">Workspace <span>/</span> Private terminal</span><div><span className="pt-demo">DEMO</span><span className="pt-top-status"><span className="pt-dot" /> Read-only workspace</span><span className="pt-avatar pt-avatar-small">B</span></div></header>
      <div className="pt-demo-banner"><span>DEMO ENVIRONMENT</span> All balances, prices and activity are simulated. No exchange is connected. No orders can be placed.</div>
      {children}
      <footer className="pt-app-footer"><span>PledgeOFF <span className="pt-muted">/ Private by design.</span></span><span>Simulated data · USD · No live execution</span></footer>
    </div>
  </div>;
}
