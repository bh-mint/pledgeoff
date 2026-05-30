import { Result, ok, err } from 'neverthrow';
import type { ITeamRepository } from '../ports/team-repository';
import {
  TeamNotFoundError,
  TeamForbiddenError,
  TeamRepositoryError,
  createInviteLink,
  type TeamInviteLink,
} from '../domain/team';

export type GenerateInviteLinkInput = {
  ownerId: string;
  traceId: string;
};

export type GenerateInviteLinkError =
  | TeamNotFoundError
  | TeamForbiddenError
  | TeamRepositoryError;

export class GenerateInviteLinkUseCase {
  constructor(private readonly teamRepo: ITeamRepository) {}

  async execute(
    input: GenerateInviteLinkInput,
  ): Promise<Result<TeamInviteLink, GenerateInviteLinkError>> {
    const { ownerId } = input;

    const teamResult = await this.teamRepo.findByOwnerId(ownerId);
    if (teamResult.isErr()) return err(teamResult.error);
    if (!teamResult.value) return err(new TeamNotFoundError('No team found for this owner'));

    const team = teamResult.value;
    if (team.ownerId !== ownerId) return err(new TeamForbiddenError('Only the team owner can generate invite links'));

    // Revoke any existing active link
    const existingResult = await this.teamRepo.findInviteLinkByTeamId(team.id);
    if (existingResult.isErr()) return err(existingResult.error);

    if (existingResult.value && !existingResult.value.revokedAt) {
      const revokeResult = await this.teamRepo.revokeInviteLink(
        existingResult.value.id,
        new Date().toISOString(),
      );
      if (revokeResult.isErr()) return err(revokeResult.error);
    }

    const link = createInviteLink({ teamId: team.id, createdBy: ownerId });
    const saveResult = await this.teamRepo.saveInviteLink(link);
    if (saveResult.isErr()) return err(saveResult.error);

    return ok(saveResult.value);
  }
}
