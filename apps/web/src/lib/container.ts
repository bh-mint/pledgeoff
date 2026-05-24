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
  SupabaseIdeaReactionRepository,
  SupabaseOttoConversationRepository,
  SupabaseApiKeyRepository,
  SupabaseUsageLogAdapter,
  SupabaseLaunchKitRepository,
  SupabaseDecisionQueueRepository,
  SupabaseEngineeringSnapshotRepository,
  SupabaseDecisionOutcomeRepository,
  GitHubVelocityAdapter,
  StripeAdapter,
  HNSourceAdapter,
  DevToSourceAdapter,
  GitHubSourceAdapter,
  BraveSearchSourceAdapter,
  GoogleSearchSourceAdapter,
  GroqLLMAdapter,
  AnthropicLLMAdapter,
  InMemoryCacheAdapter,
  UpstashRedisCacheAdapter,
  VoyageEmbeddingAdapter,
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
  LeaveTeamUseCase,
  UpdateTeamNameUseCase,
  UpdateTeamSeatsUseCase,
  ReactToIdeaUseCase,
  AskOttoUseCase,
  GetOttoBalanceUseCase,
  GenerateApiKeyUseCase,
  RevokeApiKeyUseCase,
  ListApiKeysUseCase,
  GetDecisionTimelineUseCase,
  GenerateLaunchKitUseCase,
  UpdateDecisionQueueUseCase,
  GetDecisionQueueUseCase,
  ConnectGitHubUseCase,
  RefreshEngineeringSnapshotUseCase,
  EstimateDeliveryUseCase,
  RecordOutcomeUseCase,
  GetFlywheelStatsUseCase,
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
  const ideaReactionRepo = new SupabaseIdeaReactionRepository(supabase);

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  // Guard: dev must never use live Stripe keys (would charge real money)
  if (process.env.NODE_ENV !== 'production' && stripeSecretKey?.startsWith('sk_live_')) {
    throw new Error(
      '[ENV GUARD] Development environment is using Stripe LIVE keys. ' +
      'Use sk_test_... in .env.local to avoid real charges.',
    );
  }
  // Guard: prod should not use test keys (soft warn — allows testing period before go-live)
  if (process.env.NODE_ENV === 'production' && stripeSecretKey?.startsWith('sk_test_')) {
    console.warn('[container] WARNING: Production is using Stripe test keys. Set STRIPE_SECRET_KEY to sk_live_... before going live.');
  }

  // Startup validation: all price IDs must be present when Stripe is configured (§17.5)
  if (stripeSecretKey) {
    const requiredStripeEnvs = [
      'STRIPE_WEBHOOK_SECRET',
      'STRIPE_PRO_MONTHLY_PRICE_ID',
      'STRIPE_PRO_ANNUAL_PRICE_ID',
      'STRIPE_PRO_PLUS_MONTHLY_PRICE_ID',
      'STRIPE_PRO_PLUS_ANNUAL_PRICE_ID',
    ] as const;
    for (const name of requiredStripeEnvs) {
      if (!process.env[name]) {
        throw new Error(`[ENV GUARD] Stripe is configured but ${name} is missing. Add it to .env.local or Vercel env vars.`);
      }
    }
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
    ...(process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID
      ? [new GoogleSearchSourceAdapter(process.env.GOOGLE_SEARCH_API_KEY, process.env.GOOGLE_SEARCH_ENGINE_ID, 10_000, 2, cache)]
      : []),
  ];
  const usageLogger = new SupabaseUsageLogAdapter(supabase);

  const llmProvider = process.env.LLM_PROVIDER ?? 'groq';
  const llmClient =
    llmProvider === 'anthropic'
      ? new AnthropicLLMAdapter(requireEnv('ANTHROPIC_API_KEY'), process.env.ANTHROPIC_MODEL, usageLogger)
      : new GroqLLMAdapter(requireEnv('GROQ_API_KEY'));

  const createIdeaUseCase = new CreateIdeaUseCase(ideaRepo, eventBus);
  const fetchSignalsUseCase = new FetchSignalsUseCase(
    signalRepo,
    eventBus,
    idempotencyStore,
    sourceAdapters,
    llmClient,
  );
  const embeddingClient = process.env.VOYAGE_API_KEY
    ? new VoyageEmbeddingAdapter(process.env.VOYAGE_API_KEY)
    : undefined;

  const decideUseCase = new DecideUseCase(
    signalRepo,
    decisionRepo,
    llmClient,
    eventBus,
    idempotencyStore,
    embeddingClient,
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
  const leaveTeamUseCase = new LeaveTeamUseCase(teamRepo);
  const updateTeamNameUseCase = new UpdateTeamNameUseCase(teamRepo);
  const updateTeamSeatsUseCase = new UpdateTeamSeatsUseCase(subscriptionRepo);
  const reactToIdeaUseCase = new ReactToIdeaUseCase(ideaReactionRepo);
  const ottoConversationRepo = new SupabaseOttoConversationRepository(supabase);
  // Otto always uses Anthropic Haiku regardless of LLM_PROVIDER
  const ottoLLMClient = process.env.ANTHROPIC_API_KEY
    ? new AnthropicLLMAdapter(process.env.ANTHROPIC_API_KEY, 'claude-haiku-4-5-20251001', usageLogger)
    : llmClient;
  const askOttoUseCase = new AskOttoUseCase(ottoConversationRepo, subscriptionRepo, ottoLLMClient);
  const getOttoBalanceUseCase = new GetOttoBalanceUseCase(subscriptionRepo);

  const launchKitRepo = new SupabaseLaunchKitRepository(supabase);
  const generateLaunchKitUseCase = new GenerateLaunchKitUseCase(ideaRepo, signalRepo, launchKitRepo, llmClient);

  const decisionQueueRepo = new SupabaseDecisionQueueRepository(supabase);
  const updateDecisionQueueUseCase = new UpdateDecisionQueueUseCase(ideaRepo, decisionRepo, decisionQueueRepo, llmClient);
  const getDecisionQueueUseCase = new GetDecisionQueueUseCase(decisionQueueRepo, ideaRepo, decisionRepo);

  const engineeringSnapshotRepo = new SupabaseEngineeringSnapshotRepository(
    supabase,
    process.env.GITHUB_TOKEN_MASTER_KEY ?? '',
  );
  const gitHubVelocityAdapter = new GitHubVelocityAdapter();
  const connectGitHubUseCase = new ConnectGitHubUseCase(gitHubVelocityAdapter, engineeringSnapshotRepo);
  const refreshEngineeringSnapshotUseCase = new RefreshEngineeringSnapshotUseCase(gitHubVelocityAdapter, engineeringSnapshotRepo);
  const estimateDeliveryUseCase = new EstimateDeliveryUseCase(buildAnalysisRepo, engineeringSnapshotRepo);

  const decisionOutcomeRepo = new SupabaseDecisionOutcomeRepository(supabase);
  const recordOutcomeUseCase = new RecordOutcomeUseCase(decisionOutcomeRepo, decisionRepo);
  const getFlywheelStatsUseCase = new GetFlywheelStatsUseCase(decisionOutcomeRepo);

  const apiKeyRepo = new SupabaseApiKeyRepository(supabase);
  const generateApiKeyUseCase = new GenerateApiKeyUseCase(apiKeyRepo);
  const revokeApiKeyUseCase = new RevokeApiKeyUseCase(apiKeyRepo);
  const listApiKeysUseCase = new ListApiKeysUseCase(apiKeyRepo);
  const getDecisionTimelineUseCase = new GetDecisionTimelineUseCase(ideaRepo, decisionRepo, feedbackRepo);

  // Wire: idea.created.v1 → FetchSignalsUseCase → generate embeddings for new signals (fire-and-forget)
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

    // Generate and save embeddings for newly fetched signals (non-blocking)
    if (embeddingClient && result.value) {
      void (async () => {
        const signals = Array.isArray(result.value) ? result.value : [];
        const entries: Array<{ id: string; embedding: number[] }> = [];
        for (const signal of signals) {
          const text = `${signal.title} ${signal.summary}`.trim();
          const embResult = await embeddingClient.embed(text);
          if (embResult.isOk()) entries.push({ id: signal.id, embedding: embResult.value });
        }
        if (entries.length > 0) await signalRepo.saveEmbeddings(entries);
      })();
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
    leaveTeamUseCase,
    updateTeamNameUseCase,
    updateTeamSeatsUseCase,
    reactToIdeaUseCase,
    askOttoUseCase,
    getOttoBalanceUseCase,
    ideaRepo,
    eventBus,
    auditLog,
    apiKeyRepo,
    generateApiKeyUseCase,
    revokeApiKeyUseCase,
    listApiKeysUseCase,
    getDecisionTimelineUseCase,
    generateLaunchKitUseCase,
    updateDecisionQueueUseCase,
    getDecisionQueueUseCase,
    connectGitHubUseCase,
    refreshEngineeringSnapshotUseCase,
    estimateDeliveryUseCase,
    engineeringSnapshotRepo,
    recordOutcomeUseCase,
    getFlywheelStatsUseCase,
    _repos: { ideaRepo, signalRepo, decisionRepo, feedbackRepo, idempotencyStore, simulationRepo, landingPageRepo, customerAnalysisRepo, buildAnalysisRepo, competitorAnalysisRepo, launchKitRepo, subscriptionRepo, teamRepo, ideaReactionRepo, decisionOutcomeRepo },
  };
}

// Singleton per process (Next.js module caching handles this in dev + prod)
export const container = buildContainer();
