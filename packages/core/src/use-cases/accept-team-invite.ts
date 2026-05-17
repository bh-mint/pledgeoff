import { Result, ok, err } from 'neverthrow';
import type { ITeamRepository } from '../ports/team-repository';
import {
  TeamInviteNotFoundError,
  TeamNotFoundError,
  TeamRepositoryError,
  UserAlreadyInTeamError,
  type Team,
  type TeamMembership,
} from '../domain/team';

export type AcceptTeamInviteInput = {
  inviteToken: string;
  userId: string;
  traceId: string;
};

export type AcceptTeamInviteError =
  | TeamInviteNotFoundError
  | TeamNotFoundError
  | UserAlreadyInTeamError
  | TeamRepositoryError;

export type AcceptTeamInviteResult = {
  team: Team;
  membership: TeamMembership;
};

export class AcceptTeamInviteUseCase {
  constructor(private readonly teamRepo: ITeamRepository) {}

  async execute(
    input: AcceptTeamInviteInput,
  ): Promise<Result<AcceptTeamInviteResult, AcceptTeamInviteError>> {
    const { inviteToken, userId } = input;

    // Block if user is already an active member in another team
    const existingMembershipResult = await this.teamRepo.findByMemberId(userId);
    if (existingMembershipResult.isErr()) return err(existingMembershipResult.error);
    if (existingMembershipResult.value) {
      return err(new UserAlreadyInTeamError());
    }

    const membershipResult = await this.teamRepo.findMembershipByToken(inviteToken);
    if (membershipResult.isErr()) return err(membershipResult.error);

    const membership = membershipResult.value;
    if (!membership || membership.status !== 'pending') {
      return err(new TeamInviteNotFoundError('Invite not found or already used'));
    }

    const now = new Date().toISOString();
    const updated: TeamMembership = {
      ...membership,
      userId,
      status: 'active',
      acceptedAt: now,
      updatedAt: now,
    };

    const updateResult = await this.teamRepo.updateMembership(updated);
    if (updateResult.isErr()) return err(updateResult.error);

    const teamResult = await this.teamRepo.findById(membership.teamId);
    if (teamResult.isErr()) return err(teamResult.error);
    if (!teamResult.value) return err(new TeamNotFoundError('Team not found'));

    return ok({ team: teamResult.value, membership: updateResult.value });
  }
}
