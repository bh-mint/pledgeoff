import { container } from '@/lib/container';
import { TeamNotFoundError, TeamForbiddenError } from '@pledgeoff/core';
import { logger } from '@pledgeoff/observability';
import { resolveUserId } from '@/lib/api-auth';

// POST /api/v1/teams/invite-link — generate (or regenerate) workspace invite link
export async function POST(req: Request): Promise<Response> {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();

  const userId = await resolveUserId(req.headers.get('authorization'));
  if (!userId) {
    return Response.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401, headers: { 'X-Trace-Id': traceId } });
  }

  const result = await container.generateInviteLinkUseCase.execute({ ownerId: userId, traceId });

  if (result.isErr()) {
    const error = result.error;
    if (error instanceof TeamNotFoundError) {
      return Response.json({ error: { code: 'TEAM_NOT_FOUND', message: 'You must invite at least one member to activate your team first.' } }, { status: 404, headers: { 'X-Trace-Id': traceId } });
    }
    if (error instanceof TeamForbiddenError) {
      return Response.json({ error: { code: 'FORBIDDEN' } }, { status: 403, headers: { 'X-Trace-Id': traceId } });
    }
    logger.error({ traceId, userId, outcome: 'error' as const }, 'teams/invite-link POST: unexpected error');
    return Response.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }

  const origin = req.headers.get('origin') ?? 'https://pledgeoff.com';
  const link = result.value;
  return Response.json(
    { data: { link, url: `${origin}/join/${link.token}` } },
    { status: 201, headers: { 'X-Trace-Id': traceId } },
  );
}

// DELETE /api/v1/teams/invite-link — revoke current invite link
export async function DELETE(req: Request): Promise<Response> {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();

  const userId = await resolveUserId(req.headers.get('authorization'));
  if (!userId) {
    return Response.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401, headers: { 'X-Trace-Id': traceId } });
  }

  const teamResult = await container.teamRepo.findByOwnerId(userId);
  if (teamResult.isErr()) {
    return Response.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }
  if (!teamResult.value) {
    return Response.json({ error: { code: 'TEAM_NOT_FOUND' } }, { status: 404, headers: { 'X-Trace-Id': traceId } });
  }

  const linkResult = await container.teamRepo.findInviteLinkByTeamId(teamResult.value.id);
  if (linkResult.isErr()) {
    return Response.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }

  if (!linkResult.value || linkResult.value.revokedAt) {
    return Response.json({ data: { revoked: false } }, { status: 200, headers: { 'X-Trace-Id': traceId } });
  }

  const revokeResult = await container.teamRepo.revokeInviteLink(
    linkResult.value.id,
    new Date().toISOString(),
  );
  if (revokeResult.isErr()) {
    return Response.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }

  return Response.json({ data: { revoked: true } }, { status: 200, headers: { 'X-Trace-Id': traceId } });
}

// GET /api/v1/teams/invite-link — get current invite link for owner
export async function GET(req: Request): Promise<Response> {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();

  const userId = await resolveUserId(req.headers.get('authorization'));
  if (!userId) {
    return Response.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401, headers: { 'X-Trace-Id': traceId } });
  }

  const teamResult = await container.teamRepo.findByOwnerId(userId);
  if (teamResult.isErr()) {
    return Response.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }
  if (!teamResult.value) {
    return Response.json({ data: { link: null } }, { status: 200, headers: { 'X-Trace-Id': traceId } });
  }

  const linkResult = await container.teamRepo.findInviteLinkByTeamId(teamResult.value.id);
  if (linkResult.isErr()) {
    return Response.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }

  const link = linkResult.value;
  const activeLink = link && !link.revokedAt && new Date(link.expiresAt) > new Date() ? link : null;
  const origin = req.headers.get('origin') ?? 'https://pledgeoff.com';

  return Response.json(
    { data: { link: activeLink, url: activeLink ? `${origin}/join/${activeLink.token}` : null } },
    { status: 200, headers: { 'X-Trace-Id': traceId } },
  );
}
