import { container } from '@/lib/container';
import {
  TeamInviteLinkNotFoundError,
  TeamInviteLinkExpiredError,
  TeamInviteLinkRevokedError,
  TeamSeatLimitError,
  UserAlreadyInTeamError,
  effectiveSeats,
} from '@pledgeoff/core';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { logger } from '@pledgeoff/observability';
import { resolveUserId } from '@/lib/api-auth';

// POST /api/v1/teams/join/[token] — join a team via invite link
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();
  const { token } = await params;

  const userId = await resolveUserId(req.headers.get('authorization'));
  if (!userId) {
    return Response.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401, headers: { 'X-Trace-Id': traceId } });
  }

  // Get user email
  const { data: userData } = await createSupabaseServiceClient().auth.admin.getUserById(userId);
  const userEmail = userData?.user?.email ?? '';

  // Resolve team owner's subscription to get effective seat count
  const linkResult = await container.teamRepo.findInviteLinkByToken(token);
  if (linkResult.isErr()) {
    return Response.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }
  if (!linkResult.value) {
    return Response.json({ error: { code: 'INVITE_LINK_NOT_FOUND' } }, { status: 404, headers: { 'X-Trace-Id': traceId } });
  }

  const teamResult = await container.teamRepo.findById(linkResult.value.teamId);
  if (teamResult.isErr() || !teamResult.value) {
    return Response.json({ error: { code: 'TEAM_NOT_FOUND' } }, { status: 404, headers: { 'X-Trace-Id': traceId } });
  }

  const subResult = await container.subscriptionRepo.findByUserId(teamResult.value.ownerId);
  const sub = subResult.isOk() ? subResult.value : null;
  const maxSeats = sub ? effectiveSeats(sub) : 1;

  const result = await container.joinViaInviteLinkUseCase.execute({
    token,
    userId,
    userEmail,
    maxSeats,
    traceId,
  });

  if (result.isErr()) {
    const error = result.error;
    if (error instanceof TeamInviteLinkNotFoundError) {
      return Response.json({ error: { code: 'INVITE_LINK_NOT_FOUND' } }, { status: 404, headers: { 'X-Trace-Id': traceId } });
    }
    if (error instanceof TeamInviteLinkExpiredError) {
      return Response.json({ error: { code: 'INVITE_LINK_EXPIRED', message: 'This invite link has expired.' } }, { status: 410, headers: { 'X-Trace-Id': traceId } });
    }
    if (error instanceof TeamInviteLinkRevokedError) {
      return Response.json({ error: { code: 'INVITE_LINK_REVOKED', message: 'This invite link has been revoked.' } }, { status: 410, headers: { 'X-Trace-Id': traceId } });
    }
    if (error instanceof TeamSeatLimitError) {
      return Response.json({ error: { code: 'SEAT_LIMIT_REACHED', message: 'This team has reached its seat limit.' } }, { status: 403, headers: { 'X-Trace-Id': traceId } });
    }
    if (error instanceof UserAlreadyInTeamError) {
      return Response.json({ error: { code: 'ALREADY_IN_TEAM', message: 'You are already a member of a team.' } }, { status: 409, headers: { 'X-Trace-Id': traceId } });
    }
    logger.error({ traceId, userId, outcome: 'error' as const }, 'teams/join: unexpected error');
    return Response.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }

  return Response.json({ data: result.value }, { status: 200, headers: { 'X-Trace-Id': traceId } });
}

// GET /api/v1/teams/join/[token] — public: preview link info (team name, validity)
export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();
  const { token } = await params;

  const linkResult = await container.teamRepo.findInviteLinkByToken(token);
  if (linkResult.isErr()) {
    return Response.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }
  if (!linkResult.value) {
    return Response.json({ error: { code: 'INVITE_LINK_NOT_FOUND' } }, { status: 404, headers: { 'X-Trace-Id': traceId } });
  }

  const link = linkResult.value;
  const expired = new Date(link.expiresAt) < new Date();
  const revoked = !!link.revokedAt;

  const teamResult = await container.teamRepo.findById(link.teamId);
  const teamName = teamResult.isOk() && teamResult.value ? teamResult.value.name : 'a team';

  return Response.json(
    { data: { teamName, expiresAt: link.expiresAt, valid: !expired && !revoked, expired, revoked } },
    { status: 200, headers: { 'X-Trace-Id': traceId } },
  );
}
