import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { logger } from '@pledgeoff/observability';
import { sendOutcomeReminderEmail } from '@pledgeoff/adapters';
import { requireCronAuth } from '@/lib/cron-auth';

export const maxDuration = 60;

const REMINDER_DAYS = 30;
const VERDICTS = ['GO', 'KILL', 'PIVOT'] as const;
type Verdict = (typeof VERDICTS)[number];

function isVerdict(v: string): v is Verdict {
  return (VERDICTS as readonly string[]).includes(v);
}

// Daily at 10:00 UTC — asks users what happened with ideas that got a verdict
// ~30 days ago and have no reported outcome. Feeds the calibration flywheel
// (decision_outcomes → findCalibrationExamples).
export async function GET(req: Request): Promise<Response> {
  const auth = requireCronAuth(req);
  if (!auth.ok) return Response.json({ error: auth.body }, { status: auth.status });

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    logger.error({ traceId: crypto.randomUUID() }, 'RESEND_API_KEY not set');
    return Response.json({ error: 'Server misconfiguration' }, { status: 503 });
  }

  if (process.env.DISABLE_EMAIL === 'true') {
    logger.info({ traceId: crypto.randomUUID() }, 'Outcome reminders disabled via DISABLE_EMAIL flag');
    return Response.json({ ok: true, skipped: true });
  }

  const traceId = crypto.randomUUID();
  const supabase = createSupabaseServiceClient();

  // 48h window (12h before / 36h after day 30) — a failed send is retried on the
  // next daily run; outcome_reminder_sent_at prevents duplicates.
  const windowStart = new Date(Date.now() - (REMINDER_DAYS * 24 + 36) * 60 * 60 * 1000).toISOString();
  const windowEnd   = new Date(Date.now() - (REMINDER_DAYS * 24 - 12) * 60 * 60 * 1000).toISOString();

  const { data: decisions, error: decisionsError } = await supabase
    .from('decisions')
    .select('idea_id, verdict, created_at')
    .gte('created_at', windowStart)
    .lte('created_at', windowEnd);

  if (decisionsError) {
    logger.error({ traceId, error: decisionsError.message }, 'outcome_reminders.decisions_fetch_failed');
    return Response.json({ ok: false, traceId, error: decisionsError.message }, { status: 500 });
  }

  const ideaIds = [...new Set((decisions ?? []).map((d) => d.idea_id))];
  if (ideaIds.length === 0) {
    return Response.json({ ok: true, traceId, totalSent: 0, totalSkipped: 0 });
  }

  // Exclude ideas re-validated after the window — reminding about a superseded
  // verdict would be wrong; the newer decision gets its own window later.
  const { data: newerDecisions, error: newerError } = await supabase
    .from('decisions')
    .select('idea_id')
    .in('idea_id', ideaIds)
    .gt('created_at', windowEnd);

  if (newerError) {
    logger.error({ traceId, error: newerError.message }, 'outcome_reminders.newer_decisions_fetch_failed');
    return Response.json({ ok: false, traceId, error: newerError.message }, { status: 500 });
  }

  const supersededIds = new Set((newerDecisions ?? []).map((d) => d.idea_id));

  // Ideas still needing a reminder: no outcome reported, no reminder sent yet.
  const candidateIds = ideaIds.filter((id) => !supersededIds.has(id));
  if (candidateIds.length === 0) {
    return Response.json({ ok: true, traceId, totalSent: 0, totalSkipped: ideaIds.length });
  }

  const [{ data: ideas, error: ideasError }, { data: outcomes, error: outcomesError }] = await Promise.all([
    supabase
      .from('ideas')
      .select('id, user_id, text, outcome_reminder_sent_at')
      .in('id', candidateIds)
      .is('outcome_reminder_sent_at', null),
    supabase
      .from('decision_outcomes')
      .select('idea_id')
      .in('idea_id', candidateIds),
  ]);

  if (ideasError || outcomesError) {
    const message = ideasError?.message ?? outcomesError?.message ?? 'unknown';
    logger.error({ traceId, error: message }, 'outcome_reminders.ideas_fetch_failed');
    return Response.json({ ok: false, traceId, error: message }, { status: 500 });
  }

  const reportedIds = new Set((outcomes ?? []).map((o) => o.idea_id));
  const pending = (ideas ?? []).filter((i) => !reportedIds.has(i.id));

  let totalSent = 0;
  const totalSkipped = ideaIds.length - pending.length;
  const errors: string[] = [];

  const latestVerdictByIdea = new Map<string, { verdict: string; createdAt: string }>();
  for (const d of decisions ?? []) {
    const existing = latestVerdictByIdea.get(d.idea_id);
    if (!existing || d.created_at > existing.createdAt) {
      latestVerdictByIdea.set(d.idea_id, { verdict: d.verdict, createdAt: d.created_at });
    }
  }

  for (const idea of pending) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', idea.user_id)
      .single();

    if (profileError || !profile?.email) {
      logger.error({ traceId, ideaId: idea.id, error: profileError?.message ?? 'no email' }, 'outcome_reminders.profile_fetch_failed');
      errors.push(`idea ${idea.id}: profile fetch failed`);
      continue;
    }

    const rawVerdict = latestVerdictByIdea.get(idea.id)?.verdict ?? 'GO';
    const verdict: Verdict = isVerdict(rawVerdict) ? rawVerdict : 'GO';
    const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || undefined;
    const excerpt = idea.text.length > 140 ? `${idea.text.slice(0, 140)}…` : idea.text;

    const sent = await sendOutcomeReminderEmail(resendKey, {
      to: profile.email,
      name,
      ideaId: idea.id,
      ideaExcerpt: excerpt,
      verdict,
      traceId,
    });

    // No marker on failure — the email was not delivered, so the next run retries
    if (!sent) {
      errors.push(`idea ${idea.id}: resend send failed`);
      continue;
    }

    const { error: updateError } = await supabase
      .from('ideas')
      .update({ outcome_reminder_sent_at: new Date().toISOString() })
      .eq('id', idea.id);

    if (updateError) {
      logger.error({ traceId, ideaId: idea.id, error: updateError.message }, 'outcome_reminders.marker_update_failed');
      errors.push(`idea ${idea.id}: ${updateError.message}`);
    } else {
      totalSent++;
    }
  }

  logger.info({ traceId, totalSent, totalSkipped, errors }, 'outcome_reminders.completed');

  return Response.json({
    ok: errors.length === 0,
    traceId,
    totalSent,
    totalSkipped,
    ...(errors.length > 0 ? { errors } : {}),
  });
}
