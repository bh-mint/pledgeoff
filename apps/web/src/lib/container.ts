import {
  SupabaseIdeaRepository,
  SupabaseSignalRepository,
  SupabaseDecisionRepository,
  SupabaseFeedbackRepository,
  SupabaseIdempotencyStore,
  RedditSourceAdapter,
  GitHubSourceAdapter,
} from '@pledgeoff/adapters';
import { PostgresEventBus } from '@pledgeoff/eventbus';
import {
  CreateIdeaUseCase,
  FetchSignalsUseCase,
  RecordFeedbackUseCase,
} from '@pledgeoff/core';
import type { IdeaCreatedV1 } from '@pledgeoff/contracts';
import type { DomainEvent } from '@pledgeoff/core';
import { createServiceRoleClient } from './supabase-server';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function buildContainer() {
  const supabase = createServiceRoleClient();

  const ideaRepo = new SupabaseIdeaRepository(supabase);
  const signalRepo = new SupabaseSignalRepository(supabase);
  const decisionRepo = new SupabaseDecisionRepository(supabase);
  const feedbackRepo = new SupabaseFeedbackRepository(supabase);
  const idempotencyStore = new SupabaseIdempotencyStore(supabase);

  const eventBus = new PostgresEventBus(supabase);

  const sourceAdapters = [
    new RedditSourceAdapter(),
    new GitHubSourceAdapter(requireEnv('GITHUB_PAT')),
  ];

  const createIdeaUseCase = new CreateIdeaUseCase(ideaRepo, eventBus);
  const fetchSignalsUseCase = new FetchSignalsUseCase(
    signalRepo,
    eventBus,
    idempotencyStore,
    sourceAdapters,
  );
  const recordFeedbackUseCase = new RecordFeedbackUseCase(feedbackRepo);

  // Wire: idea.created.v1 → FetchSignalsUseCase
  eventBus.subscribe<IdeaCreatedV1['payload']>('idea.created.v1', async (event: DomainEvent<IdeaCreatedV1['payload']>) => {
    await fetchSignalsUseCase.execute({
      ideaId: event.payload.ideaId,
      ideaText: event.payload.text,
      traceId: event.traceId,
      eventId: event.eventId,
    });
  });

  return {
    createIdeaUseCase,
    fetchSignalsUseCase,
    recordFeedbackUseCase,
    eventBus,
    _repos: { ideaRepo, signalRepo, decisionRepo, feedbackRepo, idempotencyStore },
  };
}

// Singleton per process (Next.js module caching handles this in dev + prod)
export const container = buildContainer();
