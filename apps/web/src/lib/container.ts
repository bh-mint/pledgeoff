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
  SupabaseCompetitorAnalysisRepository,
  SupabaseSubscriptionRepository,
  SupabaseTeamRepository,
  StripeAdapter,
  HNSourceAdapter,
  DevToSourceAdapter,
  GitHubSourceAdapter,
  BraveSearchSourceAdapter,
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
  AnalyzeCompetitorsUseCase,
  GetOrCreateSubscriptionUseCase,
  InviteTeamMemberUseCase,
  AcceptTeamInviteUseCase,
  RemoveTeamMemberUseCase,
} from '@pledgeoff/core';
import type { IdeaCreatedV1, SignalsFetchedV1, DecisionReadyV1 } from '@pledgeoff/contracts';
import type { DomainEvent } from '@pledgeoff/core';
import { createSupabaseServiceClient } from './supabase-server';
import { sendVerdictEmail } from '@pledgeoff/adapters';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const PROD_SUPABASE_REF = 'gphupxlfmeokquvyxqfw';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
if (process.env.NODE_ENV !== 'production' && supabaseUrl.includes(PROD_SUPABASE_REF)) {
  throw new Error(
    `[ENV GUARD] Dev environment is pointing to PRODUCTION Supabase (${supabaseUrl}). ` +
    'Set NEXT_PUBLIC_SUPABASE_URL to dev project in .env.local.',
  );
}

function buildContainer() {
  const supabase = createSupabaseServiceClient();

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
  const competitorAnalysisRepo = new SupabaseCompetitorAnalysisRepository(supabase);
  const subscriptionRepo = new SupabaseSubscriptionRepository(supabase);
  const teamRepo = new SupabaseTeamRepository(supabase);

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (process.env.NODE_ENV === 'production' && stripeSecretKey?.startsWith('sk_test_')) {
    console.warn('[container] WARNING: Production is using Stripe test keys. Set STRIPE_SECRET_KEY to sk_live_... before going live.');
  }
  const stripeMode = stripeSecretKey?.startsWith('sk_live_') ? 'live' : stripeSecretKey ? 'test' : 'disabled';
  console.info(`[container] Stripe mode: ${stripeMode}`);
  const stripeAdapter = stripeSecretKey ? new StripeAdapter(stripeSecretKey) : null;

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
    new HNSourceAdapter(8_000, 2, cache),
    new DevToSourceAdapter(8_000, 2, cache),
    new GitHubSourceAdapter(process.env.GITHUB_PAT ?? '', 8_000, 2, cache),
    ...(process.env.BRAVE_SEARCH_API_KEY
      ? [new BraveSearchSourceAdapter(process.env.BRAVE_SEARCH_API_KEY, 8_000, 2, cache)]
      : []),
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
    llmClient,
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
  const analyzeCompetitorsUseCase = new AnalyzeCompetitorsUseCase(competitorAnalysisRepo, signalRepo, llmClient);
  const getOrCreateSubscriptionUseCase = new GetOrCreateSubscriptionUseCase(subscriptionRepo);
  const inviteTeamMemberUseCase = new InviteTeamMemberUseCase(teamRepo);
  const acceptTeamInviteUseCase = new AcceptTeamInviteUseCase(teamRepo);
  const removeTeamMemberUseCase = new RemoveTeamMemberUseCase(teamRepo);

  // Wire: idea.created.v1 → FetchSignalsUseCase
  eventBus.subscribe<IdeaCreatedV1['payload']>('idea.created.v1', async (event: DomainEvent<IdeaCreatedV1['payload']>) => {
    const result = await fetchSignalsUseCase.execute({
      ideaId: event.payload.ideaId,
      ideaText: event.payload.text,
      traceId: event.traceId,
      eventId: event.eventId,
    });
    if (result.isErr()) {
      throw new Error(`FetchSignalsUseCase failed: ${result.error.message}`);
    }
  });

  // Wire: signals.fetched.v1 → DecideUseCase
  eventBus.subscribe<SignalsFetchedV1['payload']>('signals.fetched.v1', async (event: DomainEvent<SignalsFetchedV1['payload']>) => {
    const ideaResult = await ideaRepo.findById(event.payload.ideaId);
    if (ideaResult.isErr() || !ideaResult.value) {
      throw new Error(`Idea not found for DecideUseCase: ${event.payload.ideaId}`);
    }

    const result = await decideUseCase.execute({
      ideaId: event.payload.ideaId,
      ideaText: ideaResult.value.text,
      traceId: event.traceId,
      eventId: event.eventId,
    });
    if (result.isErr()) {
      throw new Error(`DecideUseCase failed: ${result.error.message}`);
    }
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

      const decisionResult = await decisionRepo.findByIdeaId(event.payload.ideaId);
      const decision = decisionResult.isOk() ? decisionResult.value : null;
      const dims = decision?.dimensions;
      const score = dims?.length
        ? Math.round(dims.reduce((sum: number, d: { weight: number; score: number }) => sum + d.weight * d.score, 0))
        : Math.round(event.payload.confidence * 100);

      await sendVerdictEmail(resendApiKey, {
        to: userEmail,
        ideaId: idea.id,
        ideaText: idea.text,
        verdict: event.payload.verdict,
        score,
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
    analyzeCompetitorsUseCase,
    getOrCreateSubscriptionUseCase,
    stripeAdapter,
    subscriptionRepo,
    teamRepo,
    inviteTeamMemberUseCase,
    acceptTeamInviteUseCase,
    removeTeamMemberUseCase,
    ideaRepo,
    eventBus,
    auditLog,
    _repos: { ideaRepo, signalRepo, decisionRepo, feedbackRepo, idempotencyStore, simulationRepo, landingPageRepo, customerAnalysisRepo, buildAnalysisRepo, competitorAnalysisRepo, subscriptionRepo, teamRepo },
  };
}

// Singleton per process (Next.js module caching handles this in dev + prod)
export const container = buildContainer();
