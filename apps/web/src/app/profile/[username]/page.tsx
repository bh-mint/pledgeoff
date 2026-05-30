import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { Logo } from '@/components/brand/Logo';
import { FooterMicro } from '@/components/FooterMicro';

interface Props {
  params: Promise<{ username: string }>;
}

const VERDICT_COLOR: Record<string, string> = {
  GO:    'var(--validated)',
  KILL:  'var(--kill)',
  PIVOT: 'var(--caution)',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const supabase = createSupabaseServiceClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, first_name, last_name')
    .eq('username', username.toLowerCase())
    .single();

  if (!profile) return { title: 'Profile — PledgeOFF', robots: { index: false } };

  const displayName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || `@${username}`;
  return {
    title: `${displayName} (@${username}) — PledgeOFF`,
    description: `Signal verdicts by @${username} on PledgeOFF.`,
    alternates: { canonical: `https://pledgeoff.com/@${username}` },
    openGraph: {
      title: `${displayName} (@${username}) — PledgeOFF`,
      description: `Signal verdicts by @${username} on PledgeOFF.`,
      url: `https://pledgeoff.com/@${username}`,
    },
    robots: { index: true, follow: true },
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;
  const supabase = createSupabaseServiceClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name, avatar_url')
    .eq('username', username.toLowerCase())
    .single();

  if (!profile) notFound();

  const { data: rows } = await supabase
    .from('ideas')
    .select('id, text, created_at, decisions(verdict, score, created_at)')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(50);

  type Row = NonNullable<typeof rows>[number];
  type DecisionRow = { verdict: string; score: number | null; created_at: string };

  const verdicts = (rows ?? []).flatMap((row: Row) => {
    const decisions = (row.decisions ?? []) as DecisionRow[];
    if (!decisions.length) return [];
    const d = decisions[0];
    return [{ ideaId: row.id, text: row.text, verdict: d.verdict, score: d.score, createdAt: d.created_at }];
  });

  const counts = verdicts.reduce((acc, v) => {
    acc[v.verdict] = (acc[v.verdict] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const displayName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || `@${username}`;
  const initials = [profile.first_name?.[0], profile.last_name?.[0]].filter(Boolean).join('').toUpperCase() || username[0].toUpperCase();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--canvas)' }}>
      {/* Nav */}
      <div className="border-b px-4 sm:px-10 h-14 flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
        <Link href="/" className="flex items-center gap-2" style={{ color: 'var(--t1)' }}>
          <Logo size={20} />
          <span className="display text-[14px] font-semibold tracking-tight">
            Pledge<span style={{ color: 'var(--accent)' }}>OFF</span>
          </span>
        </Link>
        <Link
          href="/login"
          className="mono text-[11px] px-3 h-10 rounded border flex items-center transition-colors hover:border-(--accent) hover:text-(--accent)"
          style={{ borderColor: 'var(--border)', color: 'var(--t2)' }}
        >
          Validate your idea →
        </Link>
      </div>

      <div className="flex-1 max-w-[680px] mx-auto w-full px-4 sm:px-8 py-10 sm:py-16">
        {/* Profile header */}
        <div className="flex items-center gap-4 mb-8 pb-8 border-b" style={{ borderColor: 'var(--border)' }}>
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="w-16 h-16 rounded-full object-cover shrink-0"
            />
          ) : (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center shrink-0 text-[22px] font-semibold"
              style={{ background: 'var(--surface)', color: 'var(--t1)', border: '1px solid var(--border)' }}
            >
              {initials}
            </div>
          )}
          <div>
            <h1 className="text-[20px] font-semibold" style={{ color: 'var(--t1)' }}>{displayName}</h1>
            <p className="mono text-[12px] mt-0.5" style={{ color: 'var(--t3)' }}>@{username}</p>
          </div>
        </div>

        {/* Stats */}
        {verdicts.length > 0 && (
          <div className="flex gap-6 mb-8">
            {(['GO', 'KILL', 'PIVOT'] as const).map((v) => (
              <div key={v} className="text-center">
                <div className="display tnum text-[26px] font-semibold" style={{ color: VERDICT_COLOR[v] }}>
                  {counts[v] ?? 0}
                </div>
                <div className="mono text-[10px] uppercase tracking-[0.1em] mt-0.5" style={{ color: 'var(--t3)' }}>
                  {v}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Verdicts list */}
        {verdicts.length === 0 ? (
          <p className="text-[14px]" style={{ color: 'var(--t3)' }}>
            No public verdicts yet.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="mono text-[10px] uppercase tracking-[0.1em] mb-3" style={{ color: 'var(--t3)' }}>
              Signal verdicts · {verdicts.length}
            </p>
            {verdicts.map((v) => (
              <Link
                key={v.ideaId}
                href={`/v/${v.ideaId}`}
                className="flex items-start gap-3 p-4 rounded-md border transition-colors hover:border-(--accent)"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
              >
                <span
                  className="mono text-[11px] font-semibold shrink-0 mt-0.5"
                  style={{ color: VERDICT_COLOR[v.verdict] }}
                >
                  {v.verdict}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] line-clamp-2 leading-snug" style={{ color: 'var(--t1)' }}>
                    {v.text.split('\n\n')[0]}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {v.score !== null && (
                      <span className="mono tnum text-[10px]" style={{ color: 'var(--t3)' }}>
                        {v.score}/100
                      </span>
                    )}
                    <span className="mono text-[10px]" style={{ color: 'var(--t3)' }}>
                      {new Date(v.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <FooterMicro />
    </div>
  );
}
