import { ok, err, type Result } from 'neverthrow';
import type { InterviewGuide } from '../domain/interview-guide';
import type { IInterviewGuideRepository, InterviewGuideRepositoryError } from '../ports/IInterviewGuideRepository';
import type { ICustomerAnalysisRepository, CustomerAnalysisRepositoryError } from '../ports/customer-analysis-repository';
import type { ILLMClient, LLMClientError } from '../ports/llm-client';

type GenerateInterviewGuideError = LLMClientError | InterviewGuideRepositoryError | CustomerAnalysisRepositoryError;

interface Input {
  readonly ideaId: string;
  readonly userId: string;
  readonly ideaText: string;
  readonly traceId: string;
  readonly founderContext?: string;
}

export class GenerateInterviewGuideUseCase {
  constructor(
    private readonly llmClient: ILLMClient,
    private readonly repo: IInterviewGuideRepository,
    private readonly customerRepo: ICustomerAnalysisRepository,
  ) {}

  async execute(input: Input): Promise<Result<InterviewGuide, GenerateInterviewGuideError>> {
    const icpResult = await this.customerRepo.findByIdeaId(input.ideaId);
    const icpSegments = icpResult.isOk() && icpResult.value
      ? icpResult.value.segments.map((s) => s.name)
      : [];

    const llmResult = await this.llmClient.generateInterviewGuide({
      ideaText: input.ideaText,
      icpSegments,
      traceId: input.traceId,
      founderContext: input.founderContext,
    });
    if (llmResult.isErr()) return err(llmResult.error);

    const guide: InterviewGuide = {
      id: crypto.randomUUID(),
      ideaId: input.ideaId,
      userId: input.userId,
      targetSegment: llmResult.value.targetSegment,
      questions: llmResult.value.questions,
      hypotheses: llmResult.value.hypotheses,
      redFlags: llmResult.value.redFlags,
      createdAt: new Date().toISOString(),
    };

    const saveResult = await this.repo.save(guide);
    if (saveResult.isErr()) return err(saveResult.error);
    return ok(saveResult.value);
  }
}
