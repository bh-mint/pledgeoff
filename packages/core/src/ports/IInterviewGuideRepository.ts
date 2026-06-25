import type { Result } from 'neverthrow';
import type { InterviewGuide } from '../domain/interview-guide';

export class InterviewGuideRepositoryError extends Error {
  readonly code = 'INTERVIEW_GUIDE_REPO_ERROR' as const;
}

export interface IInterviewGuideRepository {
  save(guide: InterviewGuide): Promise<Result<InterviewGuide, InterviewGuideRepositoryError>>;
  findByIdeaId(ideaId: string): Promise<Result<InterviewGuide | null, InterviewGuideRepositoryError>>;
}
