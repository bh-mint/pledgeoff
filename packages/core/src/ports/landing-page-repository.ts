import { Result } from 'neverthrow';
import type { LandingPage } from '../domain/landing-page';

export class LandingPageRepositoryError extends Error {
  readonly code = 'LANDING_PAGE_REPOSITORY_ERROR' as const;
}

export interface ILandingPageRepository {
  save(page: LandingPage): Promise<Result<LandingPage, LandingPageRepositoryError>>;
  findByIdeaId(ideaId: string): Promise<Result<LandingPage | null, LandingPageRepositoryError>>;
}
