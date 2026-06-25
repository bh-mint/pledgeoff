import { Result, err, ok } from 'neverthrow';
import type { ILLMClient, LLMClientError } from '../ports/llm-client';
import type { IBattlecardRepository, BattlecardRepositoryError } from '../ports/IBattlecardRepository';
import type { Battlecard } from '../domain/battlecard';

export type GenerateBattlecardInput = {
  readonly ideaId: string;
  readonly userId: string;
  readonly ideaText: string;
  readonly competitorNames: string[];
  readonly traceId: string;
};

export type GenerateBattlecardError = LLMClientError | BattlecardRepositoryError;

export class GenerateBattlecardUseCase {
  constructor(
    private readonly llmClient: ILLMClient,
    private readonly battlecardRepo: IBattlecardRepository,
  ) {}

  async execute(input: GenerateBattlecardInput): Promise<Result<Battlecard, GenerateBattlecardError>> {
    const llmResult = await this.llmClient.generateBattlecard({
      ideaText: input.ideaText,
      competitorNames: input.competitorNames,
      traceId: input.traceId,
    });
    if (llmResult.isErr()) return err(llmResult.error);

    const battlecard: Battlecard = {
      id: crypto.randomUUID(),
      ideaId: input.ideaId,
      userId: input.userId,
      entries: llmResult.value.entries,
      createdAt: new Date().toISOString(),
    };

    const saveResult = await this.battlecardRepo.save(battlecard);
    if (saveResult.isErr()) return err(saveResult.error);

    return ok(saveResult.value);
  }
}
