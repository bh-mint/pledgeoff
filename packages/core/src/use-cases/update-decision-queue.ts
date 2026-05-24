import { Result, ok, err } from 'neverthrow';
import { computePriorityScore, type DecisionQueueEntry } from '../domain/decision-queue';
import type { IDecisionQueueRepository, DecisionQueueRepositoryError } from '../ports/decision-queue-repository';
import type { IIdeaRepository, IdeaRepositoryError } from '../ports/idea-repository';
import type { IDecisionRepository, DecisionRepositoryError } from '../ports/decision-repository';
import type { ILLMClient, LLMClientError } from '../ports/llm-client';

export interface UpdateDecisionQueueInput {
  readonly userId: string;
  readonly traceId: string;
}

export interface UpdateDecisionQueueOutput {
  readonly entries: DecisionQueueEntry[];
  readonly significantChanges: number; // count of entries with score shift >20%
}

export type UpdateDecisionQueueError =
  | IdeaRepositoryError
  | DecisionRepositoryError
  | DecisionQueueRepositoryError
  | LLMClientError;

const SIGNIFICANT_CHANGE_THRESHOLD = 0.20;

export class UpdateDecisionQueueUseCase {
  constructor(
    private readonly ideaRepo: IIdeaRepository,
    private readonly decisionRepo: IDecisionRepository,
    private readonly queueRepo: IDecisionQueueRepository,
    private readonly llmClient: ILLMClient,
  ) {}

  async execute(input: UpdateDecisionQueueInput): Promise<Result<UpdateDecisionQueueOutput, UpdateDecisionQueueError>> {
    const ideasResult = await this.ideaRepo.findByUserId(input.userId);
    if (ideasResult.isErr()) return err(ideasResult.error);

    const ideas = ideasResult.value;
    if (ideas.length === 0) return ok({ entries: [], significantChanges: 0 });

    const updatedEntries: DecisionQueueEntry[] = [];
    let significantChanges = 0;

    for (const idea of ideas) {
      const decisionResult = await this.decisionRepo.findByIdeaId(idea.id);
      if (decisionResult.isErr()) return err(decisionResult.error);
      const decision = decisionResult.value;

      const newScore = computePriorityScore({
        verdict: decision?.verdict ?? null,
        confidence: decision?.confidence ?? null,
        score: decision?.score ?? null,
      });

      const existingResult = await this.queueRepo.findByIdeaId(idea.id);
      if (existingResult.isErr()) return err(existingResult.error);
      const existing = existingResult.value;

      const previousScore = existing?.priorityScore ?? null;
      const scoreDelta = previousScore != null ? Math.abs(newScore - previousScore) : 0;
      const isSignificant = scoreDelta > SIGNIFICANT_CHANGE_THRESHOLD;

      if (isSignificant) significantChanges++;

      let changeSummary = existing?.changeSummary ?? null;
      if (isSignificant && decision) {
        // LLM explanation is best-effort — never blocks the update
        const llmResult = await this.llmClient.generatePriorityExplanation({
          ideaText: idea.text,
          verdict: decision.verdict,
          previousScore: previousScore ?? 0,
          currentScore: newScore,
          traceId: input.traceId,
        });
        if (llmResult.isOk()) changeSummary = llmResult.value.explanation;
      }

      const now = new Date().toISOString();
      const entry: DecisionQueueEntry = {
        id: existing?.id ?? crypto.randomUUID(),
        userId: input.userId,
        ideaId: idea.id,
        priorityScore: newScore,
        lastSignalChange: isSignificant ? now : (existing?.lastSignalChange ?? null),
        changeSummary,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };

      const upsertResult = await this.queueRepo.upsert(entry);
      if (upsertResult.isErr()) return err(upsertResult.error);

      updatedEntries.push(upsertResult.value);
    }

    return ok({ entries: updatedEntries, significantChanges });
  }
}
