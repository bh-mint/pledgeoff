import { z } from 'zod';
import { container } from '@/lib/container';
import { TeamInviteNotFoundError } from '@pledgeoff/core';
import { resolveUserId } from '@/lib/api-auth';

const AcceptSchema = z.object({
  token: z.string().uuid(),
});

// POST /api/v1/teams/accept
export async function POST(req: Request) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();

  const userId = await resolveUserId(req.headers.get('authorization'));
  if (!userId) {
    return Response.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401, headers: { 'X-Trace-Id': traceId } });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return Response.json({ error: { code: 'INVALID_JSON' } }, { status: 400, headers: { 'X-Trace-Id': traceId } });
  }

  const parsed = AcceptSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: { code: 'VALIDATION_FAILED', details: parsed.error.flatten() } }, { status: 400, headers: { 'X-Trace-Id': traceId } });
  }

  const result = await container.acceptTeamInviteUseCase.execute({
    inviteToken: parsed.data.token,
    userId,
    traceId,
  });

  if (result.isErr()) {
    const error = result.error;
    if (error instanceof TeamInviteNotFoundError) {
      return Response.json({ error: { code: 'INVITE_NOT_FOUND' } }, { status: 404, headers: { 'X-Trace-Id': traceId } });
    }
    return Response.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }

  return Response.json({ data: result.value }, { status: 200, headers: { 'X-Trace-Id': traceId } });
}
