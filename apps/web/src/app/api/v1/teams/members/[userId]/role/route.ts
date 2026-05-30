import { z } from 'zod';
import { container } from '@/lib/container';
import { TeamForbiddenError, TeamNotFoundError, TeamUnauthorizedRoleChangeError } from '@pledgeoff/core';
import { resolveUserId } from '@/lib/api-auth';

const ParamsSchema = z.object({ membershipId: z.string().uuid() });
const BodySchema = z.object({ role: z.enum(['admin', 'member']) });

// PATCH /api/v1/teams/members/[membershipId]/role
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();

  const callerId = await resolveUserId(req.headers.get('authorization'));
  if (!callerId) {
    return Response.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401, headers: { 'X-Trace-Id': traceId } });
  }

  const { userId: membershipId } = await params;
  const parsedParams = ParamsSchema.safeParse({ membershipId });
  if (!parsedParams.success) {
    return Response.json({ error: { code: 'INVALID_MEMBERSHIP_ID' } }, { status: 400, headers: { 'X-Trace-Id': traceId } });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return Response.json({ error: { code: 'INVALID_JSON' } }, { status: 400, headers: { 'X-Trace-Id': traceId } });
  }

  const parsedBody = BodySchema.safeParse(body);
  if (!parsedBody.success) {
    return Response.json({ error: { code: 'VALIDATION_FAILED', details: parsedBody.error.flatten() } }, { status: 400, headers: { 'X-Trace-Id': traceId } });
  }

  const result = await container.updateMemberRoleUseCase.execute({
    callerId,
    membershipId: parsedParams.data.membershipId,
    newRole: parsedBody.data.role,
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
    if (error instanceof TeamUnauthorizedRoleChangeError) {
      return Response.json({ error: { code: 'UNAUTHORIZED_ROLE_CHANGE', message: error.message } }, { status: 422, headers: { 'X-Trace-Id': traceId } });
    }
    return Response.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }

  return Response.json({ data: { membership: result.value } }, { status: 200, headers: { 'X-Trace-Id': traceId } });
}
