import { container } from '@/lib/container';
import { resolveUserId } from '@/lib/api-auth';

function unauth(traceId: string) {
  return Response.json(
    { error: { code: 'UNAUTHENTICATED' } },
    { status: 401, headers: { 'X-Trace-Id': traceId } },
  );
}

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
