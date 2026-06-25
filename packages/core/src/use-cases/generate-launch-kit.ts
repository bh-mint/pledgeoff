import { Result, err, ok } from 'neverthrow';
import type { LaunchKit } from '../domain/launch-kit';
import type { ILaunchKitRepository, LaunchKitRepositoryError } from '../ports/launch-kit-repository';
import type { ILLMClient, LLMClientError } from '../ports/llm-client';
import type { IIdeaRepository, IdeaRepositoryError } from '../ports/idea-repository';
import type { ISignalRepository, SignalRepositoryError } from '../ports/signal-repository';

export interface GenerateLaunchKitInput {
  readonly ideaId: string;
  readonly userId: string;
  readonly traceId: string;
}

export type GenerateLaunchKitError =
  | IdeaRepositoryError
  | SignalRepositoryError
  | LaunchKitRepositoryError
  | LLMClientError
  | { readonly code: 'IDEA_NOT_FOUND' }
  | { readonly code: 'NOT_GO_VERDICT' }
  | { readonly code: 'UNAUTHORIZED' };

export class GenerateLaunchKitUseCase {
  constructor(
    private readonly ideaRepo: IIdeaRepository,
    private readonly signalRepo: ISignalRepository,
    private readonly launchKitRepo: ILaunchKitRepository,
    private readonly llmClient: ILLMClient,
  ) {}

  async execute(input: GenerateLaunchKitInput): Promise<Result<LaunchKit, GenerateLaunchKitError>> {
    const ideaResult = await this.ideaRepo.findById(input.ideaId);
    if (ideaResult.isErr()) return err(ideaResult.error);
    if (!ideaResult.value) return err({ code: 'IDEA_NOT_FOUND' } as const);
    if (ideaResult.value.userId !== input.userId) return err({ code: 'UNAUTHORIZED' } as const);

    const existing = await this.launchKitRepo.findByIdeaId(input.ideaId);
    if (existing.isErr()) return err(existing.error);
    if (existing.value) return ok(existing.value);

    const signalsResult = await this.signalRepo.findByIdeaId(input.ideaId);
    if (signalsResult.isErr()) return err(signalsResult.error);

    const llmResult = await this.llmClient.generateLaunchKit({
      ideaText: ideaResult.value.text,
      reasoning: '',
      signals: signalsResult.value,
      traceId: input.traceId,
      founderContext: ideaResult.value.context ?? undefined,
    });
    if (llmResult.isErr()) return err(llmResult.error);

    const kit: LaunchKit = {
      id: crypto.randomUUID(),
      ideaId: input.ideaId,
      userId: input.userId,
      headlines: llmResult.value.headlines,
      emailSequence: llmResult.value.emailSequence,
      pricingRecommendation: llmResult.value.pricingRecommendation,
      createdAt: new Date().toISOString(),
    };

    const saveResult = await this.launchKitRepo.save(kit);
    if (saveResult.isErr()) return err(saveResult.error);

    return ok(kit);
  }
}
