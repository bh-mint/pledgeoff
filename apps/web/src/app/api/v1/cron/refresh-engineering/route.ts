import { container } from '@/lib/container';
import { logger } from '@pledgeoff/observability';
import { requireCronAuth } from '@/lib/cron-auth';

export const maxDuration = 60;

export async function GET(req: Request): Promise<Response> {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();

  const auth = requireCronAuth(req);
  if (!auth.ok) return Response.json({ error: auth.body }, { status: auth.status });

  const result = await container.refreshEngineeringSnapshotUseCase.execute({ traceId });
  if (result.isErr()) {
    logger.error({ traceId, error: result.error.message }, 'refresh-engineering cron failed');
    return Response.json({ error: { code: 'INTERNAL' } }, { status: 500 });
  }

  const { updated, failed } = result.value;
  logger.info({ traceId, updated, failed }, 'refresh-engineering cron complete');
  return Response.json({ data: { updated, failed } }, { status: 200 });
}
