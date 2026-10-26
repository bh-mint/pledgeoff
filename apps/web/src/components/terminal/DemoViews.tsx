import 'server-only';
import Link from 'next/link';

const markets = [
  { symbol: 'BTC', name: 'Bitcoin', price: '$67,432.80', change: '+2.34%', allocation: '42%', amount: '0.1560', value: '$10,519.52', color: '#efa74a', points: '0,23 8,26 16,18 24,20 32,9 40,13 48,5 56,8 64,2' },
  { symbol: 'ETH', name: 'Ethereum', price: '$3,521.64', change: '+1.87%', allocation: '28%', amount: '1.9860', value: '$6,993.98', color: '#a8a0ed', points: '0,26 8,18 16,21 24,14 32,16 40,7 48,12 56,5 64,3' },
  { symbol: 'SOL', name: 'Solana', price: '$172.93', change: '−0.62%', allocation: '12%', amount: '17.3320', value: '$2,997.23', color: '#96cbbb', points: '0,4 8,11 16,7 24,16 32,12 40,21 48,18 56,24 64,27' },
];
const activity = [
  { type: 'BUY', title: 'Paper buy · BTC / USD', note: 'Momentum allocation', amount: '+0.0025 BTC', time: '14:32:08', status: 'Simulated' },
  { type: 'SYS', title: 'Strategy evaluation', note: 'Trend following · BTC', amount: 'No action', time: '14:30:00', status: 'Completed' },
  { type: 'SELL', title: 'Paper sell · ETH / USD', note: 'Portfolio rebalance', amount: '−0.0400 ETH', time: '14:15:22', status: 'Simulated' },
];
export const sections = ['overview', 'markets', 'strategies', 'activity', 'portfolio', 'history', 'settings'] as const;
export type Section = typeof sections[number];

