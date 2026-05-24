import { Result, err, ok } from 'neverthrow';
import {
  createDecisionOutcome,
  DecisionOutcome,
  OutcomeType,
  OutcomeAlreadyReportedError,
  InvalidVerdictError,
} from '../domain/decision-outcome.js';
import type { IDecisionOutcomeRepository, DecisionOutcomeRepositoryError } from '../ports/decision-outcome-repository.js';
import type { IDecisionRepository, DecisionRepositoryError } from '../ports/decision-repository.js';

export interface RecordOutcomeInput {
  readonly ideaId: string;
  readonly userId: string;
  readonly outcomeType: OutcomeType;
  readonly notes?: string | null;
  readonly traceId: string;
}

export type RecordOutcomeError =
  | OutcomeAlreadyReportedError
  | InvalidVerdictError
  | DecisionOutcomeRepositoryError
  | DecisionRepositoryError;

export class RecordOutcomeUseCase {
  constructor(
    private readonly outcomeRepo: IDecisionOutcomeRepository,
    private readonly decisionRepo: IDecisionRepository,
  ) {}

  async execute(input: RecordOutcomeInput): Promise<Result<DecisionOutcome, RecordOutcomeError>> {
    // get latest decision for idea to capture verdict
    const decisionsResult = await this.decisionRepo.findAllByIdeaId(input.ideaId);
    if (decisionsResult.isErr()) return err(decisionsResult.error);

    const decisions = decisionsResult.value;
    if (decisions.length === 0) return err(new InvalidVerdictError());

    // use most recent decision's verdict
    const sorted = decisions.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const latestDecision = sorted[0];
    if (!latestDecision) return err(new InvalidVerdictError());

    const outcomeResult = createDecisionOutcome({
      ideaId: input.ideaId,
      userId: input.userId,
      verdictAtTime: latestDecision.verdict,
      outcomeType: input.outcomeType,
      notes: input.notes,
    });

    if (outcomeResult.isErr()) return err(outcomeResult.error);

    const saveResult = await this.outcomeRepo.upsert(outcomeResult.value);
    if (saveResult.isErr()) return err(saveResult.error);

    return ok(saveResult.value);
  }
}
