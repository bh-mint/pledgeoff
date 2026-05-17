import { container } from '@/lib/container';
import { LeaveTeamNotMemberError } from '@pledgeoff/core';
import { resolveUserId } from '@/lib/api-auth';

// DELETE /api/v1/teams/leave — active member leaves their team voluntarily
export async function DELETE(req: Request) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();

  const userId = await resolveUserId(req.headers.get('authorization'));
  if (!userId) {
    return Response.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401, headers: { 'X-Trace-Id': traceId } });
  }

  const result = await container.leaveTeamUseCase.execute({ userId, traceId });

  if (result.isErr()) {
    const error = result.error;
    if (error instanceof LeaveTeamNotMemberError) {
      return Response.json({ error: { code: 'NOT_A_MEMBER' } }, { status: 404, headers: { 'X-Trace-Id': traceId } });
    }
    return Response.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }

  return new Response(null, { status: 204, headers: { 'X-Trace-Id': traceId } });
}
