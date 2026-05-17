import { z } from 'zod';
import { container } from '@/lib/container';
import { resolveUserId } from '@/lib/api-auth';
import { TeamNotFoundError, TeamForbiddenError } from '@pledgeoff/core';

function unauth(traceId: string) {
  return Response.json(
    { error: { code: 'UNAUTHENTICATED' } },
    { status: 401, headers: { 'X-Trace-Id': traceId } },
  );
}

const UpdateTeamNameSchema = z.object({
  name: z.string().min(1).max(100),
});

// GET /api/v1/teams/me — returns team + memberships for the authenticated user
export async function GET(req: Request) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();
  const userId = await resolveUserId(req.headers.get('authorization'));
  if (!userId) return unauth(traceId);

  // Check if user is owner
  const ownerTeamResult = await container.teamRepo.findByOwnerId(userId);
  if (ownerTeamResult.isErr()) {
    return Response.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }

  let team = ownerTeamResult.value;

  // Check if user is member of someone else's team
  if (!team) {
    const memberTeamResult = await container.teamRepo.findByMemberId(userId);
    if (memberTeamResult.isErr()) {
      return Response.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
    }
    team = memberTeamResult.value;
  }

  if (!team) {
    return Response.json({ data: { team: null, memberships: [], isOwner: true } }, { status: 200, headers: { 'X-Trace-Id': traceId } });
  }

  const membershipsResult = await container.teamRepo.findMembershipsByTeamId(team.id);
  if (membershipsResult.isErr()) {
    return Response.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }

  return Response.json(
    { data: { team, memberships: membershipsResult.value, isOwner: team.ownerId === userId } },
    { status: 200, headers: { 'X-Trace-Id': traceId } },
  );
}

// PATCH /api/v1/teams — update team name (owner only)
export async function PATCH(req: Request) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();
  const userId = await resolveUserId(req.headers.get('authorization'));
  if (!userId) return unauth(traceId);

  const body = await req.json() as unknown;
  const parsed = UpdateTeamNameSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: { code: 'VALIDATION_FAILED', details: parsed.error.flatten() } },
      { status: 400, headers: { 'X-Trace-Id': traceId } },
    );
  }

  const result = await container.updateTeamNameUseCase.execute({
    ownerId: userId,
    name: parsed.data.name,
    traceId,
  });

  if (result.isErr()) {
    const e = result.error;
    if (e instanceof TeamNotFoundError) {
      return Response.json({ error: { code: 'TEAM_NOT_FOUND' } }, { status: 404, headers: { 'X-Trace-Id': traceId } });
    }
    if (e instanceof TeamForbiddenError) {
      return Response.json({ error: { code: 'FORBIDDEN' } }, { status: 403, headers: { 'X-Trace-Id': traceId } });
    }
    return Response.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }

  return Response.json({ data: { team: result.value } }, { status: 200, headers: { 'X-Trace-Id': traceId } });
}
