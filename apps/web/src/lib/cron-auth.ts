// requireCronAuth — shared helper for all cron endpoints.
// CRON_SECRET must be set and match the Authorization header exactly.
// The secret is the only auth layer: crons are triggered by GitHub Actions
// (external to Vercel), so origin-based checks like x-vercel-forwarded-for
// cannot distinguish legitimate callers — Vercel's proxy adds that header
// to every incoming request anyway.
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

  return { ok: true };
}
