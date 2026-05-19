import { Result } from 'neverthrow';
import type { OttoConversation } from '../domain/otto-conversation';

export class OttoConversationRepositoryError extends Error {
  readonly code = 'OTTO_CONVERSATION_REPO_ERROR' as const;
}

export interface IOttoConversationRepository {
  findByUserAndIdea(userId: string, ideaId: string): Promise<Result<OttoConversation | null, OttoConversationRepositoryError>>;
  save(conversation: OttoConversation): Promise<Result<OttoConversation, OttoConversationRepositoryError>>;
}
