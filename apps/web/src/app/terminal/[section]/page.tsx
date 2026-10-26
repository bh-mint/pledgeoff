import { notFound } from 'next/navigation';
import { requireTerminalUser } from '@/lib/terminal-auth';
import { DemoView, sections, type Section } from '@/components/terminal/DemoViews';

const descriptions: Record<Section, string> = {
  overview: 'A clear view of your financial workspace.',
  markets: 'A focused watchlist. A wider perspective.',
  strategies: 'Intentional rules. Measured exposure.',
  activity: 'Every event, in one place.',
  portfolio: 'Your allocation at a glance.',
  history: 'A record of simulated executions.',
  settings: 'Your private workspace, configured with care.',
};
export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  await requireTerminalUser();
  const { section } = await params;
  if (!sections.includes(section as Section)) notFound();
  const active = section as Section;
  return <main className={`pt-content pt-section-${active}`}><div className="pt-page-heading"><div><div className="pt-eyebrow">YOUR PRIVATE TERMINAL <span>/ 01</span></div><h1>{active[0].toUpperCase() + active.slice(1)}</h1><p>{descriptions[active]}</p></div><div className="pt-date"><span className="pt-dot" /> 26 Oct 2026 <small>DEMO SNAPSHOT · UTC</small></div></div><DemoView section={active} /></main>;
}
