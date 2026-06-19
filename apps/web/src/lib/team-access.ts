import { container } from '@/lib/container';

/**
 * Returns true if requesterId is on the same team as ideaUserId.
 * Used to relax GET-only tool routes to team members without transferring billing ownership.
 */
export async function isTeamMember(ideaUserId: string, requesterId: string): Promise<boolean> {
  // Find which team the requester belongs to (owner or active member)
  const [memberResult, ownerResult] = await Promise.all([
    container.teamRepo.findByMemberId(requesterId),
    container.teamRepo.findByOwnerId(requesterId),
  ]);

  const requesterTeam =
    (memberResult.isOk() && memberResult.value) ||
    (ownerResult.isOk() && ownerResult.value) ||
    null;

  if (!requesterTeam) return false;

  // Idea owner is the team owner
  if (requesterTeam.ownerId === ideaUserId) return true;

  // Idea owner is an active member of that team
  const membershipsResult = await container.teamRepo.findMembershipsByTeamId(requesterTeam.id);
  if (membershipsResult.isErr()) return false;

  return membershipsResult.value.some(
    (m) => m.userId === ideaUserId && m.status === 'active',
  );
}
