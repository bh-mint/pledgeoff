import { Result, ok, err } from 'neverthrow';
import type { EngineeringSnapshot } from '../domain/engineering-snapshot';
import type { IGitHubVelocityPort } from '../ports/github-velocity-port';
import type { IEngineeringSnapshotRepository, EngineeringSnapshotRepositoryError } from '../ports/engineering-snapshot-repository';

export interface RefreshEngineeringSnapshotInput {
  readonly traceId: string;
}

export interface RefreshEngineeringSnapshotOutput {
  readonly updated: number;
  readonly failed: number;
}

export type RefreshEngineeringSnapshotError = EngineeringSnapshotRepositoryError;

export class RefreshEngineeringSnapshotUseCase {
  constructor(
    private readonly velocityPort: IGitHubVelocityPort,
    private readonly snapshotRepo: IEngineeringSnapshotRepository,
  ) {}

  async execute(input: RefreshEngineeringSnapshotInput): Promise<Result<RefreshEngineeringSnapshotOutput, RefreshEngineeringSnapshotError>> {
    const allResult = await this.snapshotRepo.findAllWithTokens();
    if (allResult.isErr()) return err(allResult.error);

    let updated = 0;
    let failed = 0;

    for (const { snapshot, plainToken } of allResult.value) {
      const metricsResult = await this.velocityPort.fetchVelocityMetrics({
        orgOrUser: snapshot.githubOrg,
        token: plainToken,
        repoFilter: snapshot.repoFilter ?? undefined,
        traceId: input.traceId,
      });

      if (metricsResult.isErr()) {
        failed++;
        continue;
      }

      const refreshed: EngineeringSnapshot = {
        ...snapshot,
        velocityMetrics: metricsResult.value,
        bottlenecks: metricsResult.value.topBottlenecks,
        snapshotAt: new Date().toISOString(),
      };

      const saveResult = await this.snapshotRepo.save(refreshed, plainToken);
      if (saveResult.isErr()) {
        failed++;
        continue;
      }
      updated++;
    }

    return ok({ updated, failed });
  }
}
