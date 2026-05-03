import { Result } from 'neverthrow';
import type { Signal } from '../domain/signal';

export class SourceAdapterError extends Error {
  readonly code = 'SOURCE_ADAPTER_ERROR' as const;
  constructor(
    message: string,
    readonly source: string,
  ) {
    super(message);
    this.name = 'SourceAdapterError';
  }
}

export interface ISourceAdapter {
  readonly sourceName: string;
  fetch(ideaText: string, ideaId: string, traceId: string): Promise<Result<Signal[], SourceAdapterError>>;
}
