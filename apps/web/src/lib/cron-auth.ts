// requireCronAuth — shared helper for all cron endpoints.
// Layer 1: CRON_SECRET must be set and match Authorization header.
// Layer 2: In production, Vercel always adds x-vercel-forwarded-for to cron
//          invocations. Requests missing this header are likely external attempts
//          with a leaked secret.
export type CronAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 503; body: string };

export function requireCronAuth(req: Request): CronAuthResult {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return { ok: false, status: 503, body: 'Server misconfiguration' };
  }

  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return { ok: false, status: 401, body: 'Unauthorized' };
  }

  // Extra layer in production: Vercel Cron requests always contain
  // x-vercel-forwarded-for. Manual calls (even with the right secret) won't
  // have this header if made outside Vercel infrastructure.
  if (process.env.NODE_ENV === 'production') {
    const vercelHeader = req.headers.get('x-vercel-forwarded-for');
    if (!vercelHeader) {
      return { ok: false, status: 401, body: 'Unauthorized' };
    }
  }

  return { ok: true };
}
