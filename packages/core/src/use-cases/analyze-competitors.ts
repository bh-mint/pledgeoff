import { Result, err, ok } from 'neverthrow';
import type { CompetitorAnalysis } from '../domain/competitor-analysis';
import { diffCompetitors } from '../domain/snapshot-diff';
import type { ICompetitorAnalysisRepository, CompetitorAnalysisRepositoryError } from '../ports/competitor-analysis-repository';
import type { ISignalRepository, SignalRepositoryError } from '../ports/signal-repository';
import type { ILLMClient, LLMClientError } from '../ports/llm-client';
import type { ICompetitorSnapshotRepository, SnapshotRepositoryError } from '../ports/snapshot-repository';
import type { IEventBus, EventBusError } from '../ports/event-bus';

export interface AnalyzeCompetitorsInput {
  readonly ideaId: string;
  readonly ideaText: string;
  readonly userId: string;
  readonly traceId: string;
  readonly founderContext?: string;
  readonly forceRerun?: boolean;
}

export type AnalyzeCompetitorsError =
  | CompetitorAnalysisRepositoryError
  | SignalRepositoryError
  | LLMClientError
  | SnapshotRepositoryError
  | EventBusError;

export class AnalyzeCompetitorsUseCase {
  constructor(
    private readonly competitorAnalysisRepo: ICompetitorAnalysisRepository,
    private readonly signalRepo: ISignalRepository,
    private readonly llmClient: ILLMClient,
    private readonly snapshotRepo?: ICompetitorSnapshotRepository,
    private readonly eventBus?: IEventBus,
  ) {}

  async execute(input: AnalyzeCompetitorsInput): Promise<Result<CompetitorAnalysis, AnalyzeCompetitorsError>> {
    const existing = await this.competitorAnalysisRepo.findByIdeaId(input.ideaId);
    if (existing.isErr()) return err(existing.error);

    if (existing.value && !input.forceRerun) return ok(existing.value);

    // Save old analysis as snapshot before overwriting (if it exists and snapshot repo is wired)
    if (existing.value && this.snapshotRepo) {
      const snapResult = await this.snapshotRepo.save(input.ideaId, existing.value);
      if (snapResult.isErr()) return err(snapResult.error);
    }

    const signalsResult = await this.signalRepo.findByIdeaId(input.ideaId);
    if (signalsResult.isErr()) return err(signalsResult.error);

    const signals = signalsResult.value;

    const llmResult = await this.llmClient.analyzeCompetitors({
      ideaText: input.ideaText,
      signals,
      traceId: input.traceId,
      founderContext: input.founderContext,
    });
    if (llmResult.isErr()) return err(llmResult.error);

    const analysis: CompetitorAnalysis = {
      id: crypto.randomUUID(),
      ideaId: input.ideaId,
      userId: input.userId,
      competitors: llmResult.value.competitors,
      gaps: llmResult.value.gaps,
      signalCount: signals.length,
      createdAt: new Date().toISOString(),
    };

    const saveResult = await this.competitorAnalysisRepo.save(analysis);
    if (saveResult.isErr()) return err(saveResult.error);

    // Diff old vs new and emit event if there are changes
    if (existing.value && this.eventBus) {
      const diffs = diffCompetitors(existing.value, analysis);
      if (diffs.length > 0) {
        await this.eventBus.publish('competitor.changed.v1', {
          eventId: crypto.randomUUID(),
          eventType: 'competitor.changed.v1',
          eventVersion: 1,
          occurredAt: new Date().toISOString(),
          traceId: input.traceId,
          payload: {
            ideaId: input.ideaId,
            source: 'competitors',
            diffs,
            majorChanges: diffs.filter((d) => d.significance === 'major').length,
          },
        });
      }
    }

    return ok(analysis);
  }
}
