import { err, type Result } from 'neverthrow';
import {
  createDomainAllowlist,
  DomainAllowlistAlreadyExistsError,
  DomainAllowlistInvalidError,
  DomainAllowlistPlanError,
  normalizeDomain,
  validateDomain,
  type TeamDomainAllowlist,
} from '../domain/team';
import type { TeamRepositoryError } from '../domain/team';
import type { ITeamRepository } from '../ports/team-repository';
import type { ISubscriptionRepository } from '../ports/subscription-repository';

type Input = { teamId: string; domain: string; requesterId: string; traceId: string };
type AddDomainError =
  | DomainAllowlistInvalidError
  | DomainAllowlistPlanError
  | DomainAllowlistAlreadyExistsError
  | TeamRepositoryError;

export class AddDomainAllowlistUseCase {
  constructor(
    private readonly teamRepo: ITeamRepository,
    private readonly subscriptionRepo: ISubscriptionRepository,
  ) {}

  async execute(input: Input): Promise<Result<TeamDomainAllowlist, AddDomainError>> {
    const domain = normalizeDomain(input.domain);
    if (!validateDomain(domain)) {
      return err(new DomainAllowlistInvalidError(`"${domain}" is not a valid domain`));
    }

    // Gate: requester must own or be admin of the team with an Enterprise plan
    const teamResult = await this.teamRepo.findById(input.teamId);
    if (teamResult.isErr()) return err(teamResult.error);
    const team = teamResult.value;
    if (!team) return err(new DomainAllowlistInvalidError('Team not found'));

    const subResult = await this.subscriptionRepo.findByUserId(team.ownerId);
    if (subResult.isErr()) return err(subResult.error as unknown as TeamRepositoryError);
    const plan = subResult.value?.plan ?? 'free';
    if (plan !== 'enterprise') return err(new DomainAllowlistPlanError());

    // Idempotency: check existing
    const listResult = await this.teamRepo.findDomainAllowlistsByTeamId(input.teamId);
    if (listResult.isErr()) return err(listResult.error);
    if (listResult.value.some((e) => e.domain === domain)) {
      return err(new DomainAllowlistAlreadyExistsError(domain));
    }

    const entry = createDomainAllowlist({ teamId: input.teamId, domain, createdBy: input.requesterId });
    return this.teamRepo.saveDomainAllowlist(entry);
  }
}
