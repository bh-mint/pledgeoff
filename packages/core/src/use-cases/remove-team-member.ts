import { Result, ok, err } from 'neverthrow';
import type { ITeamRepository } from '../ports/team-repository';
import {
  TeamForbiddenError,
  TeamNotFoundError,
  TeamRepositoryError,
} from '../domain/team';

export type RemoveTeamMemberInput = {
  /** The user performing the removal — either the team owner or an admin member. */
  callerId: string;
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
    const { callerId, membershipId } = input;

    // Determine caller role: owner or admin
    const ownerTeamResult = await this.teamRepo.findByOwnerId(callerId);
    if (ownerTeamResult.isErr()) return err(ownerTeamResult.error);

    let teamId: string;
    let callerIsOwner: boolean;

    if (ownerTeamResult.value) {
      teamId = ownerTeamResult.value.id;
      callerIsOwner = true;
    } else {
      const memberTeamResult = await this.teamRepo.findByMemberId(callerId);
      if (memberTeamResult.isErr()) return err(memberTeamResult.error);
      if (!memberTeamResult.value) return err(new TeamNotFoundError('Caller has no team'));

      teamId = memberTeamResult.value.id;

      const callerMembershipResult = await this.teamRepo.findMembershipByUserId(teamId, callerId);
      if (callerMembershipResult.isErr()) return err(callerMembershipResult.error);
      const callerMembership = callerMembershipResult.value;
      if (!callerMembership || callerMembership.role !== 'admin') {
        return err(new TeamForbiddenError('Only team owners and admins can remove members'));
      }
      callerIsOwner = false;
    }

    const membershipsResult = await this.teamRepo.findMembershipsByTeamId(teamId);
    if (membershipsResult.isErr()) return err(membershipsResult.error);

    const membership = membershipsResult.value.find((m) => m.id === membershipId);
    if (!membership) return err(new TeamForbiddenError('Membership not found in your team'));
    if (membership.role === 'owner') return err(new TeamForbiddenError('Cannot remove team owner'));
    // Admins can only remove plain members — not other admins
    if (!callerIsOwner && membership.role === 'admin') {
      return err(new TeamForbiddenError('Admins cannot remove other admins'));
    }

    const now = new Date().toISOString();
    const updateResult = await this.teamRepo.updateMembership({
      ...membership,
      status: 'removed',
      leftAt: now,
      removedBy: callerId,
      removalReason: 'removed_by_owner',
      updatedAt: now,
    });
    if (updateResult.isErr()) return err(updateResult.error);

    return ok(undefined);
  }
}
