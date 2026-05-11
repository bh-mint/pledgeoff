import {
  SupabaseIdeaRepository,
  SupabaseSignalRepository,
  SupabaseDecisionRepository,
  SupabaseFeedbackRepository,
  SupabaseIdempotencyStore,
  SupabaseAuditLogAdapter,
  SupabaseSimulationRepository,
  SupabaseLandingPageRepository,
  SupabaseCustomerAnalysisRepository,
  SupabaseBuildAnalysisRepository,
  RedditSourceAdapter,
  GitHubSourceAdapter,
  GroqLLMAdapter,
  AnthropicLLMAdapter,
  InMemoryCacheAdapter,
  UpstashRedisCacheAdapter,
} from '@pledgeoff/adapters';
import type { ICache } from '@pledgeoff/core';
import { PostgresEventBus, RedisStreamsEventBus } from '@pledgeoff/eventbus';
import {
  CreateIdeaUseCase,
  FetchSignalsUseCase,
  DecideUseCase,
  RecordFeedbackUseCase,
  SimulateRevenueUseCase,
  GenerateLandingUseCase,
  AnalyzeCustomersUseCase,
  AnalyzeBuildUseCase,
} from '@pledgeoff/core';
import type { IdeaCreatedV1, SignalsFetchedV1, DecisionReadyV1 } from '@pledgeoff/contracts';
import type { DomainEvent } from '@pledgeoff/core';
import { createServiceRoleClient } from './supabase-server';
import { sendVerdictEmail } from '@pledgeoff/adapters';

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
  const simulationRepo = new SupabaseSimulationRepository(supabase);
  const landingPageRepo = new SupabaseLandingPageRepository(supabase);
  const customerAnalysisRepo = new SupabaseCustomerAnalysisRepository(supabase);
  const buildAnalysisRepo = new SupabaseBuildAnalysisRepository(supabase);

  const eventBusProvider = process.env.EVENT_BUS_PROVIDER ?? 'postgres';
  const eventBus =
    eventBusProvider === 'redis-streams'
      ? new RedisStreamsEventBus(
          supabase,
          requireEnv('UPSTASH_REDIS_REST_URL'),
          requireEnv('UPSTASH_REDIS_REST_TOKEN'),
        )
      : new PostgresEventBus(supabase);

  const cacheProvider = process.env.CACHE_PROVIDER ?? 'memory';
  const cache: ICache =
    cacheProvider === 'redis'
      ? new UpstashRedisCacheAdapter(
          requireEnv('UPSTASH_REDIS_REST_URL'),
          requireEnv('UPSTASH_REDIS_REST_TOKEN'),
        )
      : new InMemoryCacheAdapter();

  const sourceAdapters = [
    new RedditSourceAdapter(10_000, 3, cache),
    new GitHubSourceAdapter(requireEnv('GITHUB_PAT'), 10_000, 3, cache),
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
  const simulateRevenueUseCase = new SimulateRevenueUseCase(simulationRepo, signalRepo, llmClient);
  const generateLandingUseCase = new GenerateLandingUseCase(landingPageRepo, llmClient);
  const analyzeCustomersUseCase = new AnalyzeCustomersUseCase(customerAnalysisRepo, signalRepo, llmClient);
  const analyzeBuildUseCase = new AnalyzeBuildUseCase(buildAnalysisRepo, signalRepo, llmClient);

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

  // Wire: decision.ready.v1 → send verdict email (fire-and-forget, never blocks pipeline)
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    eventBus.subscribe<DecisionReadyV1['payload']>('decision.ready.v1', async (event: DomainEvent<DecisionReadyV1['payload']>) => {
      const ideaResult = await ideaRepo.findById(event.payload.ideaId);
      if (ideaResult.isErr() || !ideaResult.value) return;
      const idea = ideaResult.value;

      const { data } = await supabase.auth.admin.getUserById(idea.userId);
      const userEmail = data?.user?.email;
      if (!userEmail) return;

      await sendVerdictEmail(resendApiKey, {
        to: userEmail,
        ideaId: idea.id,
        ideaText: idea.text,
        verdict: event.payload.verdict,
        score: Math.round(event.payload.confidence * 100),
        traceId: event.traceId,
      });
    });
  }

  return {
    createIdeaUseCase,
    fetchSignalsUseCase,
    decideUseCase,
    recordFeedbackUseCase,
    simulateRevenueUseCase,
    generateLandingUseCase,
    analyzeCustomersUseCase,
    analyzeBuildUseCase,
    eventBus,
    auditLog,
    _repos: { ideaRepo, signalRepo, decisionRepo, feedbackRepo, idempotencyStore, simulationRepo, landingPageRepo, customerAnalysisRepo, buildAnalysisRepo },
  };
}

// Singleton per process (Next.js module caching handles this in dev + prod)
export const container = buildContainer();
