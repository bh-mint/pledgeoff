import { Result, err, ok } from 'neverthrow';
import type { CustomerAnalysis } from '../domain/customer-analysis';
import type { ICustomerAnalysisRepository, CustomerAnalysisRepositoryError } from '../ports/customer-analysis-repository';
import type { ISignalRepository, SignalRepositoryError } from '../ports/signal-repository';
import type { ILLMClient, LLMClientError } from '../ports/llm-client';

export interface AnalyzeCustomersInput {
  readonly ideaId: string;
  readonly ideaText: string;
  readonly userId: string;
  readonly traceId: string;
}

export type AnalyzeCustomersError = CustomerAnalysisRepositoryError | SignalRepositoryError | LLMClientError;

export class AnalyzeCustomersUseCase {
  constructor(
    private readonly customerAnalysisRepo: ICustomerAnalysisRepository,
    private readonly signalRepo: ISignalRepository,
    private readonly llmClient: ILLMClient,
  ) {}

  async execute(input: AnalyzeCustomersInput): Promise<Result<CustomerAnalysis, AnalyzeCustomersError>> {
    const existing = await this.customerAnalysisRepo.findByIdeaId(input.ideaId);
    if (existing.isErr()) return err(existing.error);
    if (existing.value) return ok(existing.value);

    const signalsResult = await this.signalRepo.findByIdeaId(input.ideaId);
    if (signalsResult.isErr()) return err(signalsResult.error);

    const llmResult = await this.llmClient.analyzeCustomers({
      ideaText: input.ideaText,
      signals: signalsResult.value,
      traceId: input.traceId,
    });
    if (llmResult.isErr()) return err(llmResult.error);

    const analysis: CustomerAnalysis = {
      id: crypto.randomUUID(),
      ideaId: input.ideaId,
      userId: input.userId,
      segments: llmResult.value.segments,
      painPoints: llmResult.value.painPoints,
      sentiment: llmResult.value.sentiment,
      quotes: llmResult.value.quotes,
      createdAt: new Date().toISOString(),
    };

    const saveResult = await this.customerAnalysisRepo.save(analysis);
    if (saveResult.isErr()) return err(saveResult.error);

    return ok(analysis);
  }
}
