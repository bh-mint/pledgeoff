import { Result, ok, err } from 'neverthrow';
import type { QueueItem } from '../domain/decision-queue';
import type { IDecisionQueueRepository, DecisionQueueRepositoryError } from '../ports/decision-queue-repository';
import type { IIdeaRepository, IdeaRepositoryError } from '../ports/idea-repository';
import type { IDecisionRepository, DecisionRepositoryError } from '../ports/decision-repository';

export interface GetDecisionQueueInput {
  readonly userId: string;
  readonly traceId: string;
}

export interface GetDecisionQueueOutput {
  readonly items: QueueItem[];
}

export type GetDecisionQueueError =
  | IdeaRepositoryError
  | DecisionRepositoryError
  | DecisionQueueRepositoryError;

export class GetDecisionQueueUseCase {
  constructor(
    private readonly queueRepo: IDecisionQueueRepository,
    private readonly ideaRepo: IIdeaRepository,
    private readonly decisionRepo: IDecisionRepository,
  ) {}

  async execute(input: GetDecisionQueueInput): Promise<Result<GetDecisionQueueOutput, GetDecisionQueueError>> {
    const queueResult = await this.queueRepo.findByUserId(input.userId);
    if (queueResult.isErr()) return err(queueResult.error);

    const entries = queueResult.value;
    if (entries.length === 0) return ok({ items: [] });

    // Fetch all ideas for this user (to enrich queue entries with text)
    const ideasResult = await this.ideaRepo.findByUserIds([input.userId]);
    if (ideasResult.isErr()) return err(ideasResult.error);

    const ideaMap = new Map(ideasResult.value.map((i) => [i.id, i]));

    // Fetch decisions for each queued idea
    const items: QueueItem[] = [];
    for (const entry of entries) {
      const idea = ideaMap.get(entry.ideaId);
      if (!idea) continue; // idea was deleted

      const decisionResult = await this.decisionRepo.findByIdeaId(entry.ideaId);
      if (decisionResult.isErr()) return err(decisionResult.error);
      const decision = decisionResult.value;

      items.push({
        ...entry,
        ideaText: idea.text,
        verdict: decision?.verdict ?? null,
        confidence: decision?.confidence ?? null,
      });
    }

    // Sort descending by priority_score
    items.sort((a, b) => b.priorityScore - a.priorityScore);

    return ok({ items });
  }
}
