import { Result, err, ok } from 'neverthrow';
import type { LandingPage } from '../domain/landing-page';
import type { ILandingPageRepository, LandingPageRepositoryError } from '../ports/landing-page-repository';
import type { ILLMClient, LLMClientError } from '../ports/llm-client';

export interface GenerateLandingInput {
  readonly ideaId: string;
  readonly ideaText: string;
  readonly reasoning: string;
  readonly userId: string;
  readonly traceId: string;
}

export type GenerateLandingError = LandingPageRepositoryError | LLMClientError;

export class GenerateLandingUseCase {
  constructor(
    private readonly landingPageRepo: ILandingPageRepository,
    private readonly llmClient: ILLMClient,
  ) {}

  async execute(input: GenerateLandingInput): Promise<Result<LandingPage, GenerateLandingError>> {
    const existing = await this.landingPageRepo.findByIdeaId(input.ideaId);
    if (existing.isErr()) return err(existing.error);
    if (existing.value) return ok(existing.value);

    const llmResult = await this.llmClient.generateLanding({
      ideaText: input.ideaText,
      reasoning: input.reasoning,
      traceId: input.traceId,
    });
    if (llmResult.isErr()) return err(llmResult.error);

    const page: LandingPage = {
      id: crypto.randomUUID(),
      ideaId: input.ideaId,
      userId: input.userId,
      headline: llmResult.value.headline,
      subheadline: llmResult.value.subheadline,
      features: llmResult.value.features,
      ctaText: llmResult.value.ctaText,
      waitlistHeadline: llmResult.value.waitlistHeadline,
      createdAt: new Date().toISOString(),
    };

    const saveResult = await this.landingPageRepo.save(page);
    if (saveResult.isErr()) return err(saveResult.error);

    return ok(page);
  }
}
