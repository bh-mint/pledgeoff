import { createSupabaseServiceClient } from '@/lib/supabase-server';

export type TeamActivityEvent =
  | {
      type: 'idea_validated';
      actorInitials: string;
      isOwn: boolean;
      ideaId: string;
      ideaText: string;
      verdict: 'GO' | 'KILL' | 'PIVOT' | null;
      score: number | null;
      occurredAt: string;
    }
  | {
      type: 'member_joined';
      actorInitials: string;
      isOwn: boolean;
      occurredAt: string;
    };

function initials(firstName: string | null, lastName: string | null, fallback: string): string {
  const full = [firstName, lastName].filter(Boolean).join(' ');
  if (full) {
    return full.split(' ').slice(0, 2).map((s) => s[0]?.toUpperCase() ?? '').join('');
  }
  return fallback.slice(0, 2).toUpperCase();
}

export async function getTeamActivity(
  teamId: string,
  memberIds: string[],
  currentUserId: string,
  limit = 20,
): Promise<TeamActivityEvent[]> {
  if (memberIds.length === 0) return [];

  const supabase = createSupabaseServiceClient();

  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - 90);
  const since = sinceDate.toISOString();

  const [decisionsRes, membershipsRes] = await Promise.all([
    supabase
      .from('decisions')
      .select('id, idea_id, verdict, score, dimensions, created_at, ideas!inner(id, user_id, text)')
      .in('ideas.user_id', memberIds)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(limit)
      .returns<{
        id: string;
        idea_id: string;
        verdict: string | null;
        score: number | null;
        dimensions: Array<{ weight: number; score: number }> | null;
        created_at: string;
        ideas: { id: string; user_id: string; text: string };
      }[]>(),

    supabase
      .from('team_memberships')
      .select('user_id, accepted_at')
      .eq('team_id', teamId)
      .eq('status', 'active')
      .not('accepted_at', 'is', null)
      .gte('accepted_at', since)
      .order('accepted_at', { ascending: false })
      .limit(limit)
      .returns<{ user_id: string | null; accepted_at: string | null }[]>(),
  ]);

  const decisionRows = decisionsRes.data ?? [];
  const membershipRows = membershipsRes.data ?? [];

  // Fetch profiles for all actors
  const actorIds = [
    ...new Set([
      ...decisionRows.map((d) => d.ideas.user_id),
      ...membershipRows.map((m) => m.user_id).filter(Boolean) as string[],
    ]),
  ];

  const { data: profiles } = actorIds.length > 0
    ? await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', actorIds)
        .returns<{ id: string; first_name: string | null; last_name: string | null }[]>()
    : { data: [] };

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, { firstName: p.first_name, lastName: p.last_name }]),
  );

  function computeScore(
    score: number | null,
    dimensions: Array<{ weight: number; score: number }> | null,
  ): number | null {
    if (score !== null) return Math.round(score);
    if (dimensions && dimensions.length > 0) {
      return Math.round(dimensions.reduce((s, d) => s + d.weight * d.score, 0));
    }
    return null;
  }

  const events: TeamActivityEvent[] = [];

  for (const d of decisionRows) {
    const userId = d.ideas.user_id;
    const p = profileMap.get(userId);
    events.push({
      type: 'idea_validated',
      actorInitials: initials(p?.firstName ?? null, p?.lastName ?? null, userId),
      isOwn: userId === currentUserId,
      ideaId: d.ideas.id,
      ideaText: d.ideas.text,
      verdict: (d.verdict as 'GO' | 'KILL' | 'PIVOT' | null) ?? null,
      score: computeScore(d.score, d.dimensions),
      occurredAt: d.created_at,
    });
  }

  for (const m of membershipRows) {
    if (!m.user_id || !m.accepted_at) continue;
    const p = profileMap.get(m.user_id);
    events.push({
      type: 'member_joined',
      actorInitials: initials(p?.firstName ?? null, p?.lastName ?? null, m.user_id),
      isOwn: m.user_id === currentUserId,
      occurredAt: m.accepted_at,
    });
  }

  events.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  return events.slice(0, limit);
}
