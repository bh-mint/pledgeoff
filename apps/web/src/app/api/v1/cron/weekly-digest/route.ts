// Vercel Cron: Mondays 08:00 UTC — sends weekly digest to users with weekly_digest=true (plan: team+)
export const maxDuration = 60;

import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { getUserPlan } from '@/server/billing/getUserPlan';
import { logger } from '@pledgeoff/observability';
import { requireCronAuth } from '@/lib/cron-auth';
import { sendWeeklyDigestEmail, type WeeklyDigestIdea } from '@pledgeoff/adapters';

const TEAM_PLUS_PLANS = ['team', 'studio', 'enterprise'];

export async function GET(req: Request): Promise<Response> {
  const auth = requireCronAuth(req);
  if (!auth.ok) return Response.json({ error: auth.body }, { status: auth.status });

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    logger.error({ traceId: 'weekly-digest' }, 'RESEND_API_KEY not set');
    return Response.json({ error: 'Server misconfiguration' }, { status: 503 });
  }

  if (process.env.DISABLE_EMAIL === 'true') {
    logger.info({ traceId: 'weekly-digest' }, 'Email disabled via DISABLE_EMAIL flag');
    return Response.json({ ok: true, skipped: true });
  }

  const traceId = crypto.randomUUID();
  const supabase = createSupabaseServiceClient();
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Find users who opted in to weekly_digest
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, notification_preferences')
    .filter('notification_preferences->>weekly_digest', 'eq', 'true');

  if (profilesError) {
    logger.error({ traceId, target: 'weekly-digest', outcome: 'error' }, profilesError.message);
    return Response.json({ error: 'DB query failed' }, { status: 500 });
  }

  if (!profiles || profiles.length === 0) {
    logger.info({ traceId, target: 'weekly-digest', outcome: 'success', sent: 0 }, 'No subscribers for weekly digest');
    return Response.json({ sent: 0 });
  }

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const profile of profiles) {
    try {
      // Plan gate: team+ only
      const plan = await getUserPlan(profile.id);
      if (!TEAM_PLUS_PLANS.includes(plan)) { skipped++; continue; }

      // Get ideas active this week (created or with tool activity)
      const { data: ideas } = await supabase
        .from('ideas')
        .select('id, text, created_at')
        .eq('user_id', profile.id)
        .gte('created_at', weekStart)
        .order('created_at', { ascending: false })
        .limit(10);

      const digestIdeas: WeeklyDigestIdea[] = [];

      for (const idea of ideas ?? []) {
        // Fetch latest decision for verdict+score
        const { data: decision } = await supabase
          .from('decisions')
          .select('verdict, score')
          .eq('idea_id', idea.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Count which tools ran this week
        const [compRes, mktRes, battleRes] = await Promise.all([
          supabase.from('competitor_analyses').select('id').eq('idea_id', idea.id).gte('created_at', weekStart).limit(1),
          supabase.from('market_landscapes').select('id').eq('idea_id', idea.id).gte('created_at', weekStart).limit(1),
          supabase.from('battlecards').select('id').eq('idea_id', idea.id).gte('created_at', weekStart).limit(1),
        ]);

        const toolsRun: string[] = [];
        if ((compRes.data?.length ?? 0) > 0) toolsRun.push('Competitors');
        if ((mktRes.data?.length ?? 0) > 0) toolsRun.push('Market Landscape');
        if ((battleRes.data?.length ?? 0) > 0) toolsRun.push('Battlecard');

        digestIdeas.push({
          id: idea.id,
          text: idea.text,
          verdict: decision?.verdict as WeeklyDigestIdea['verdict'] ?? undefined,
          score: decision?.score ?? undefined,
          toolsRun,
        });
      }

      const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || undefined;
      await sendWeeklyDigestEmail(resendKey, {
        to: profile.email,
        name,
        ideas: digestIdeas,
        weekStart,
        traceId,
      });
      sent++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown';
      errors.push(`user:${profile.id} — ${msg}`);
      logger.error({ traceId, target: 'weekly-digest', userId: profile.id, outcome: 'error' }, msg);
    }
  }

  logger.info({ traceId, target: 'weekly-digest', outcome: 'success', sent, skipped, errors: errors.length }, 'Weekly digest complete');
  if (errors.length > 0) {
    logger.error({ traceId, target: 'weekly-digest', errors }, 'Some weekly digests failed');
  }

  return Response.json({ sent, skipped, errors: errors.length > 0 ? errors : undefined });
}
