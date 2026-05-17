import { container } from '@/lib/container';

export const maxDuration = 30;

// Called by Vercel Cron every minute to retry unprocessed outbox events.
// Protected by CRON_SECRET to prevent unauthorized calls.
export async function GET(req: Request): Promise<Response> {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stats = await container.eventBus.processEvents();

  return Response.json({ ok: true, ...stats });
}
