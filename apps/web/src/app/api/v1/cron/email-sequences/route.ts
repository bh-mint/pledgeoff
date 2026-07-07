import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { logger } from '@pledgeoff/observability';
import { sendSequenceEmail, type SequenceDay } from '@pledgeoff/adapters';
import { requireCronAuth } from '@/lib/cron-auth';

// Vercel Cron: daily at 9am UTC — sends sequence emails at day 3, 7, 14, 21 after signup.
// Each email is sent at most once per user per sequence day (UNIQUE constraint on email_sequences).
export async function GET(req: Request): Promise<Response> {
  const auth = requireCronAuth(req);
  if (!auth.ok) return Response.json({ error: auth.body }, { status: auth.status });

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    logger.error({ traceId: crypto.randomUUID() }, 'RESEND_API_KEY not set');
    return Response.json({ error: 'Server misconfiguration' }, { status: 503 });
  }

  if (process.env.DISABLE_EMAIL === 'true') {
    logger.info({ traceId: crypto.randomUUID() }, 'Email sequences disabled via DISABLE_EMAIL flag');
    return Response.json({ ok: true, skipped: true });
  }

  const traceId = crypto.randomUUID();
  const supabase = createSupabaseServiceClient();
  const SEQUENCE_DAYS: SequenceDay[] = [3, 7, 14, 21];

  let totalSent = 0;
  let totalSkipped = 0;
  const errors: string[] = [];

  for (const day of SEQUENCE_DAYS) {
    const windowStart = new Date(Date.now() - (day * 24 + 12) * 60 * 60 * 1000).toISOString();
    const windowEnd   = new Date(Date.now() - (day * 24 - 12) * 60 * 60 * 1000).toISOString();

    // Fetch profiles created within the 24h window for this sequence day
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .gte('created_at', windowStart)
      .lte('created_at', windowEnd);

    if (profilesError) {
      logger.error({ traceId, day, error: profilesError.message }, 'email_sequences.profiles_fetch_failed');
      errors.push(`day${day}: ${profilesError.message}`);
      continue;
    }

    if (!profiles || profiles.length === 0) continue;

    const userIds = profiles.map((p) => p.id);

    // Find already-sent entries for this day
    const { data: alreadySent, error: sentError } = await supabase
      .from('email_sequences')
      .select('user_id')
      .eq('sequence_day', day)
      .in('user_id', userIds);

    if (sentError) {
      logger.error({ traceId, day, error: sentError.message }, 'email_sequences.sent_fetch_failed');
      errors.push(`day${day}: ${sentError.message}`);
      continue;
    }

    const alreadySentIds = new Set((alreadySent ?? []).map((r) => r.user_id));
    const pending = profiles.filter((p) => !alreadySentIds.has(p.id));

    for (const profile of pending) {
      const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || undefined;

      const sent = await sendSequenceEmail(resendKey, {
        to: profile.email,
        name,
        day,
        traceId,
      });

      // No row on failure — the email was not delivered, so the DB must not claim it was
      if (!sent) {
        errors.push(`day${day} user ${profile.id}: resend send failed`);
        continue;
      }

      // Mark as sent — UNIQUE constraint prevents duplicates on race conditions
      const { error: insertError } = await supabase
        .from('email_sequences')
        .insert({ user_id: profile.id, sequence_day: day });

      if (insertError && !insertError.message.includes('duplicate')) {
        logger.error({ traceId, day, userId: profile.id, error: insertError.message }, 'email_sequences.insert_failed');
        errors.push(`day${day} user ${profile.id}: ${insertError.message}`);
      } else {
        totalSent++;
      }
    }

    totalSkipped += alreadySentIds.size;
  }

  logger.info({ traceId, totalSent, totalSkipped, errors }, 'email_sequences.completed');

  return Response.json({
    ok: errors.length === 0,
    traceId,
    totalSent,
    totalSkipped,
    ...(errors.length > 0 ? { errors } : {}),
  });
}
