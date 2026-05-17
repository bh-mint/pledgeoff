import { Result, ok, err } from 'neverthrow';
import type { ITeamRepository } from '../ports/team-repository';
import {
  createTeam,
  createPendingMembership,
  TeamSeatLimitError,
  TeamMemberAlreadyExistsError,
  TeamRepositoryError,
  type TeamMembership,
} from '../domain/team';

export type InviteTeamMemberInput = {
  ownerId: string;
  /** Total seats allowed = plan included + extra purchased. Computed by caller via effectiveSeats(). */
  maxSeats: number;
  invitedEmail: string;
  traceId: string;
};

export type InviteTeamMemberError =
  | TeamSeatLimitError
  | TeamMemberAlreadyExistsError
  | TeamRepositoryError;

export class InviteTeamMemberUseCase {
  constructor(private readonly teamRepo: ITeamRepository) {}

  async execute(
    input: InviteTeamMemberInput,
  ): Promise<Result<TeamMembership, InviteTeamMemberError>> {
    const { ownerId, maxSeats, invitedEmail } = input;
    const normalizedEmail = invitedEmail.toLowerCase().trim();
    const limit = maxSeats;

    // Get or create the owner's team
    const teamResult = await this.teamRepo.findByOwnerId(ownerId);
    if (teamResult.isErr()) return err(teamResult.error);

    let team = teamResult.value;
    if (!team) {
      const newTeam = createTeam({ ownerId, name: 'My Team' });
      const saveResult = await this.teamRepo.saveTeam(newTeam);
      if (saveResult.isErr()) return err(saveResult.error);
      team = saveResult.value;
    }

    // Enforce seat limit (owner counts as 1)
    const countResult = await this.teamRepo.countActiveMembers(team.id);
    if (countResult.isErr()) return err(countResult.error);
    // +1 for the owner themselves
    if (countResult.value + 1 >= limit) {
      return err(new TeamSeatLimitError(limit));
    }

    // Check for duplicate invite
    const membershipsResult = await this.teamRepo.findMembershipsByTeamId(team.id);
    if (membershipsResult.isErr()) return err(membershipsResult.error);
    const existing = membershipsResult.value.find(
      (m) => m.invitedEmail === normalizedEmail,
    );
    if (existing) {
      return err(new TeamMemberAlreadyExistsError(normalizedEmail));
    }

    const membership = createPendingMembership({ teamId: team.id, invitedEmail: normalizedEmail });
    const saveResult = await this.teamRepo.saveMembership(membership);
    if (saveResult.isErr()) return err(saveResult.error);

    return ok(saveResult.value);
  }
}
