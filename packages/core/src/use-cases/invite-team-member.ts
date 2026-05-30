import { Result, ok, err } from 'neverthrow';
import type { ITeamRepository } from '../ports/team-repository';
import {
  createTeam,
  createPendingMembership,
  TeamSeatLimitError,
  TeamMemberAlreadyExistsError,
  TeamForbiddenError,
  TeamRepositoryError,
  type TeamMembership,
} from '../domain/team';

export type InviteTeamMemberInput = {
  /** The user performing the invite — either the team owner or an admin member. */
  callerId: string;
  /** Total seats allowed = plan included + extra purchased. Computed by caller via effectiveSeats(). */
  maxSeats: number;
  invitedEmail: string;
  traceId: string;
};

export type InviteTeamMemberError =
  | TeamSeatLimitError
  | TeamMemberAlreadyExistsError
  | TeamForbiddenError
  | TeamRepositoryError;

export class InviteTeamMemberUseCase {
  constructor(private readonly teamRepo: ITeamRepository) {}

  async execute(
    input: InviteTeamMemberInput,
  ): Promise<Result<TeamMembership, InviteTeamMemberError>> {
    const { callerId, maxSeats, invitedEmail } = input;
    const normalizedEmail = invitedEmail.toLowerCase().trim();
    const limit = maxSeats;

    // Resolve team: caller is owner or admin
    const ownerTeamResult = await this.teamRepo.findByOwnerId(callerId);
    if (ownerTeamResult.isErr()) return err(ownerTeamResult.error);

    let team = ownerTeamResult.value;
    let callerIsOwner = !!team;

    if (!team) {
      // Check if caller is an active admin member of a team
      const memberTeamResult = await this.teamRepo.findByMemberId(callerId);
      if (memberTeamResult.isErr()) return err(memberTeamResult.error);
      if (!memberTeamResult.value) {
        // No team exists yet for this caller — create one (legacy path for first invite)
        const newTeam = createTeam({ ownerId: callerId, name: 'My Team' });
        const saveResult = await this.teamRepo.saveTeam(newTeam);
        if (saveResult.isErr()) return err(saveResult.error);
        team = saveResult.value;
        callerIsOwner = true;
      } else {
        team = memberTeamResult.value;
        // Verify caller has admin role
        const callerMembershipResult = await this.teamRepo.findMembershipByUserId(team.id, callerId);
        if (callerMembershipResult.isErr()) return err(callerMembershipResult.error);
        const callerMembership = callerMembershipResult.value;
        if (!callerMembership || callerMembership.role !== 'admin') {
          return err(new TeamForbiddenError('Only team owners and admins can invite members'));
        }
      }
    }

    void callerIsOwner; // used for context — seat limit check applies to all callers

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
