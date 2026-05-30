import { z } from 'zod';
import { container } from '@/lib/container';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { sendTeamInviteEmail } from '@pledgeoff/adapters';
import { TeamSeatLimitError, TeamMemberAlreadyExistsError, TeamForbiddenError } from '@pledgeoff/core';
import { effectiveSeats } from '@pledgeoff/core';
import { logger } from '@pledgeoff/observability';
import { resolveUserId } from '@/lib/api-auth';

const InviteSchema = z.object({
  email: z.string().email(),
});

// POST /api/v1/teams/invite
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

  const parsed = InviteSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: { code: 'VALIDATION_FAILED', details: parsed.error.flatten() } }, { status: 400, headers: { 'X-Trace-Id': traceId } });
  }

  // Resolve the team owner's user ID for seat-limit lookup.
  // If the caller is the owner, ownerId === userId.
  // If the caller is an admin member, we need the team's actual owner.
  let ownerId = userId;
  const ownerTeamResult = await container.teamRepo.findByOwnerId(userId);
  if (ownerTeamResult.isErr()) {
    logger.error({ traceId, userId, outcome: 'error' as const }, 'teams/invite: owner team lookup failed');
    return Response.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }
  if (!ownerTeamResult.value) {
    // Caller is not the owner — try finding their team as a member
    const memberTeamResult = await container.teamRepo.findByMemberId(userId);
    if (memberTeamResult.isErr()) {
      return Response.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
    }
    if (memberTeamResult.value) {
      ownerId = memberTeamResult.value.ownerId;
    }
  }

  // Get owner's plan + effective seats (base included + extra purchased)
  const subResult = await container.subscriptionRepo.findByUserId(ownerId);
  if (subResult.isErr()) {
    logger.error({ traceId, userId, ownerId, outcome: 'error' as const }, 'teams/invite: subscription lookup failed');
    return Response.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }
  const sub = subResult.value;
  const maxSeats = sub ? effectiveSeats(sub) : 1;

  // Get inviter email for the invite email
  const { data: userData } = await createSupabaseServiceClient().auth.admin.getUserById(userId);
  const inviterEmail = userData?.user?.email ?? 'Your teammate';

  const result = await container.inviteTeamMemberUseCase.execute({
    callerId: userId,
    maxSeats,
    invitedEmail: parsed.data.email,
    traceId,
  });

  if (result.isErr()) {
    const error = result.error;
    if (error instanceof TeamForbiddenError) {
      return Response.json({ error: { code: 'FORBIDDEN', message: error.message } }, { status: 403, headers: { 'X-Trace-Id': traceId } });
    }
    if (error instanceof TeamSeatLimitError) {
      return Response.json({ error: { code: 'SEAT_LIMIT_REACHED', message: error.message } }, { status: 403, headers: { 'X-Trace-Id': traceId } });
    }
    if (error instanceof TeamMemberAlreadyExistsError) {
      return Response.json({ error: { code: 'ALREADY_MEMBER', message: error.message } }, { status: 409, headers: { 'X-Trace-Id': traceId } });
    }
    return Response.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }

  const membership = result.value;

  // Send invite email (fire-and-forget — don't fail the request if email fails)
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const teamResult = await container.teamRepo.findByOwnerId(userId);
    const teamName = teamResult.isOk() && teamResult.value ? teamResult.value.name : 'My Team';
    sendTeamInviteEmail(resendKey, {
      to: parsed.data.email,
      inviterEmail,
      teamName,
      inviteToken: membership.inviteToken,
      traceId,
    }).catch(() => undefined);
  }

  return Response.json({ data: { membership } }, { status: 201, headers: { 'X-Trace-Id': traceId } });
}
