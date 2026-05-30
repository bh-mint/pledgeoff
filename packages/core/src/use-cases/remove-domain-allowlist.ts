import { err, type Result } from 'neverthrow';
import {
  DomainAllowlistInvalidError,
  DomainAllowlistNotFoundError,
  DomainAllowlistPlanError,
  normalizeDomain,
  type TeamRepositoryError,
} from '../domain/team';
import type { ITeamRepository } from '../ports/team-repository';
import type { ISubscriptionRepository } from '../ports/subscription-repository';

type Input = { teamId: string; domain: string; requesterId: string; traceId: string };
type RemoveDomainError =
  | DomainAllowlistInvalidError
  | DomainAllowlistNotFoundError
  | DomainAllowlistPlanError
  | TeamRepositoryError;

export class RemoveDomainAllowlistUseCase {
  constructor(
    private readonly teamRepo: ITeamRepository,
    private readonly subscriptionRepo: ISubscriptionRepository,
  ) {}

  async execute(input: Input): Promise<Result<void, RemoveDomainError>> {
    const domain = normalizeDomain(input.domain);

    const teamResult = await this.teamRepo.findById(input.teamId);
    if (teamResult.isErr()) return err(teamResult.error);
    const team = teamResult.value;
    if (!team) return err(new DomainAllowlistInvalidError('Team not found'));

    const subResult = await this.subscriptionRepo.findByUserId(team.ownerId);
    if (subResult.isErr()) return err(subResult.error as unknown as TeamRepositoryError);
    const plan = subResult.value?.plan ?? 'free';
    if (plan !== 'enterprise') return err(new DomainAllowlistPlanError());

    const listResult = await this.teamRepo.findDomainAllowlistsByTeamId(input.teamId);
    if (listResult.isErr()) return err(listResult.error);
    const exists = listResult.value.some((e) => e.domain === domain);
    if (!exists) return err(new DomainAllowlistNotFoundError());

    return this.teamRepo.deleteDomainAllowlist(input.teamId, domain);
  }
}
