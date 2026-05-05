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
        userId: string;
        text: string;
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
  if (record?.event_type !== 'idea.created.v1') {
    return Response.json({ ok: true, skipped: true }, { status: 200 });
  }

  const { ideaId, text: ideaText } = record.payload.payload;
  const traceId = record.payload.traceId;
  const eventId = record.event_id;

  logger.info({ traceId, ideaId, action: 'webhook_idea_created' }, 'Webhook: fetching signals');

  const result = await container.fetchSignalsUseCase.execute({ ideaId, ideaText, traceId, eventId });

  if (result.isErr()) {
    logger.error(
      { traceId, ideaId, action: 'webhook_idea_created', outcome: 'error', error: result.error },
      'Webhook: FetchSignals failed',
    );
    return Response.json({ error: 'Processing failed' }, { status: 500 });
  }

  logger.info(
    { traceId, ideaId, signalCount: result.value.length, action: 'webhook_idea_created', outcome: 'success' },
    'Webhook: signals fetched',
  );

  return Response.json({ ok: true, signalCount: result.value.length }, { status: 200 });
}
