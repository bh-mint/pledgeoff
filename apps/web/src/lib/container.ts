import {
  SupabaseIdeaRepository,
  SupabaseSignalRepository,
  SupabaseDecisionRepository,
  SupabaseFeedbackRepository,
  SupabaseIdempotencyStore,
  SupabaseAuditLogAdapter,
  RedditSourceAdapter,
  GitHubSourceAdapter,
  GroqLLMAdapter,
  AnthropicLLMAdapter,
} from '@pledgeoff/adapters';
import { PostgresEventBus } from '@pledgeoff/eventbus';
import {
  CreateIdeaUseCase,
  FetchSignalsUseCase,
  DecideUseCase,
  RecordFeedbackUseCase,
} from '@pledgeoff/core';
import type { IdeaCreatedV1, SignalsFetchedV1 } from '@pledgeoff/contracts';
import type { DomainEvent } from '@pledgeoff/core';
import { createServiceRoleClient } from './supabase-server';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function buildContainer() {
  const supabase = createServiceRoleClient();

  const auditLog = new SupabaseAuditLogAdapter(supabase);
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
  const llmProvider = process.env.LLM_PROVIDER ?? 'groq';
  const llmClient =
    llmProvider === 'anthropic'
      ? new AnthropicLLMAdapter(requireEnv('ANTHROPIC_API_KEY'), process.env.ANTHROPIC_MODEL)
      : new GroqLLMAdapter(requireEnv('GROQ_API_KEY'));

  const createIdeaUseCase = new CreateIdeaUseCase(ideaRepo, eventBus);
  const fetchSignalsUseCase = new FetchSignalsUseCase(
    signalRepo,
    eventBus,
    idempotencyStore,
    sourceAdapters,
  );
  const decideUseCase = new DecideUseCase(
    signalRepo,
    decisionRepo,
    llmClient,
    eventBus,
    idempotencyStore,
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

  // Wire: signals.fetched.v1 → DecideUseCase
  // Fetches idea text from DB since payload only has ideaId
  eventBus.subscribe<SignalsFetchedV1['payload']>('signals.fetched.v1', async (event: DomainEvent<SignalsFetchedV1['payload']>) => {
    const ideaResult = await ideaRepo.findById(event.payload.ideaId);
    if (ideaResult.isErr() || !ideaResult.value) return;

    await decideUseCase.execute({
      ideaId: event.payload.ideaId,
      ideaText: ideaResult.value.text,
      traceId: event.traceId,
      eventId: event.eventId,
    });
  });

  return {
    createIdeaUseCase,
    fetchSignalsUseCase,
    decideUseCase,
    recordFeedbackUseCase,
    eventBus,
    auditLog,
    _repos: { ideaRepo, signalRepo, decisionRepo, feedbackRepo, idempotencyStore },
  };
}

// Singleton per process (Next.js module caching handles this in dev + prod)
export const container = buildContainer();
