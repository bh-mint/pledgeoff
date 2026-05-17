import { Result, ok, err } from 'neverthrow';
import type { ITeamRepository } from '../ports/team-repository';
import {
  TeamForbiddenError,
  TeamNotFoundError,
  TeamRepositoryError,
} from '../domain/team';

export type RemoveTeamMemberInput = {
  ownerId: string;
  membershipId: string;
  traceId: string;
};

export type RemoveTeamMemberError =
  | TeamForbiddenError
  | TeamNotFoundError
  | TeamRepositoryError;

export class RemoveTeamMemberUseCase {
  constructor(private readonly teamRepo: ITeamRepository) {}

  async execute(
    input: RemoveTeamMemberInput,
  ): Promise<Result<void, RemoveTeamMemberError>> {
    const { ownerId, membershipId } = input;

    // Verify caller owns the team this membership belongs to
    const teamResult = await this.teamRepo.findByOwnerId(ownerId);
    if (teamResult.isErr()) return err(teamResult.error);
    if (!teamResult.value) return err(new TeamNotFoundError('Caller has no team'));

    const membershipsResult = await this.teamRepo.findMembershipsByTeamId(teamResult.value.id);
    if (membershipsResult.isErr()) return err(membershipsResult.error);

    const membership = membershipsResult.value.find((m) => m.id === membershipId);
    if (!membership) return err(new TeamForbiddenError('Membership not found in your team'));
    if (membership.role === 'owner') return err(new TeamForbiddenError('Cannot remove team owner'));

    const deleteResult = await this.teamRepo.deleteMembership(membershipId);
    if (deleteResult.isErr()) return err(deleteResult.error);

    return ok(undefined);
  }
}
