import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { logger } from '@pledgeoff/observability';
import { resolveUserId } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();

  const userId = await resolveUserId(req.headers.get('authorization'));
  if (!userId) {
    return NextResponse.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401, headers: { 'X-Trace-Id': traceId } });
  }

  const result = await container.getOttoBalanceUseCase.execute(userId);
  if (result.isErr()) {
    logger.error({ traceId, userId, error: String(result.error) }, 'Failed to get Otto balance');
    return NextResponse.json({ error: { code: 'INTERNAL' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }

  return NextResponse.json({ data: result.value }, { status: 200, headers: { 'X-Trace-Id': traceId } });
}
