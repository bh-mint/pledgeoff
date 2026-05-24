import type { Result } from 'neverthrow';
import type { VelocityMetrics } from '../domain/engineering-snapshot';

export class GitHubVelocityError extends Error {
  readonly code = 'GITHUB_VELOCITY_ERROR' as const;
  constructor(message: string, readonly statusCode?: number) {
    super(message);
    this.name = 'GitHubVelocityError';
  }
}

export interface GitHubVelocityInput {
  readonly orgOrUser: string;
  readonly token: string;
  readonly repoFilter?: string[];
  readonly traceId: string;
}

export interface IGitHubVelocityPort {
  fetchVelocityMetrics(input: GitHubVelocityInput): Promise<Result<VelocityMetrics, GitHubVelocityError>>;
}