function Sparkline({ points, negative = false }: { points: string; negative?: boolean }) {
  return <svg className="pt-spark" viewBox="0 0 64 32" aria-hidden="true"><polyline points={points} fill="none" stroke={negative ? '#e6a491' : '#b5d99c'} strokeWidth="1.6" /></svg>;
}
function PanelHeading({ title, note, href }: { title: string; note?: string; href?: string }) {
  return <div className="pt-panel-heading"><h2>{title}</h2>{href ? <Link href={href}>View all ↗</Link> : <span>{note}</span>}</div>;
}
function MarketTable({ portfolio = false }: { portfolio?: boolean }) {
  return <div className="pt-table-wrap"><table className="pt-table"><thead><tr><th>Asset</th><th>{portfolio ? 'Holdings' : 'Price'}</th><th>{portfolio ? 'Value' : '24h change'}</th><th>{portfolio ? 'Allocation' : '7d trend'}</th></tr></thead><tbody>{markets.map((m) => <tr key={m.symbol}><td><div className="pt-asset"><span className="pt-coin" style={{ color: m.color, background: `${m.color}15` }}>{m.symbol === 'BTC' ? '₿' : m.symbol === 'ETH' ? 'Ξ' : '◎'}</span><span>{m.name}<small>{m.symbol} <span className="pt-muted">/ USD</span></small></span></div></td><td>{portfolio ? m.amount : m.price}</td><td className={!portfolio && !m.change.startsWith('−') ? 'pt-positive' : !portfolio ? 'pt-negative' : ''}>{portfolio ? m.value : m.change}</td><td>{portfolio ? m.allocation : <Sparkline points={m.points} negative={m.change.startsWith('−')} />}</td></tr>)}</tbody></table></div>;
}
function ActivityList() {
  return <div className="pt-activity-list">{activity.map((a) => <div className="pt-activity-item" key={a.time}><span className={`pt-event-icon ${a.type === 'SELL' ? 'pt-event-sell' : ''}`}>{a.type === 'BUY' ? '↙' : a.type === 'SELL' ? '↗' : '◇'}</span><div><strong>{a.title}</strong><small>{a.note}</small></div><div className="pt-activity-amount"><strong>{a.amount}</strong><small>{a.time} UTC · DEMO</small></div></div>)}</div>;
}
function Strategies() {
  return <div className="pt-strategy-grid">{[
    { name: 'Momentum allocation', market: 'BTC / USD', description: 'Follows sustained directional movement with a fixed exposure cap.', ret: '+4.82%', risk: 'Moderate', status: 'Paper only' },
    { name: 'Portfolio rebalance', market: 'MULTI-ASSET', description: 'Restores target weights when simulated allocations drift.', ret: '+2.16%', risk: 'Conservative', status: 'Paper only' },
    { name: 'Range observation', market: 'ETH / USD', description: 'Observes price ranges. Execution is not connected.', ret: '—', risk: 'Unassigned', status: 'Paused' },
  ].map((s, i) => <article className="pt-panel pt-strategy" key={s.name}><div className="pt-strategy-top"><span className="pt-strategy-icon">{['⌁', '◴', '◇'][i]}</span><span className="pt-pill">{s.status}</span></div><span className="pt-eyebrow">{s.market} · DEMO</span><h2>{s.name}</h2><p>{s.description}</p><div className="pt-strategy-stats"><span>Simulated return<strong className="pt-positive">{s.ret}</strong></span><span>Risk profile<strong>{s.risk}</strong></span></div></article>)}</div>;
}
function EquityChart() {
  return <section className="pt-panel pt-equity"><PanelHeading title="Portfolio performance" note="30D · DEMO" /><div className="pt-chart-summary"><strong>$24,982.40</strong><span className="pt-positive">↗ +$1,248.62 <span className="pt-muted">this month</span></span></div><div className="pt-chart" role="img" aria-label="DEMO: simulated portfolio rises from approximately 23,700 to 24,982 dollars during October 1–26, 2026."><svg viewBox="0 0 800 220" preserveAspectRatio="none"><defs><linearGradient id="equity-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#b5d99c" stopOpacity=".18" /><stop offset="100%" stopColor="#b5d99c" stopOpacity="0" /></linearGradient></defs>{[35, 90, 145, 200].map((y) => <line key={y} x1="0" x2="800" y1={y} y2={y} stroke="#ffffff0a" strokeDasharray="4 6" />)}<path d="M0 185 L20 180 L40 187 L60 172 L80 178 L100 147 L120 158 L140 142 L160 150 L180 133 L200 140 L220 119 L240 125 L260 109 L280 127 L300 110 L320 115 L340 93 L360 100 L380 74 L400 82 L420 67 L440 91 L460 88 L480 105 L500 80 L520 90 L540 62 L560 70 L580 44 L600 53 L620 40 L640 58 L660 32 L680 43 L700 25 L720 35 L740 18 L760 24 L780 10 L800 16 L800 220 L0 220Z" fill="url(#equity-fill)" /><path d="M0 185 L20 180 L40 187 L60 172 L80 178 L100 147 L120 158 L140 142 L160 150 L180 133 L200 140 L220 119 L240 125 L260 109 L280 127 L300 110 L320 115 L340 93 L360 100 L380 74 L400 82 L420 67 L440 91 L460 88 L480 105 L500 80 L520 90 L540 62 L560 70 L580 44 L600 53 L620 40 L640 58 L660 32 L680 43 L700 25 L720 35 L740 18 L760 24 L780 10 L800 16" fill="none" stroke="#b5d99c" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg><div className="pt-chart-axis"><span>01 Oct</span><span>06 Oct</span><span>11 Oct</span><span>16 Oct</span><span>21 Oct</span><span>26 Oct</span></div></div><div className="pt-chart-foot"><span><i /> Portfolio value</span><span>Illustrative performance · Not a forecast</span></div></section>;
}
function Allocation() {
  return <section className="pt-panel pt-allocation"><PanelHeading title="Asset allocation" note="DEMO" /><div className="pt-donut"><div><span>4</span><small>ASSETS</small></div></div><div className="pt-allocation-legend">{[['Bitcoin', '42%', '#b5d99c'], ['Ethereum', '28%', '#aaa1dc'], ['Solana', '12%', '#7dafa8'], ['USD reserve', '18%', '#42494b']].map(([name, value, color]) => <div key={name}><span><i style={{ background: color }} />{name}</span><strong>{value}</strong></div>)}</div></section>;
}
function Overview() {
  return <><div className="pt-metrics">{[
    ['Portfolio value', '$24,982.40', '+5.26%', 'vs. initial paper balance', '◴'],
    ['Today’s P&L', '+$284.16', '+1.15%', 'simulated daily change', '↗'],
    ['Available balance', '$4,471.67', 'USD', 'unallocated paper funds', '▤'],
    ['Observed strategies', '03', '02 paper', '1 paused · no live engine', '◇'],
  ].map(([label, value, change, note, icon]) => <article className="pt-metric" key={label}><div><span>{label}</span><span className="pt-metric-icon">{icon}</span></div><strong>{value}</strong><p><span className="pt-positive">{change}</span> {note}</p></article>)}</div><div className="pt-performance-grid"><EquityChart /><Allocation /></div><div className="pt-bottom-grid"><section className="pt-panel"><PanelHeading title="Market watch" href="/terminal/markets" /><MarketTable /></section><section className="pt-panel"><PanelHeading title="Recent activity" href="/terminal/activity" /><ActivityList /><div className="pt-panel-note">Simulated events · 26 October 2026</div></section></div></>;
}
function Settings() {
  return <div className="pt-settings-grid"><section className="pt-panel pt-settings-panel"><PanelHeading title="Access & identity" note="PRIVATE" /><dl><div><dt>Authorized alias</dt><dd>bashui</dd></div><div><dt>Authentication</dt><dd>Supabase Auth</dd></div><div><dt>Public registration</dt><dd>Disabled in this application</dd></div><div><dt>Session storage</dt><dd>HttpOnly cookies</dd></div><div><dt>Two-factor authentication</dt><dd>Not enabled by this application</dd></div></dl><p>Password changes and account recovery are managed through a private administrator-assisted Supabase flow.</p></section><section className="pt-panel pt-settings-panel"><PanelHeading title="Environment" note="DEMO" /><dl><div><dt>Data source</dt><dd>Illustrative fixtures</dd></div><div><dt>Exchange connection</dt><dd>Not connected</dd></div><div><dt>Live trading</dt><dd>Disabled</dd></div><div><dt>Engine heartbeat</dt><dd>Not connected</dd></div><div><dt>STOP command</dt><dd>Unavailable · no engine</dd></div></dl><p>No credentials, balances or orders are read from an exchange. Environment settings are read-only in phase 1.</p></section></div>;
}
export function DemoView({ section }: { section: Section }) {
  if (section === 'overview') return <Overview />;
  if (section === 'markets') return <><div className="pt-section-note">Illustrative market snapshot · 26 Oct 2026, 14:32 UTC · Prices are not live.</div><section className="pt-panel"><PanelHeading title="Market watch" note="USD · DEMO" /><MarketTable /></section><div className="pt-info-note">Market data providers are not connected. This watchlist is for interface demonstration only.</div></>;
  if (section === 'strategies') return <><Strategies /><div className="pt-info-note">DEMO strategy cards are illustrative. No engine runs these strategies and no orders are submitted.</div></>;
  if (section === 'portfolio') return <><div className="pt-performance-grid"><section className="pt-panel"><PanelHeading title="Paper holdings" note="DEMO · USD" /><MarketTable portfolio /><div className="pt-panel-note">USD reserve: $4,471.67 · Total paper balance: $24,982.40</div></section><Allocation /></div></>;
  if (section === 'activity') return <section className="pt-panel"><PanelHeading title="Activity feed" note="26 OCT 2026 · DEMO" /><ActivityList /><div className="pt-panel-note">These are example events, not records from a connected engine.</div></section>;
  if (section === 'history') return <section className="pt-panel"><PanelHeading title="Paper execution history" note="DEMO" /><div className="pt-table-wrap"><table className="pt-table"><thead><tr><th>Time · UTC</th><th>Market</th><th>Side</th><th>Quantity</th><th>Status</th></tr></thead><tbody>{activity.filter((a) => a.type !== 'SYS').map((a) => <tr key={a.time}><td>26 Oct 2026 · {a.time}</td><td>{a.type === 'BUY' ? 'BTC / USD' : 'ETH / USD'}</td><td>{a.type}</td><td>{a.amount}</td><td><span className="pt-pill">Simulated</span></td></tr>)}</tbody></table></div><div className="pt-panel-note">No live executions. Fees, spread and slippage are not modeled in these illustrative fixtures.</div></section>;
  return <Settings />;
}
