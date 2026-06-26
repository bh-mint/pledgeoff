import { resolveUserIdFromRequest } from '@/lib/api-auth';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { getUserPlan } from '@/server/billing/getUserPlan';
import { sendSlackTestNotification } from '@pledgeoff/adapters';
import { logger } from '@pledgeoff/observability';
import { z } from 'zod';

const PatchSchema = z.object({
  webhookUrl: z.string().url().startsWith('https://hooks.slack.com/').nullable(),
  test: z.boolean().optional(),
});

export async function GET(req: Request): Promise<Response> {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();
  const userId = await resolveUserIdFromRequest(req);
  if (!userId) return Response.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401 });

  const supabase = createSupabaseServiceClient();
  const { data: team } = await supabase
    .from('teams')
    .select('slack_webhook_url')
    .eq('owner_id', userId)
    .maybeSingle();

  logger.info({ traceId, target: 'teams/slack-webhook', operation: 'GET', outcome: 'success' }, 'Slack webhook fetched');
  return Response.json({ data: { webhookUrl: (team?.slack_webhook_url as string | null) ?? null } });
}

export async function PATCH(req: Request): Promise<Response> {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();
  const userId = await resolveUserIdFromRequest(req);
  if (!userId) return Response.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401 });

  const plan = await getUserPlan(userId);
  const allowedPlans = ['team', 'studio', 'enterprise'];
  if (!allowedPlans.includes(plan)) {
    return Response.json({ error: { code: 'PLAN_GATE', requiredPlan: 'team' } }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: { code: 'VALIDATION_FAILED', details: parsed.error.flatten() } }, { status: 400 });
  }

  const { webhookUrl, test } = parsed.data;
  const supabase = createSupabaseServiceClient();

  // Only team owner can update webhook
  const { data: team, error: teamErr } = await supabase
    .from('teams')
    .update({ slack_webhook_url: webhookUrl })
    .eq('owner_id', userId)
    .select('id, slack_webhook_url')
    .maybeSingle();

  if (teamErr) {
    logger.error({ traceId, target: 'teams/slack-webhook', operation: 'PATCH', outcome: 'error' }, teamErr.message);
    return Response.json({ error: { code: 'INTERNAL' } }, { status: 500 });
  }

  if (!team) {
    return Response.json({ error: { code: 'NOT_FOUND', message: 'No team found for this user' } }, { status: 404 });
  }

  // If test=true and webhookUrl provided, send a test notification
  let testOk: boolean | undefined;
  if (test && webhookUrl) {
    testOk = await sendSlackTestNotification(webhookUrl, traceId);
  }

  logger.info({ traceId, target: 'teams/slack-webhook', operation: 'PATCH', outcome: 'success', test: testOk }, 'Slack webhook updated');
  return Response.json({ data: { webhookUrl: (team.slack_webhook_url as string | null) ?? null, testOk } });
}
