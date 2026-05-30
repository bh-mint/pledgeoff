import { Result, ok, err } from 'neverthrow';
import type { ITeamRepository } from '../ports/team-repository';
import {
  TeamInviteLinkNotFoundError,
  TeamInviteLinkExpiredError,
  TeamInviteLinkRevokedError,
  TeamNotFoundError,
  TeamSeatLimitError,
  UserAlreadyInTeamError,
  TeamRepositoryError,
  type Team,
  type TeamMembership,
} from '../domain/team';

export type JoinViaInviteLinkInput = {
  token: string;
  userId: string;
  userEmail: string;
  maxSeats: number;
  traceId: string;
};

export type JoinViaInviteLinkError =
  | TeamInviteLinkNotFoundError
  | TeamInviteLinkExpiredError
  | TeamInviteLinkRevokedError
  | TeamNotFoundError
  | TeamSeatLimitError
  | UserAlreadyInTeamError
  | TeamRepositoryError;

export type JoinViaInviteLinkResult = {
  team: Team;
  membership: TeamMembership;
};

export class JoinViaInviteLinkUseCase {
  constructor(private readonly teamRepo: ITeamRepository) {}

  async execute(
    input: JoinViaInviteLinkInput,
  ): Promise<Result<JoinViaInviteLinkResult, JoinViaInviteLinkError>> {
    const { token, userId, userEmail, maxSeats } = input;

    // Block if user already in a team
    const existingTeamResult = await this.teamRepo.findByMemberId(userId);
    if (existingTeamResult.isErr()) return err(existingTeamResult.error);
    if (existingTeamResult.value) return err(new UserAlreadyInTeamError());

    const linkResult = await this.teamRepo.findInviteLinkByToken(token);
    if (linkResult.isErr()) return err(linkResult.error);
    if (!linkResult.value) return err(new TeamInviteLinkNotFoundError('Invite link not found'));

    const link = linkResult.value;
    if (link.revokedAt) return err(new TeamInviteLinkRevokedError('This invite link has been revoked'));
    if (new Date(link.expiresAt) < new Date()) return err(new TeamInviteLinkExpiredError('This invite link has expired'));

    const teamResult = await this.teamRepo.findById(link.teamId);
    if (teamResult.isErr()) return err(teamResult.error);
    if (!teamResult.value) return err(new TeamNotFoundError('Team not found'));

    // Block owner from joining their own team as member
    if (teamResult.value.ownerId === userId) return err(new UserAlreadyInTeamError());

    const countResult = await this.teamRepo.countActiveMembers(link.teamId);
    if (countResult.isErr()) return err(countResult.error);
    // +1 for owner
    if (countResult.value + 1 >= maxSeats) {
      return err(new TeamSeatLimitError(maxSeats));
    }

    const now = new Date().toISOString();
    const membership: TeamMembership = {
      id: crypto.randomUUID(),
      teamId: link.teamId,
      userId,
      invitedEmail: userEmail,
      role: 'member',
      status: 'active',
      inviteToken: crypto.randomUUID(),
      invitedAt: now,
      acceptedAt: now,
      leftAt: null,
      removedBy: null,
      removalReason: null,
      createdAt: now,
      updatedAt: now,
    };

    const saveResult = await this.teamRepo.saveMembership(membership);
    if (saveResult.isErr()) return err(saveResult.error);

    return ok({ team: teamResult.value, membership: saveResult.value });
  }
}
