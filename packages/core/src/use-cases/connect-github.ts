import { Result, ok, err } from 'neverthrow';
import type { EngineeringSnapshot } from '../domain/engineering-snapshot';
import type { IGitHubVelocityPort, GitHubVelocityError } from '../ports/github-velocity-port';
import type { IEngineeringSnapshotRepository, EngineeringSnapshotRepositoryError } from '../ports/engineering-snapshot-repository';

export interface ConnectGitHubInput {
  readonly userId: string;
  readonly orgOrUser: string;
  readonly accessToken: string;
  readonly repoFilter?: string[];
  readonly traceId: string;
}

export type ConnectGitHubError = GitHubVelocityError | EngineeringSnapshotRepositoryError;

export class ConnectGitHubUseCase {
  constructor(
    private readonly velocityPort: IGitHubVelocityPort,
    private readonly snapshotRepo: IEngineeringSnapshotRepository,
  ) {}

  async execute(input: ConnectGitHubInput): Promise<Result<EngineeringSnapshot, ConnectGitHubError>> {
    const metricsResult = await this.velocityPort.fetchVelocityMetrics({
      orgOrUser: input.orgOrUser,
      token: input.accessToken,
      repoFilter: input.repoFilter,
      traceId: input.traceId,
    });
    if (metricsResult.isErr()) return err(metricsResult.error);

    const now = new Date().toISOString();
    const snapshot: EngineeringSnapshot = {
      id: crypto.randomUUID(),
      userId: input.userId,
      githubOrg: input.orgOrUser,
      repoFilter: input.repoFilter ?? null,
      velocityMetrics: metricsResult.value,
      bottlenecks: metricsResult.value.topBottlenecks,
      snapshotAt: now,
      createdAt: now,
    };

    const saveResult = await this.snapshotRepo.save(snapshot, input.accessToken);
    if (saveResult.isErr()) return err(saveResult.error);

    return ok(saveResult.value);
  }
}
