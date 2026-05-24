import { describe, it, expect, vi } from 'vitest';
import { ok, err } from 'neverthrow';
import { ConnectGitHubUseCase } from '../connect-github';
import { GitHubVelocityError, type IGitHubVelocityPort } from '../../ports/github-velocity-port';
import { EngineeringSnapshotRepositoryError, type IEngineeringSnapshotRepository } from '../../ports/engineering-snapshot-repository';
import type { VelocityMetrics, EngineeringSnapshot } from '../../domain/engineering-snapshot';

const userId = crypto.randomUUID();

const mockMetrics: VelocityMetrics = {
  prMergeRatePerWeek: 4.2,
  avgCycleTimeDays: 3.1,
  avgLeadTimeDays: 1.9,
  issuesClosedPerWeek: 6.0,
  topBottlenecks: [],
  snapshotAt: new Date().toISOString(),
};

function makeVelocityPort(metrics: VelocityMetrics = mockMetrics): IGitHubVelocityPort {
  return {
    fetchVelocityMetrics: vi.fn().mockResolvedValue(ok(metrics)),
  };
}

function makeSnapshotRepo(savedSnapshot?: EngineeringSnapshot): IEngineeringSnapshotRepository {
  return {
    save: vi.fn().mockImplementation(async (s: EngineeringSnapshot) => ok(savedSnapshot ?? s)),
    findByUserId: vi.fn().mockResolvedValue(ok(null)),
    findAllWithTokens: vi.fn().mockResolvedValue(ok([])),
    deleteByUserId: vi.fn().mockResolvedValue(ok(undefined)),
  };
}

const baseInput = {
  userId,
  orgOrUser: 'acme-corp',
  accessToken: 'gho_test_token',
  traceId: crypto.randomUUID(),
};

describe('ConnectGitHubUseCase', () => {
  it('fetches velocity metrics and saves snapshot', async () => {
    const uc = new ConnectGitHubUseCase(makeVelocityPort(), makeSnapshotRepo());
    const result = await uc.execute(baseInput);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.userId).toBe(userId);
      expect(result.value.githubOrg).toBe('acme-corp');
      expect(result.value.velocityMetrics.prMergeRatePerWeek).toBe(4.2);
    }
  });

  it('uses repoFilter when provided', async () => {
    const port = makeVelocityPort();
    const uc = new ConnectGitHubUseCase(port, makeSnapshotRepo());
    await uc.execute({ ...baseInput, repoFilter: ['backend', 'frontend'] });

    expect(port.fetchVelocityMetrics).toHaveBeenCalledWith(
      expect.objectContaining({ repoFilter: ['backend', 'frontend'] }),
    );
  });

  it('stores detected bottlenecks from velocity metrics', async () => {
    const metricsWithBottlenecks: VelocityMetrics = {
      ...mockMetrics,
      topBottlenecks: ['Long PR review cycles (>7 days)'],
    };
    const uc = new ConnectGitHubUseCase(makeVelocityPort(metricsWithBottlenecks), makeSnapshotRepo());
    const result = await uc.execute(baseInput);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.bottlenecks).toContain('Long PR review cycles (>7 days)');
    }
  });

  it('propagates GitHub velocity error', async () => {
    const port: IGitHubVelocityPort = {
      fetchVelocityMetrics: vi.fn().mockResolvedValue(err(new GitHubVelocityError('GitHub API down', 503))),
    };
    const uc = new ConnectGitHubUseCase(port, makeSnapshotRepo());
    const result = await uc.execute(baseInput);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(GitHubVelocityError);
      expect(result.error.message).toBe('GitHub API down');
    }
  });

  it('propagates repository save error', async () => {
    const repo = makeSnapshotRepo();
    repo.save = vi.fn().mockResolvedValue(err(new EngineeringSnapshotRepositoryError('DB write failed')));
    const uc = new ConnectGitHubUseCase(makeVelocityPort(), repo);
    const result = await uc.execute(baseInput);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(EngineeringSnapshotRepositoryError);
    }
  });

  it('sets repoFilter to null when not provided', async () => {
    const repo = makeSnapshotRepo();
    const uc = new ConnectGitHubUseCase(makeVelocityPort(), repo);
    await uc.execute(baseInput);

    const calls = (repo.save as ReturnType<typeof vi.fn>).mock.calls;
    const savedSnapshot = calls[0]?.[0] as EngineeringSnapshot | undefined;
    expect(savedSnapshot?.repoFilter).toBeNull();
  });
});
