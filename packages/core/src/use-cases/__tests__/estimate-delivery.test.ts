import { describe, it, expect, vi } from 'vitest';
import { ok, err } from 'neverthrow';
import { EstimateDeliveryUseCase } from '../estimate-delivery';
import { BuildAnalysisRepositoryError, type IBuildAnalysisRepository } from '../../ports/build-analysis-repository';
import { EngineeringSnapshotRepositoryError, type IEngineeringSnapshotRepository } from '../../ports/engineering-snapshot-repository';
import type { BuildAnalysis } from '../../domain/build-analysis';
import type { EngineeringSnapshot } from '../../domain/engineering-snapshot';

const userId = crypto.randomUUID();
const ideaId = crypto.randomUUID();

const mockBuild: BuildAnalysis = {
  id: crypto.randomUUID(),
  ideaId,
  userId,
  stack: [
    { name: 'Auth', description: 'User auth', decision: 'oss', rationale: 'Supabase', libraries: [] },
    { name: 'API', description: 'REST API', decision: 'build', rationale: 'Custom', libraries: [] },
    { name: 'DB', description: 'PostgreSQL', decision: 'oss', rationale: 'Supabase', libraries: [] },
  ],
  gaps: [
    { title: 'Payment integration', description: 'Stripe', opportunity: 'Revenue' },
  ],
  signalCount: 5,
  createdAt: new Date().toISOString(),
};

const mockSnapshot: EngineeringSnapshot = {
  id: crypto.randomUUID(),
  userId,
  githubOrg: 'acme',
  repoFilter: null,
  velocityMetrics: {
    prMergeRatePerWeek: 4,
    avgCycleTimeDays: 3,
    avgLeadTimeDays: 2,
    issuesClosedPerWeek: 5,
    topBottlenecks: [],
    snapshotAt: new Date().toISOString(),
  },
  bottlenecks: [],
  snapshotAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
};

function makeBuildRepo(build: BuildAnalysis | null = mockBuild): IBuildAnalysisRepository {
  return {
    save: vi.fn(),
    findByIdeaId: vi.fn().mockResolvedValue(ok(build)),
  };
}

function makeSnapshotRepo(snapshot: EngineeringSnapshot | null = mockSnapshot): IEngineeringSnapshotRepository {
  return {
    save: vi.fn(),
    findByUserId: vi.fn().mockResolvedValue(ok(snapshot)),
    findAllWithTokens: vi.fn().mockResolvedValue(ok([])),
    deleteByUserId: vi.fn().mockResolvedValue(ok(undefined)),
  };
}

const baseInput = { userId, ideaId, traceId: crypto.randomUUID() };

describe('EstimateDeliveryUseCase', () => {
  it('returns high-confidence estimate when both build analysis and velocity data exist', async () => {
    const uc = new EstimateDeliveryUseCase(makeBuildRepo(), makeSnapshotRepo());
    const result = await uc.execute(baseInput);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.confidence).toBe('high');
      expect(result.value.hasVelocityData).toBe(true);
      expect(result.value.estimateDays.min).toBeLessThan(result.value.estimateDays.mid);
      expect(result.value.estimateDays.mid).toBeLessThan(result.value.estimateDays.max);
    }
  });

  it('returns medium-confidence when build analysis exists but no velocity data', async () => {
    const uc = new EstimateDeliveryUseCase(makeBuildRepo(), makeSnapshotRepo(null));
    const result = await uc.execute(baseInput);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.confidence).toBe('medium');
      expect(result.value.hasVelocityData).toBe(false);
    }
  });

  it('returns low-confidence when no build analysis exists', async () => {
    const uc = new EstimateDeliveryUseCase(makeBuildRepo(null), makeSnapshotRepo(null));
    const result = await uc.execute(baseInput);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.confidence).toBe('low');
    }
  });

  it('faster velocity produces shorter estimate', async () => {
    const fastSnapshot = { ...mockSnapshot, velocityMetrics: { ...mockSnapshot.velocityMetrics, prMergeRatePerWeek: 10 } };
    const slowSnapshot = { ...mockSnapshot, velocityMetrics: { ...mockSnapshot.velocityMetrics, prMergeRatePerWeek: 1 } };

    const ucFast = new EstimateDeliveryUseCase(makeBuildRepo(), makeSnapshotRepo(fastSnapshot));
    const ucSlow = new EstimateDeliveryUseCase(makeBuildRepo(), makeSnapshotRepo(slowSnapshot));

    const fastResult = await ucFast.execute(baseInput);
    const slowResult = await ucSlow.execute(baseInput);

    expect(fastResult.isOk() && slowResult.isOk()).toBe(true);
    if (fastResult.isOk() && slowResult.isOk()) {
      expect(fastResult.value.estimateDays.mid).toBeLessThan(slowResult.value.estimateDays.mid);
    }
  });

  it('more complex build produces longer estimate', async () => {
    const simpleBuild = { ...mockBuild, stack: mockBuild.stack.slice(0, 1), gaps: [] };
    const complexBuild = { ...mockBuild, stack: [...mockBuild.stack, ...mockBuild.stack], gaps: [...mockBuild.gaps, ...mockBuild.gaps] };

    const ucSimple = new EstimateDeliveryUseCase(makeBuildRepo(simpleBuild), makeSnapshotRepo());
    const ucComplex = new EstimateDeliveryUseCase(makeBuildRepo(complexBuild), makeSnapshotRepo());

    const simpleResult = await ucSimple.execute(baseInput);
    const complexResult = await ucComplex.execute(baseInput);

    expect(simpleResult.isOk() && complexResult.isOk()).toBe(true);
    if (simpleResult.isOk() && complexResult.isOk()) {
      expect(simpleResult.value.estimateDays.mid).toBeLessThan(complexResult.value.estimateDays.mid);
    }
  });

  it('min estimate is always less than max estimate', async () => {
    const uc = new EstimateDeliveryUseCase(makeBuildRepo(), makeSnapshotRepo());
    const result = await uc.execute(baseInput);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.estimateDays.min).toBeGreaterThan(0);
      expect(result.value.estimateDays.min).toBeLessThan(result.value.estimateDays.max);
    }
  });

  it('reasoning mentions velocity when velocity data is present', async () => {
    const uc = new EstimateDeliveryUseCase(makeBuildRepo(), makeSnapshotRepo());
    const result = await uc.execute(baseInput);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.reasoning).toContain('velocity');
    }
  });

  it('propagates build analysis repository error', async () => {
    const buildRepo = makeBuildRepo();
    buildRepo.findByIdeaId = vi.fn().mockResolvedValue(err(new BuildAnalysisRepositoryError('DB down')));
    const uc = new EstimateDeliveryUseCase(buildRepo, makeSnapshotRepo());
    const result = await uc.execute(baseInput);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBeInstanceOf(BuildAnalysisRepositoryError);
  });

  it('propagates engineering snapshot repository error', async () => {
    const snapshotRepo = makeSnapshotRepo();
    snapshotRepo.findByUserId = vi.fn().mockResolvedValue(err(new EngineeringSnapshotRepositoryError('DB down')));
    const uc = new EstimateDeliveryUseCase(makeBuildRepo(), snapshotRepo);
    const result = await uc.execute(baseInput);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBeInstanceOf(EngineeringSnapshotRepositoryError);
  });
});
