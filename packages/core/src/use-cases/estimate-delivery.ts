import { Result, ok, err } from 'neverthrow';
import type { DeliveryEstimate } from '../domain/engineering-snapshot';
import type { IBuildAnalysisRepository, BuildAnalysisRepositoryError } from '../ports/build-analysis-repository';
import type { IEngineeringSnapshotRepository, EngineeringSnapshotRepositoryError } from '../ports/engineering-snapshot-repository';

export interface EstimateDeliveryInput {
  readonly userId: string;
  readonly ideaId: string;
  readonly traceId: string;
}

export type EstimateDeliveryError = BuildAnalysisRepositoryError | EngineeringSnapshotRepositoryError;

// Industry average for a small team without velocity data
const GENERIC_VELOCITY_PRS_PER_WEEK = 2;

export class EstimateDeliveryUseCase {
  constructor(
    private readonly buildAnalysisRepo: IBuildAnalysisRepository,
    private readonly snapshotRepo: IEngineeringSnapshotRepository,
  ) {}

  async execute(input: EstimateDeliveryInput): Promise<Result<DeliveryEstimate, EstimateDeliveryError>> {
    const [buildResult, snapshotResult] = await Promise.all([
      this.buildAnalysisRepo.findByIdeaId(input.ideaId),
      this.snapshotRepo.findByUserId(input.userId),
    ]);

    if (buildResult.isErr()) return err(buildResult.error);
    if (snapshotResult.isErr()) return err(snapshotResult.error);

    const build = buildResult.value;
    const snapshot = snapshotResult.value;
    const hasVelocityData = !!snapshot;

    // Complexity: each tech component ≈ 3 weeks, each gap ≈ 2 additional weeks
    const complexityWeeks = build
      ? build.stack.length * 3 + build.gaps.length * 2
      : 12; // no build analysis → generic 3-month baseline

    const velocityPerWeek = snapshot?.velocityMetrics.prMergeRatePerWeek ?? GENERIC_VELOCITY_PRS_PER_WEEK;

    // Weeks needed = complexity / effective velocity (floor at 0.5 to avoid division near zero)
    const weeksNeeded = complexityWeeks / Math.max(velocityPerWeek, 0.5);

    const midDays = Math.round(weeksNeeded * 7);
    const minDays = Math.max(7, Math.round(midDays * 0.65));
    const maxDays = Math.round(midDays * 1.6);

    const confidence: DeliveryEstimate['confidence'] = !build
      ? 'low'
      : !hasVelocityData
        ? 'medium'
        : 'high';

    let reasoning: string;
    if (hasVelocityData && build) {
      reasoning = `Based on your team's velocity (${velocityPerWeek.toFixed(1)} PRs/week), ${build.stack.length} tech components, and ${build.gaps.length} identified gaps.`;
    } else if (build) {
      reasoning = `Estimated from ${build.stack.length} tech components and ${build.gaps.length} gaps. Connect GitHub for a personalized estimate based on your team's actual velocity.`;
    } else {
      reasoning = `No Blueprint analysis available. Run the Blueprint tool first for a more accurate delivery estimate.`;
    }

    return ok({
      estimateDays: { min: minDays, mid: midDays, max: maxDays },
      confidence,
      reasoning,
      hasVelocityData,
    });
  }
}
