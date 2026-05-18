import { Result } from 'neverthrow';

export class EmbeddingClientError extends Error {
  readonly code = 'EMBEDDING_CLIENT_ERROR' as const;
}

export interface IEmbeddingClient {
  embed(text: string): Promise<Result<number[], EmbeddingClientError>>;
}
