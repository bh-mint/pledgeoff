import { err, ok, type Result } from 'neverthrow';
import { createPendingMembership, UserAlreadyInTeamError, type TeamRepositoryError } from '../domain/team';
import type { ITeamRepository } from '../ports/team-repository';

type Input = { userId: string; email: string; traceId: string };
type AutoJoinResult = { joined: true; teamId: string } | { joined: false };
type AutoJoinError = UserAlreadyInTeamError | TeamRepositoryError;

export class AutoJoinByDomainUseCase {
  constructor(private readonly teamRepo: ITeamRepository) {}

  async execute(input: Input): Promise<Result<AutoJoinResult, AutoJoinError>> {
    // Already in a team → no-op
    const existingResult = await this.teamRepo.findByMemberId(input.userId);
    if (existingResult.isErr()) return err(existingResult.error);
    if (existingResult.value) return ok({ joined: false });

    const ownerTeamResult = await this.teamRepo.findByOwnerId(input.userId);
    if (ownerTeamResult.isErr()) return err(ownerTeamResult.error);
    if (ownerTeamResult.value) return ok({ joined: false });

    const domain = input.email.split('@')[1]?.toLowerCase();
    if (!domain) return ok({ joined: false });

    const teamResult = await this.teamRepo.findTeamByEmailDomain(domain);
    if (teamResult.isErr()) return err(teamResult.error);
    const team = teamResult.value;
    if (!team) return ok({ joined: false });

    // Create active membership directly (no invite flow needed)
    const membership = {
      ...createPendingMembership({ teamId: team.id, invitedEmail: input.email }),
      userId: input.userId,
      status: 'active' as const,
      acceptedAt: new Date().toISOString(),
    };

    const saveResult = await this.teamRepo.saveMembership(membership);
    if (saveResult.isErr()) return err(saveResult.error);

    return ok({ joined: true, teamId: team.id });
  }
}
