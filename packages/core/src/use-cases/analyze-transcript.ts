import { ok, err, type Result } from 'neverthrow';
import type { TranscriptAnalysis } from '../domain/transcript-analysis';
import type { ITranscriptAnalysisRepository, TranscriptAnalysisRepositoryError } from '../ports/ITranscriptAnalysisRepository';
import type { IInterviewGuideRepository, InterviewGuideRepositoryError } from '../ports/IInterviewGuideRepository';
import type { ILLMClient, LLMClientError } from '../ports/llm-client';

type AnalyzeTranscriptError = LLMClientError | TranscriptAnalysisRepositoryError | InterviewGuideRepositoryError;

interface Input {
  readonly ideaId: string;
  readonly userId: string;
  readonly ideaText: string;
  readonly transcript: string;
  readonly traceId: string;
}

export class AnalyzeTranscriptUseCase {
  constructor(
    private readonly llmClient: ILLMClient,
    private readonly repo: ITranscriptAnalysisRepository,
    private readonly interviewGuideRepo: IInterviewGuideRepository,
  ) {}

  async execute(input: Input): Promise<Result<TranscriptAnalysis, AnalyzeTranscriptError>> {
    const guideResult = await this.interviewGuideRepo.findByIdeaId(input.ideaId);
    const hypotheses = guideResult.isOk() && guideResult.value
      ? guideResult.value.hypotheses
      : [];

    const llmResult = await this.llmClient.analyzeTranscript({
      ideaText: input.ideaText,
      transcript: input.transcript,
      hypotheses,
      traceId: input.traceId,
    });
    if (llmResult.isErr()) return err(llmResult.error);

    const analysis: TranscriptAnalysis = {
      id: crypto.randomUUID(),
      ideaId: input.ideaId,
      userId: input.userId,
      confirmedHypotheses: llmResult.value.confirmedHypotheses,
      rejectedHypotheses: llmResult.value.rejectedHypotheses,
      newInsights: llmResult.value.newInsights,
      quotes: llmResult.value.quotes,
      signalStrength: llmResult.value.signalStrength,
      createdAt: new Date().toISOString(),
    };

    const saveResult = await this.repo.save(analysis);
    if (saveResult.isErr()) return err(saveResult.error);
    return ok(saveResult.value);
  }
}
