import { requireAdminApi } from '@/lib/admin-auth';
import { container } from '@/lib/container';

type Period = '3m' | '6m' | '1y' | 'all';

function periodToDate(period: Period): Date | null {
  const now = new Date();
  if (period === '3m') return new Date(now.setMonth(now.getMonth() - 3));
  if (period === '6m') return new Date(now.setMonth(now.getMonth() - 6));
  if (period === '1y') return new Date(now.setFullYear(now.getFullYear() - 1));
  return null;
}

export async function GET(req: Request): Promise<Response> {
  const adminId = await requireAdminApi(req);
  if (!adminId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const rawPeriod = url.searchParams.get('period') ?? 'all';
  const period: Period = (['3m', '6m', '1y', 'all'] as const).includes(rawPeriod as Period)
    ? (rawPeriod as Period)
    : 'all';

  const result = await container._unsafeRepos.decisionOutcomeRepo.findAll();
  if (result.isErr()) return Response.json({ error: 'Failed to fetch outcomes' }, { status: 500 });

  const since = periodToDate(period);
  const outcomes = since
    ? result.value.filter((o) => new Date(o.reportedAt) >= since)
    : result.value;

  const header = 'idea_id,user_id,verdict_at_time,outcome_type,notes,reported_at\n';
  const rows = outcomes.map((o) => [
    o.ideaId,
    o.userId,
    o.verdictAtTime,
    o.outcomeType,
    `"${(o.notes ?? '').replace(/"/g, '""')}"`,
    o.reportedAt,
  ].join(',')).join('\n');

  return new Response(header + rows, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="flywheel-outcomes-${period}.csv"`,
    },
  });
}
