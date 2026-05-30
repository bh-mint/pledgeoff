import { Result, ok, err } from 'neverthrow';
import type { ITeamRepository } from '../ports/team-repository';
import {
  TeamForbiddenError,
  TeamNotFoundError,
  TeamUnauthorizedRoleChangeError,
  TeamRepositoryError,
  type TeamMembership,
} from '../domain/team';

export type UpdateMemberRoleInput = {
  /** Must be the team owner — only owners can promote/demote. */
  callerId: string;
  membershipId: string;
  newRole: 'admin' | 'member';
  traceId: string;
};

export type UpdateMemberRoleError =
  | TeamForbiddenError
  | TeamNotFoundError
  | TeamUnauthorizedRoleChangeError
  | TeamRepositoryError;

export class UpdateMemberRoleUseCase {
  constructor(private readonly teamRepo: ITeamRepository) {}

  async execute(
    input: UpdateMemberRoleInput,
  ): Promise<Result<TeamMembership, UpdateMemberRoleError>> {
    const { callerId, membershipId, newRole } = input;

    // Only the team owner can change roles
    const teamResult = await this.teamRepo.findByOwnerId(callerId);
    if (teamResult.isErr()) return err(teamResult.error);
    if (!teamResult.value) return err(new TeamForbiddenError('Only the team owner can change member roles'));

    const membershipsResult = await this.teamRepo.findMembershipsByTeamId(teamResult.value.id);
    if (membershipsResult.isErr()) return err(membershipsResult.error);

    const membership = membershipsResult.value.find((m) => m.id === membershipId);
    if (!membership) return err(new TeamNotFoundError('Membership not found in your team'));
    if (membership.role === 'owner') {
      return err(new TeamUnauthorizedRoleChangeError('Cannot change the owner\'s role'));
    }
    if (membership.status !== 'active') {
      return err(new TeamUnauthorizedRoleChangeError('Can only change role of active members'));
    }

    const now = new Date().toISOString();
    const updateResult = await this.teamRepo.updateMembershipRole(membershipId, newRole, now);
    if (updateResult.isErr()) return err(updateResult.error);

    return ok(updateResult.value);
  }
}
