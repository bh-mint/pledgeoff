import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { createSupabaseAuthClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();

  const authSupabase = await createSupabaseAuthClient();
  const { data: { user } } = await authSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const svc = createSupabaseServiceClient();

  const [profileRes, ideasRes, subscriptionRes, outcomesRes, queueRes] = await Promise.all([
    svc.from('profiles').select('*').eq('id', user.id).single(),
    svc.from('ideas').select('id, text, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
    svc.from('subscriptions').select('plan, status, billing_interval, current_period_end').eq('user_id', user.id).single(),
    svc.from('decision_outcomes').select('idea_id, outcome_type, created_at').eq('user_id', user.id),
    svc.from('decision_queue').select('idea_id, priority_score, explanation, updated_at').eq('user_id', user.id),
  ]);

  const ideaIds: string[] = (ideasRes.data ?? []).map((i: { id: string }) => i.id);

  const [decisionsRes, signalsRes] = await Promise.all([
    ideaIds.length > 0
      ? svc.from('decisions').select('idea_id, verdict, score, confidence, reasoning, created_at').in('idea_id', ideaIds).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    ideaIds.length > 0
      ? svc.from('signals').select('idea_id, source, url, title, sentiment, fetched_at').in('idea_id', ideaIds)
      : Promise.resolve({ data: [] }),
  ]);

  const exportPayload = {
    exported_at: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
    },
    profile: profileRes.data ?? null,
    subscription: subscriptionRes.data ?? null,
    ideas: ideasRes.data ?? [],
    decisions: decisionsRes.data ?? [],
    signals: signalsRes.data ?? [],
    outcomes: outcomesRes.data ?? [],
    decision_queue: queueRes.data ?? [],
  };

  return new NextResponse(JSON.stringify(exportPayload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="pledgeoff-export-${new Date().toISOString().split('T')[0]}.json"`,
      'X-Trace-Id': traceId,
    },
  });
}
