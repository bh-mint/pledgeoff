import { Result, ok, err } from 'neverthrow';
import type { ITeamRepository } from '../ports/team-repository';
import { createTeam, TeamForbiddenError, TeamRepositoryError, type Team } from '../domain/team';

export type UpdateTeamNameInput = {
  ownerId: string;
  name: string;
  traceId: string;
};

export type UpdateTeamNameError = TeamForbiddenError | TeamRepositoryError;

export class UpdateTeamNameUseCase {
  constructor(private readonly teamRepo: ITeamRepository) {}

  async execute(input: UpdateTeamNameInput): Promise<Result<Team, UpdateTeamNameError>> {
    const trimmed = input.name.trim();
    if (trimmed.length === 0 || trimmed.length > 100) {
      return err(new TeamRepositoryError('Team name must be between 1 and 100 characters'));
    }

    const teamResult = await this.teamRepo.findByOwnerId(input.ownerId);
    if (teamResult.isErr()) return err(teamResult.error);

    const existing = teamResult.value;

    // No team yet — create it with the given name (owner names team before first invite)
    if (!existing) {
      const newTeam = createTeam({ ownerId: input.ownerId, name: trimmed });
      const saveResult = await this.teamRepo.saveTeam(newTeam);
      if (saveResult.isErr()) return err(saveResult.error);
      return ok(saveResult.value);
    }

    if (existing.ownerId !== input.ownerId) return err(new TeamForbiddenError());

    const updated: Team = { ...existing, name: trimmed, updatedAt: new Date().toISOString() };
    const updateResult = await this.teamRepo.updateTeam(updated);
    if (updateResult.isErr()) return err(updateResult.error);

    return ok(updateResult.value);
  }
}
