import { Result, ok, err } from 'neverthrow';
import type { ITeamRepository } from '../ports/team-repository';
import { TeamNotFoundError, TeamForbiddenError, TeamRepositoryError, type Team } from '../domain/team';

export type UpdateTeamNameInput = {
  ownerId: string;
  name: string;
  traceId: string;
};

export type UpdateTeamNameError = TeamNotFoundError | TeamForbiddenError | TeamRepositoryError;

export class UpdateTeamNameUseCase {
  constructor(private readonly teamRepo: ITeamRepository) {}

  async execute(input: UpdateTeamNameInput): Promise<Result<Team, UpdateTeamNameError>> {
    const trimmed = input.name.trim();
    if (trimmed.length === 0 || trimmed.length > 100) {
      return err(new TeamRepositoryError('Team name must be between 1 and 100 characters'));
    }

    const teamResult = await this.teamRepo.findByOwnerId(input.ownerId);
    if (teamResult.isErr()) return err(teamResult.error);

    const team = teamResult.value;
    if (!team) return err(new TeamNotFoundError());
    if (team.ownerId !== input.ownerId) return err(new TeamForbiddenError());

    const updated: Team = { ...team, name: trimmed, updatedAt: new Date().toISOString() };
    const updateResult = await this.teamRepo.updateTeam(updated);
    if (updateResult.isErr()) return err(updateResult.error);

    return ok(updateResult.value);
  }
}
