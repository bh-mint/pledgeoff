import { z } from 'zod';
import { container } from '@/lib/container';
import { TeamForbiddenError, TeamNotFoundError } from '@pledgeoff/core';
import { resolveUserId } from '@/lib/api-auth';

const ParamsSchema = z.object({
  membershipId: z.string().uuid(),
});

// DELETE /api/v1/teams/members/[membershipId]
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();

  const callerId = await resolveUserId(req.headers.get('authorization'));
  if (!callerId) {
    return Response.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401, headers: { 'X-Trace-Id': traceId } });
  }

  const { userId: membershipId } = await params;
  const parsed = ParamsSchema.safeParse({ membershipId });
  if (!parsed.success) {
    return Response.json({ error: { code: 'INVALID_MEMBERSHIP_ID' } }, { status: 400, headers: { 'X-Trace-Id': traceId } });
  }

  const result = await container.removeTeamMemberUseCase.execute({
    ownerId: callerId,
    membershipId: parsed.data.membershipId,
    traceId,
  });

  if (result.isErr()) {
    const error = result.error;
    if (error instanceof TeamForbiddenError) {
      return Response.json({ error: { code: 'FORBIDDEN', message: error.message } }, { status: 403, headers: { 'X-Trace-Id': traceId } });
    }
    if (error instanceof TeamNotFoundError) {
      return Response.json({ error: { code: 'NOT_FOUND' } }, { status: 404, headers: { 'X-Trace-Id': traceId } });
    }
    return Response.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }

  return new Response(null, { status: 204, headers: { 'X-Trace-Id': traceId } });
}
