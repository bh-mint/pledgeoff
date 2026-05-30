import { container } from '@/lib/container';
import { resolveUserId } from '@/lib/api-auth';
import { DomainAllowlistNotFoundError, DomainAllowlistPlanError } from '@pledgeoff/core';

function unauth(traceId: string) {
  return Response.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401, headers: { 'X-Trace-Id': traceId } });
}

// DELETE /api/v1/teams/domain-allowlist/[domain]
export async function DELETE(req: Request, { params }: { params: Promise<{ domain: string }> }) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();
  const userId = await resolveUserId(req.headers.get('authorization'));
  if (!userId) return unauth(traceId);

  const { domain } = await params;

  const teamResult = await container.teamRepo.findByOwnerId(userId);
  if (teamResult.isErr()) return Response.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  const team = teamResult.value;
  if (!team) return Response.json({ error: { code: 'NO_TEAM' } }, { status: 404, headers: { 'X-Trace-Id': traceId } });

  const result = await container.removeDomainAllowlistUseCase.execute({
    teamId: team.id,
    domain: decodeURIComponent(domain),
    requesterId: userId,
    traceId,
  });

  if (result.isErr()) {
    const e = result.error;
    if (e instanceof DomainAllowlistPlanError) return Response.json({ error: { code: 'PLAN_REQUIRED', message: e.message } }, { status: 403, headers: { 'X-Trace-Id': traceId } });
    if (e instanceof DomainAllowlistNotFoundError) return Response.json({ error: { code: 'NOT_FOUND' } }, { status: 404, headers: { 'X-Trace-Id': traceId } });
    return Response.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }

  return new Response(null, { status: 204, headers: { 'X-Trace-Id': traceId } });
}
