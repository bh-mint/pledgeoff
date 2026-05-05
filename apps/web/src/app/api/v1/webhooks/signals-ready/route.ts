import { container } from '@/lib/container';
import { logger } from '@pledgeoff/observability';

interface SupabaseWebhookPayload {
  type: string;
  table: string;
  record: {
    event_id: string;
    event_type: string;
    payload: {
      traceId: string;
      payload: {
        ideaId: string;
        signalIds: string[];
        signalCount: number;
      };
    };
  };
}

function isAuthorized(req: Request): boolean {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: SupabaseWebhookPayload;
  try {
    body = (await req.json()) as SupabaseWebhookPayload;
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const record = body.record;
  if (record?.event_type !== 'signals.fetched.v1') {
    return Response.json({ ok: true, skipped: true }, { status: 200 });
  }

  const { ideaId } = record.payload.payload;
  const traceId = record.payload.traceId;
  const eventId = record.event_id;

  logger.info({ traceId, ideaId, action: 'webhook_signals_ready' }, 'Webhook: generating decision');

  const ideaResult = await container._repos.ideaRepo.findById(ideaId);
  if (ideaResult.isErr() || !ideaResult.value) {
    logger.error({ traceId, ideaId, action: 'webhook_signals_ready', outcome: 'error' }, 'Webhook: idea not found');
    return Response.json({ error: 'Idea not found' }, { status: 404 });
  }

  const result = await container.decideUseCase.execute({
    ideaId,
    ideaText: ideaResult.value.text,
    traceId,
    eventId,
  });

  if (result.isErr()) {
    logger.error(
      { traceId, ideaId, action: 'webhook_signals_ready', outcome: 'error', error: result.error },
      'Webhook: DecideUseCase failed',
    );
    return Response.json({ error: 'Processing failed' }, { status: 500 });
  }

  logger.info(
    { traceId, ideaId, verdict: result.value.verdict, action: 'webhook_signals_ready', outcome: 'success' },
    'Webhook: decision generated',
  );

  return Response.json({ ok: true, verdict: result.value.verdict }, { status: 200 });
}
