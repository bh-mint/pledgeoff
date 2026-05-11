import { Result } from 'neverthrow';
import type { CustomerAnalysis } from '../domain/customer-analysis';

export class CustomerAnalysisRepositoryError extends Error {
  readonly code = 'CUSTOMER_ANALYSIS_REPOSITORY_ERROR' as const;
}

export interface ICustomerAnalysisRepository {
  save(analysis: CustomerAnalysis): Promise<Result<CustomerAnalysis, CustomerAnalysisRepositoryError>>;
  findByIdeaId(ideaId: string): Promise<Result<CustomerAnalysis | null, CustomerAnalysisRepositoryError>>;
}
