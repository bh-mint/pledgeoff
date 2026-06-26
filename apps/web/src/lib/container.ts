import * as Sentry from '@sentry/nextjs';
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
  SupabaseApiRequestLogRepository,
  SupabaseUsageLogAdapter,
  SupabaseLaunchKitRepository,
  SupabaseFeatureAnalysisRepository,
  SupabaseBattlecardRepository,
  SupabaseMarketLandscapeRepository,
  SupabaseInterviewGuideRepository,
  SupabaseTranscriptAnalysisRepository,
  SupabaseDecisionQueueRepository,
  SupabaseEngineeringSnapshotRepository,
  SupabaseDecisionOutcomeRepository,
  SupabaseNotificationRepository,
  SupabaseWebhookConfigRepository,
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
  sendVerdictEmail,
} from '@pledgeoff/adapters';
import type { ICache, ISourceAdapter, ILLMClient, IEmbeddingClient } from '@pledgeoff/core';
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
  GenerateInviteLinkUseCase,
  JoinViaInviteLinkUseCase,
  UpdateMemberRoleUseCase,
  DeleteIdeaUseCase,
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
  GetUsersAccuracyReportUseCase,
  RegisterWebhookUseCase,
  AddDomainAllowlistUseCase,
  RemoveDomainAllowlistUseCase,
  AutoJoinByDomainUseCase,
  AnalyzeFeaturesUseCase,
  GenerateBattlecardUseCase,
  GenerateMarketLandscapeUseCase,
  GenerateInterviewGuideUseCase,
  AnalyzeTranscriptUseCase,
} from '@pledgeoff/core';
import type { IdeaCreatedV1, SignalsFetchedV1, DecisionReadyV1 } from '@pledgeoff/contracts';
import type { DomainEvent } from '@pledgeoff/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServiceClient } from './supabase-server';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

class AppContainer {
  // ── eagerly initialized infrastructure ───────────────────────────────────
  private readonly _supabase: SupabaseClient;
  private readonly _eventBus: PostgresEventBus | RedisStreamsEventBus;
  private readonly _cache: ICache;
  private readonly _llmClient: ILLMClient;
  private readonly _ottoLLMClient: ILLMClient;
  private readonly _embeddingClient: IEmbeddingClient | undefined;
  private readonly _sourceAdapters: ISourceAdapter[];
  private readonly _usageLogger: SupabaseUsageLogAdapter;
  readonly stripeAdapter: StripeAdapter | null;

  // ── lazy repos ─────────────────────────────────────────────────────────────
  private _ideaRepo?: SupabaseIdeaRepository;
  get ideaRepo(): SupabaseIdeaRepository {
    return (this._ideaRepo ??= new SupabaseIdeaRepository(this._supabase));
  }

  private _signalRepo?: SupabaseSignalRepository;
  get signalRepo(): SupabaseSignalRepository {
    return (this._signalRepo ??= new SupabaseSignalRepository(this._supabase));
  }

  private _decisionRepo?: SupabaseDecisionRepository;
  get decisionRepo(): SupabaseDecisionRepository {
    return (this._decisionRepo ??= new SupabaseDecisionRepository(this._supabase));
  }

  private _feedbackRepo?: SupabaseFeedbackRepository;
  get feedbackRepo(): SupabaseFeedbackRepository {
    return (this._feedbackRepo ??= new SupabaseFeedbackRepository(this._supabase));
  }

  private _idempotencyStore?: SupabaseIdempotencyStore;
  get idempotencyStore(): SupabaseIdempotencyStore {
    return (this._idempotencyStore ??= new SupabaseIdempotencyStore(this._supabase));
  }

  private _auditLog?: SupabaseAuditLogAdapter;
  get auditLog(): SupabaseAuditLogAdapter {
    return (this._auditLog ??= new SupabaseAuditLogAdapter(this._supabase));
  }

  private _simulationRepo?: SupabaseSimulationRepository;
  get simulationRepo(): SupabaseSimulationRepository {
    return (this._simulationRepo ??= new SupabaseSimulationRepository(this._supabase));
  }

  private _landingPageRepo?: SupabaseLandingPageRepository;
  get landingPageRepo(): SupabaseLandingPageRepository {
    return (this._landingPageRepo ??= new SupabaseLandingPageRepository(this._supabase));
  }

  private _customerAnalysisRepo?: SupabaseCustomerAnalysisRepository;
  get customerAnalysisRepo(): SupabaseCustomerAnalysisRepository {
    return (this._customerAnalysisRepo ??= new SupabaseCustomerAnalysisRepository(this._supabase));
  }

  private _buildAnalysisRepo?: SupabaseBuildAnalysisRepository;
  get buildAnalysisRepo(): SupabaseBuildAnalysisRepository {
    return (this._buildAnalysisRepo ??= new SupabaseBuildAnalysisRepository(this._supabase));
  }

  private _competitorAnalysisRepo?: SupabaseCompetitorAnalysisRepository;
  get competitorAnalysisRepo(): SupabaseCompetitorAnalysisRepository {
    return (this._competitorAnalysisRepo ??= new SupabaseCompetitorAnalysisRepository(this._supabase));
  }

  private _subscriptionRepo?: SupabaseSubscriptionRepository;
  get subscriptionRepo(): SupabaseSubscriptionRepository {
    return (this._subscriptionRepo ??= new SupabaseSubscriptionRepository(this._supabase));
  }

  private _teamRepo?: SupabaseTeamRepository;
  get teamRepo(): SupabaseTeamRepository {
    return (this._teamRepo ??= new SupabaseTeamRepository(this._supabase));
  }

  private _ideaReactionRepo?: SupabaseIdeaReactionRepository;
  get ideaReactionRepo(): SupabaseIdeaReactionRepository {
    return (this._ideaReactionRepo ??= new SupabaseIdeaReactionRepository(this._supabase));
  }

  private _ottoConversationRepo?: SupabaseOttoConversationRepository;
  get ottoConversationRepo(): SupabaseOttoConversationRepository {
    return (this._ottoConversationRepo ??= new SupabaseOttoConversationRepository(this._supabase));
  }

  private _apiKeyRepo?: SupabaseApiKeyRepository;
  get apiKeyRepo(): SupabaseApiKeyRepository {
    return (this._apiKeyRepo ??= new SupabaseApiKeyRepository(this._supabase));
  }

  private _apiRequestLog?: SupabaseApiRequestLogRepository;
  get apiRequestLog(): SupabaseApiRequestLogRepository {
    return (this._apiRequestLog ??= new SupabaseApiRequestLogRepository(this._supabase));
  }

  private _launchKitRepo?: SupabaseLaunchKitRepository;
  get launchKitRepo(): SupabaseLaunchKitRepository {
    return (this._launchKitRepo ??= new SupabaseLaunchKitRepository(this._supabase));
  }

  private _decisionQueueRepo?: SupabaseDecisionQueueRepository;
  get decisionQueueRepo(): SupabaseDecisionQueueRepository {
    return (this._decisionQueueRepo ??= new SupabaseDecisionQueueRepository(this._supabase));
  }

  private _engineeringSnapshotRepo?: SupabaseEngineeringSnapshotRepository;
  get engineeringSnapshotRepo(): SupabaseEngineeringSnapshotRepository {
    return (this._engineeringSnapshotRepo ??= new SupabaseEngineeringSnapshotRepository(
      this._supabase,
      process.env.GITHUB_TOKEN_MASTER_KEY ?? '',
    ));
  }

  private _decisionOutcomeRepo?: SupabaseDecisionOutcomeRepository;
  get decisionOutcomeRepo(): SupabaseDecisionOutcomeRepository {
    return (this._decisionOutcomeRepo ??= new SupabaseDecisionOutcomeRepository(this._supabase));
  }

  private _notificationRepo?: SupabaseNotificationRepository;
  get notificationRepo(): SupabaseNotificationRepository {
    return (this._notificationRepo ??= new SupabaseNotificationRepository(this._supabase));
  }

  private _webhookConfigRepo?: SupabaseWebhookConfigRepository;
  get webhookConfigRepo(): SupabaseWebhookConfigRepository {
    return (this._webhookConfigRepo ??= new SupabaseWebhookConfigRepository(this._supabase));
  }

  private _featureAnalysisRepo?: SupabaseFeatureAnalysisRepository;
  get featureAnalysisRepo(): SupabaseFeatureAnalysisRepository {
    return (this._featureAnalysisRepo ??= new SupabaseFeatureAnalysisRepository(this._supabase));
  }

  private _battlecardRepo?: SupabaseBattlecardRepository;
  get battlecardRepo(): SupabaseBattlecardRepository {
    return (this._battlecardRepo ??= new SupabaseBattlecardRepository(this._supabase));
  }

  private _marketLandscapeRepo?: SupabaseMarketLandscapeRepository;
  get marketLandscapeRepo(): SupabaseMarketLandscapeRepository {
    return (this._marketLandscapeRepo ??= new SupabaseMarketLandscapeRepository(this._supabase));
  }

  // ── lazy use-cases ─────────────────────────────────────────────────────────
  private _createIdeaUseCase?: CreateIdeaUseCase;
  get createIdeaUseCase(): CreateIdeaUseCase {
    return (this._createIdeaUseCase ??= new CreateIdeaUseCase(this.ideaRepo));
  }

  private _fetchSignalsUseCase?: FetchSignalsUseCase;
  get fetchSignalsUseCase(): FetchSignalsUseCase {
    return (this._fetchSignalsUseCase ??= new FetchSignalsUseCase(
      this.signalRepo,
      this._eventBus,
      this.idempotencyStore,
      this._sourceAdapters,
      this._llmClient,
    ));
  }

  private _decideUseCase?: DecideUseCase;
  get decideUseCase(): DecideUseCase {
    return (this._decideUseCase ??= new DecideUseCase(
      this.signalRepo,
      this.decisionRepo,
      this._llmClient,
      this._eventBus,
      this.idempotencyStore,
      this._embeddingClient,
      this.decisionOutcomeRepo,
    ));
  }

  private _recordFeedbackUseCase?: RecordFeedbackUseCase;
  get recordFeedbackUseCase(): RecordFeedbackUseCase {
    return (this._recordFeedbackUseCase ??= new RecordFeedbackUseCase(this.feedbackRepo));
  }

  private _simulateRevenueUseCase?: SimulateRevenueUseCase;
  get simulateRevenueUseCase(): SimulateRevenueUseCase {
    return (this._simulateRevenueUseCase ??= new SimulateRevenueUseCase(
      this.simulationRepo,
      this.signalRepo,
      this._llmClient,
    ));
  }

  private _generateLandingUseCase?: GenerateLandingUseCase;
  get generateLandingUseCase(): GenerateLandingUseCase {
    return (this._generateLandingUseCase ??= new GenerateLandingUseCase(
      this.landingPageRepo,
      this._llmClient,
      this.signalRepo,
    ));
  }

  private _analyzeCustomersUseCase?: AnalyzeCustomersUseCase;
  get analyzeCustomersUseCase(): AnalyzeCustomersUseCase {
    return (this._analyzeCustomersUseCase ??= new AnalyzeCustomersUseCase(
      this.customerAnalysisRepo,
      this.signalRepo,
      this._llmClient,
    ));
  }

  private _analyzeBuildUseCase?: AnalyzeBuildUseCase;
  get analyzeBuildUseCase(): AnalyzeBuildUseCase {
    return (this._analyzeBuildUseCase ??= new AnalyzeBuildUseCase(
      this.buildAnalysisRepo,
      this.signalRepo,
      this._llmClient,
    ));
  }

  private _analyzeCompetitorsUseCase?: AnalyzeCompetitorsUseCase;
  get analyzeCompetitorsUseCase(): AnalyzeCompetitorsUseCase {
    return (this._analyzeCompetitorsUseCase ??= new AnalyzeCompetitorsUseCase(
      this.competitorAnalysisRepo,
      this.signalRepo,
      this._llmClient,
    ));
  }

  private _analyzeFeaturesUseCase?: AnalyzeFeaturesUseCase;
  get analyzeFeaturesUseCase(): AnalyzeFeaturesUseCase {
    return (this._analyzeFeaturesUseCase ??= new AnalyzeFeaturesUseCase(
      this._llmClient,
      this.featureAnalysisRepo,
    ));
  }

  private _generateBattlecardUseCase?: GenerateBattlecardUseCase;
  get generateBattlecardUseCase(): GenerateBattlecardUseCase {
    return (this._generateBattlecardUseCase ??= new GenerateBattlecardUseCase(
      this._llmClient,
      this.battlecardRepo,
    ));
  }

  private _generateMarketLandscapeUseCase?: GenerateMarketLandscapeUseCase;
  get generateMarketLandscapeUseCase(): GenerateMarketLandscapeUseCase {
    return (this._generateMarketLandscapeUseCase ??= new GenerateMarketLandscapeUseCase(
      this._llmClient,
      this.marketLandscapeRepo,
      this.signalRepo,
    ));
  }

  private _interviewGuideRepo?: SupabaseInterviewGuideRepository;
  get interviewGuideRepo(): SupabaseInterviewGuideRepository {
    return (this._interviewGuideRepo ??= new SupabaseInterviewGuideRepository(this._supabase));
  }

  private _transcriptAnalysisRepo?: SupabaseTranscriptAnalysisRepository;
  get transcriptAnalysisRepo(): SupabaseTranscriptAnalysisRepository {
    return (this._transcriptAnalysisRepo ??= new SupabaseTranscriptAnalysisRepository(this._supabase));
  }

  private _generateInterviewGuideUseCase?: GenerateInterviewGuideUseCase;
  get generateInterviewGuideUseCase(): GenerateInterviewGuideUseCase {
    return (this._generateInterviewGuideUseCase ??= new GenerateInterviewGuideUseCase(
      this._llmClient,
      this.interviewGuideRepo,
      this.customerAnalysisRepo,
    ));
  }

  private _analyzeTranscriptUseCase?: AnalyzeTranscriptUseCase;
  get analyzeTranscriptUseCase(): AnalyzeTranscriptUseCase {
    return (this._analyzeTranscriptUseCase ??= new AnalyzeTranscriptUseCase(
      this._llmClient,
      this.transcriptAnalysisRepo,
      this.interviewGuideRepo,
    ));
  }

  private _getOrCreateSubscriptionUseCase?: GetOrCreateSubscriptionUseCase;
  get getOrCreateSubscriptionUseCase(): GetOrCreateSubscriptionUseCase {
    return (this._getOrCreateSubscriptionUseCase ??= new GetOrCreateSubscriptionUseCase(
      this.subscriptionRepo,
    ));
  }

  private _inviteTeamMemberUseCase?: InviteTeamMemberUseCase;
  get inviteTeamMemberUseCase(): InviteTeamMemberUseCase {
    return (this._inviteTeamMemberUseCase ??= new InviteTeamMemberUseCase(this.teamRepo));
  }

  private _acceptTeamInviteUseCase?: AcceptTeamInviteUseCase;
  get acceptTeamInviteUseCase(): AcceptTeamInviteUseCase {
    return (this._acceptTeamInviteUseCase ??= new AcceptTeamInviteUseCase(this.teamRepo));
  }

  private _removeTeamMemberUseCase?: RemoveTeamMemberUseCase;
  get removeTeamMemberUseCase(): RemoveTeamMemberUseCase {
    return (this._removeTeamMemberUseCase ??= new RemoveTeamMemberUseCase(this.teamRepo));
  }

  private _leaveTeamUseCase?: LeaveTeamUseCase;
  get leaveTeamUseCase(): LeaveTeamUseCase {
    return (this._leaveTeamUseCase ??= new LeaveTeamUseCase(this.teamRepo));
  }

  private _updateTeamNameUseCase?: UpdateTeamNameUseCase;
  get updateTeamNameUseCase(): UpdateTeamNameUseCase {
    return (this._updateTeamNameUseCase ??= new UpdateTeamNameUseCase(this.teamRepo));
  }

  private _updateTeamSeatsUseCase?: UpdateTeamSeatsUseCase;
  get updateTeamSeatsUseCase(): UpdateTeamSeatsUseCase {
    return (this._updateTeamSeatsUseCase ??= new UpdateTeamSeatsUseCase(this.subscriptionRepo));
  }

  private _generateInviteLinkUseCase?: GenerateInviteLinkUseCase;
  get generateInviteLinkUseCase(): GenerateInviteLinkUseCase {
    return (this._generateInviteLinkUseCase ??= new GenerateInviteLinkUseCase(this.teamRepo));
  }

  private _joinViaInviteLinkUseCase?: JoinViaInviteLinkUseCase;
  get joinViaInviteLinkUseCase(): JoinViaInviteLinkUseCase {
    return (this._joinViaInviteLinkUseCase ??= new JoinViaInviteLinkUseCase(this.teamRepo));
  }

  private _addDomainAllowlistUseCase?: AddDomainAllowlistUseCase;
  get addDomainAllowlistUseCase(): AddDomainAllowlistUseCase {
    return (this._addDomainAllowlistUseCase ??= new AddDomainAllowlistUseCase(this.teamRepo, this.subscriptionRepo));
  }

  private _removeDomainAllowlistUseCase?: RemoveDomainAllowlistUseCase;
  get removeDomainAllowlistUseCase(): RemoveDomainAllowlistUseCase {
    return (this._removeDomainAllowlistUseCase ??= new RemoveDomainAllowlistUseCase(this.teamRepo, this.subscriptionRepo));
  }

  private _autoJoinByDomainUseCase?: AutoJoinByDomainUseCase;
  get autoJoinByDomainUseCase(): AutoJoinByDomainUseCase {
    return (this._autoJoinByDomainUseCase ??= new AutoJoinByDomainUseCase(this.teamRepo));
  }

  private _updateMemberRoleUseCase?: UpdateMemberRoleUseCase;
  get updateMemberRoleUseCase(): UpdateMemberRoleUseCase {
    return (this._updateMemberRoleUseCase ??= new UpdateMemberRoleUseCase(this.teamRepo));
  }

  private _deleteIdeaUseCase?: DeleteIdeaUseCase;
  get deleteIdeaUseCase(): DeleteIdeaUseCase {
    return (this._deleteIdeaUseCase ??= new DeleteIdeaUseCase(this.ideaRepo));
  }

  private _reactToIdeaUseCase?: ReactToIdeaUseCase;
  get reactToIdeaUseCase(): ReactToIdeaUseCase {
    return (this._reactToIdeaUseCase ??= new ReactToIdeaUseCase(this.ideaReactionRepo));
  }

  private _askOttoUseCase?: AskOttoUseCase;
  get askOttoUseCase(): AskOttoUseCase {
    return (this._askOttoUseCase ??= new AskOttoUseCase(
      this.ottoConversationRepo,
      this.subscriptionRepo,
      this._ottoLLMClient,
    ));
  }

  private _getOttoBalanceUseCase?: GetOttoBalanceUseCase;
  get getOttoBalanceUseCase(): GetOttoBalanceUseCase {
    return (this._getOttoBalanceUseCase ??= new GetOttoBalanceUseCase(this.subscriptionRepo));
  }

  private _generateApiKeyUseCase?: GenerateApiKeyUseCase;
  get generateApiKeyUseCase(): GenerateApiKeyUseCase {
    return (this._generateApiKeyUseCase ??= new GenerateApiKeyUseCase(this.apiKeyRepo));
  }

  private _revokeApiKeyUseCase?: RevokeApiKeyUseCase;
  get revokeApiKeyUseCase(): RevokeApiKeyUseCase {
    return (this._revokeApiKeyUseCase ??= new RevokeApiKeyUseCase(this.apiKeyRepo));
  }

  private _listApiKeysUseCase?: ListApiKeysUseCase;
  get listApiKeysUseCase(): ListApiKeysUseCase {
    return (this._listApiKeysUseCase ??= new ListApiKeysUseCase(this.apiKeyRepo));
  }

  private _getDecisionTimelineUseCase?: GetDecisionTimelineUseCase;
  get getDecisionTimelineUseCase(): GetDecisionTimelineUseCase {
    return (this._getDecisionTimelineUseCase ??= new GetDecisionTimelineUseCase(
      this.ideaRepo,
      this.decisionRepo,
      this.feedbackRepo,
    ));
  }

  private _generateLaunchKitUseCase?: GenerateLaunchKitUseCase;
  get generateLaunchKitUseCase(): GenerateLaunchKitUseCase {
    return (this._generateLaunchKitUseCase ??= new GenerateLaunchKitUseCase(
      this.ideaRepo,
      this.signalRepo,
      this.launchKitRepo,
      this._llmClient,
    ));
  }

  private _updateDecisionQueueUseCase?: UpdateDecisionQueueUseCase;
  get updateDecisionQueueUseCase(): UpdateDecisionQueueUseCase {
    return (this._updateDecisionQueueUseCase ??= new UpdateDecisionQueueUseCase(
      this.ideaRepo,
      this.decisionRepo,
      this.decisionQueueRepo,
      this._llmClient,
    ));
  }

  private _getDecisionQueueUseCase?: GetDecisionQueueUseCase;
  get getDecisionQueueUseCase(): GetDecisionQueueUseCase {
    return (this._getDecisionQueueUseCase ??= new GetDecisionQueueUseCase(
      this.decisionQueueRepo,
      this.ideaRepo,
      this.decisionRepo,
    ));
  }

  private _gitHubVelocityAdapter?: GitHubVelocityAdapter;
  private get gitHubVelocityAdapter(): GitHubVelocityAdapter {
    return (this._gitHubVelocityAdapter ??= new GitHubVelocityAdapter());
  }

  private _connectGitHubUseCase?: ConnectGitHubUseCase;
  get connectGitHubUseCase(): ConnectGitHubUseCase {
    return (this._connectGitHubUseCase ??= new ConnectGitHubUseCase(
      this.gitHubVelocityAdapter,
      this.engineeringSnapshotRepo,
    ));
  }

  private _refreshEngineeringSnapshotUseCase?: RefreshEngineeringSnapshotUseCase;
  get refreshEngineeringSnapshotUseCase(): RefreshEngineeringSnapshotUseCase {
    return (this._refreshEngineeringSnapshotUseCase ??= new RefreshEngineeringSnapshotUseCase(
      this.gitHubVelocityAdapter,
      this.engineeringSnapshotRepo,
    ));
  }

  private _estimateDeliveryUseCase?: EstimateDeliveryUseCase;
  get estimateDeliveryUseCase(): EstimateDeliveryUseCase {
    return (this._estimateDeliveryUseCase ??= new EstimateDeliveryUseCase(
      this.buildAnalysisRepo,
      this.engineeringSnapshotRepo,
    ));
  }

  private _recordOutcomeUseCase?: RecordOutcomeUseCase;
  get recordOutcomeUseCase(): RecordOutcomeUseCase {
    return (this._recordOutcomeUseCase ??= new RecordOutcomeUseCase(
      this.decisionOutcomeRepo,
      this.decisionRepo,
    ));
  }

  private _getFlywheelStatsUseCase?: GetFlywheelStatsUseCase;
  get getFlywheelStatsUseCase(): GetFlywheelStatsUseCase {
    return (this._getFlywheelStatsUseCase ??= new GetFlywheelStatsUseCase(this.decisionOutcomeRepo));
  }

  private _getUsersAccuracyReportUseCase?: GetUsersAccuracyReportUseCase;
  get getUsersAccuracyReportUseCase(): GetUsersAccuracyReportUseCase {
    return (this._getUsersAccuracyReportUseCase ??= new GetUsersAccuracyReportUseCase(
      this.decisionOutcomeRepo,
    ));
  }

  private _registerWebhookUseCase?: RegisterWebhookUseCase;
  get registerWebhookUseCase(): RegisterWebhookUseCase {
    return (this._registerWebhookUseCase ??= new RegisterWebhookUseCase(this.webhookConfigRepo));
  }

  // Deliver outbound webhook for decision.ready.v1 — fire-and-forget
  private async deliverWebhook(
    ideaId: string,
    ideaText: string,
    userId: string,
    verdict: string,
    score: number,
    traceId: string,
  ): Promise<void> {
    const configResult = await this.webhookConfigRepo.findByUserId(userId);
    if (configResult.isErr() || !configResult.value?.active) return;

    const { url, signingSecret } = configResult.value;
    const payload = JSON.stringify({
      event: 'decision.ready',
      version: '1',
      timestamp: new Date().toISOString(),
      data: { ideaId, ideaText, verdict, score, verdictUrl: `https://pledgeoff.com/ideas/${ideaId}`, traceId },
    });

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(signingSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const sigHex = Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');

    try {
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-PledgeOFF-Signature': `sha256=${sigHex}`,
          'X-PledgeOFF-Event': 'decision.ready',
          'User-Agent': 'PledgeOFF-Webhook/1.0',
        },
        body: payload,
        signal: AbortSignal.timeout(10_000),
      });
    } catch (deliveryError) {
      // Fire-and-forget: log but never throw — webhook failure must not break the pipeline
      Sentry.captureException(deliveryError, { extra: { traceId, ideaId, url } });
    }
  }

  // expose eventBus for process-outbox cron
  get eventBus(): PostgresEventBus | RedisStreamsEventBus {
    return this._eventBus;
  }

  constructor() {
    const PROD_SUPABASE_REF = 'gphupxlfmeokquvyxqfw';
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
    if (process.env.NODE_ENV !== 'production' && supabaseUrl.includes(PROD_SUPABASE_REF)) {
      throw new Error(
        `[ENV GUARD] Dev environment is pointing to PRODUCTION Supabase (${supabaseUrl}). ` +
          'Set NEXT_PUBLIC_SUPABASE_URL to dev project in .env.local.',
      );
    }

    this._supabase = createSupabaseServiceClient();
    this._usageLogger = new SupabaseUsageLogAdapter(this._supabase);

    // Stripe guards
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (process.env.NODE_ENV !== 'production' && stripeSecretKey?.startsWith('sk_live_')) {
      throw new Error(
        '[ENV GUARD] Development environment is using Stripe LIVE keys. ' +
          'Use sk_test_... in .env.local to avoid real charges.',
      );
    }
    if (process.env.NODE_ENV === 'production' && stripeSecretKey?.startsWith('sk_test_')) {
      console.warn(
        '[container] WARNING: Production is using Stripe test keys. Set STRIPE_SECRET_KEY to sk_live_... before going live.',
      );
    }
    if (stripeSecretKey) {
      const requiredStripeEnvs = [
        'STRIPE_WEBHOOK_SECRET',
        'STRIPE_FOUNDER_MONTHLY_PRICE_ID',
        'STRIPE_FOUNDER_ANNUAL_PRICE_ID',
        'STRIPE_TEAM_MONTHLY_PRICE_ID',
        'STRIPE_TEAM_ANNUAL_PRICE_ID',
      ] as const;
      for (const name of requiredStripeEnvs) {
        if (!process.env[name]) {
          throw new Error(
            `[ENV GUARD] Stripe is configured but ${name} is missing. Add it to .env.local or Vercel env vars.`,
          );
        }
      }
    }
    const stripeMode = stripeSecretKey?.startsWith('sk_live_')
      ? 'live'
      : stripeSecretKey
        ? 'test'
        : 'disabled';
    console.info(`[container] Stripe mode: ${stripeMode}`);
    this.stripeAdapter = stripeSecretKey ? new StripeAdapter(stripeSecretKey) : null;

    // Event bus
    const eventBusProvider = process.env.EVENT_BUS_PROVIDER ?? 'postgres';
    this._eventBus =
      eventBusProvider === 'redis-streams'
        ? new RedisStreamsEventBus(
            this._supabase,
            requireEnv('UPSTASH_REDIS_REST_URL'),
            requireEnv('UPSTASH_REDIS_REST_TOKEN'),
          )
        : new PostgresEventBus(this._supabase);

    // Cache
    const cacheProvider = process.env.CACHE_PROVIDER ?? 'memory';
    this._cache =
      cacheProvider === 'redis'
        ? new UpstashRedisCacheAdapter(
            requireEnv('UPSTASH_REDIS_REST_URL'),
            requireEnv('UPSTASH_REDIS_REST_TOKEN'),
          )
        : new InMemoryCacheAdapter();

    // Source adapters
    this._sourceAdapters = [
      new HNSourceAdapter(8_000, 2, this._cache),
      new DevToSourceAdapter(8_000, 2, this._cache),
      new GitHubSourceAdapter(process.env.GITHUB_PAT ?? '', 8_000, 2, this._cache),
      ...(process.env.BRAVE_SEARCH_API_KEY
        ? [
            new BraveSearchSourceAdapter(process.env.BRAVE_SEARCH_API_KEY, 'brave', (q) => `site:reddit.com ${q}`, 8_000, 2, this._cache),
            new BraveSearchSourceAdapter(process.env.BRAVE_SEARCH_API_KEY, 'reviews', (q) => `(site:g2.com OR site:capterra.com) ${q}`, 8_000, 2, this._cache),
            new BraveSearchSourceAdapter(process.env.BRAVE_SEARCH_API_KEY, 'news', (q) => `${q} announcement OR launch OR funding -site:reddit.com`, 8_000, 2, this._cache),
            new BraveSearchSourceAdapter(process.env.BRAVE_SEARCH_API_KEY, 'jobs', (q) => `site:linkedin.com/jobs ${q}`, 8_000, 2, this._cache),
          ]
        : []),
      ...(process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID
        ? [
            new GoogleSearchSourceAdapter(
              process.env.GOOGLE_SEARCH_API_KEY,
              process.env.GOOGLE_SEARCH_ENGINE_ID,
              10_000,
              2,
              this._cache,
            ),
          ]
        : []),
    ];

    // LLM clients
    const llmProvider = process.env.LLM_PROVIDER ?? 'groq';
    this._llmClient =
      llmProvider === 'anthropic'
        ? new AnthropicLLMAdapter(
            requireEnv('ANTHROPIC_API_KEY'),
            process.env.ANTHROPIC_MODEL,
            this._usageLogger,
          )
        : new GroqLLMAdapter(requireEnv('GROQ_API_KEY'), undefined, this._usageLogger);

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error(
        '[container] ANTHROPIC_API_KEY is not set — Otto will be unavailable (503 on all /api/v1/otto/chat requests)',
      );
    }
    // Otto always uses Anthropic Haiku regardless of LLM_PROVIDER
    this._ottoLLMClient = process.env.ANTHROPIC_API_KEY
      ? new AnthropicLLMAdapter(
          process.env.ANTHROPIC_API_KEY,
          'claude-haiku-4-5-20251001',
          this._usageLogger,
        )
      : this._llmClient;

    this._embeddingClient = process.env.VOYAGE_API_KEY
      ? new VoyageEmbeddingAdapter(process.env.VOYAGE_API_KEY)
      : undefined;

    // Wire: idea.created.v1 → FetchSignalsUseCase
    this._eventBus.subscribe<IdeaCreatedV1['payload']>(
      'idea.created.v1',
      async (event: DomainEvent<IdeaCreatedV1['payload']>) => {
        try {
          const result = await this.fetchSignalsUseCase.execute({
            ideaId: event.payload.ideaId,
            ideaText: event.payload.text,
            traceId: event.traceId,
            eventId: event.eventId,
          });
          if (result.isErr()) {
            throw new Error(`FetchSignalsUseCase failed: ${result.error.message}`);
          }

          // Generate and save embeddings for newly fetched signals (non-blocking)
          if (this._embeddingClient && result.value) {
            void (async () => {
              const signals = Array.isArray(result.value) ? result.value : [];
              const entries: Array<{ id: string; embedding: number[] }> = [];
              for (const signal of signals) {
                const text = `${signal.title} ${signal.summary}`.trim();
                const embResult = await this._embeddingClient!.embed(text);
                if (embResult.isOk()) entries.push({ id: signal.id, embedding: embResult.value });
              }
              if (entries.length > 0) await this.signalRepo.saveEmbeddings(entries);
            })();
          }
        } catch (error) {
          Sentry.captureException(error, {
            extra: { eventType: 'idea.created.v1', traceId: event.traceId, ideaId: event.payload.ideaId },
          });
          throw error;
        }
      },
    );

    // Wire: signals.fetched.v1 → DecideUseCase
    this._eventBus.subscribe<SignalsFetchedV1['payload']>(
      'signals.fetched.v1',
      async (event: DomainEvent<SignalsFetchedV1['payload']>) => {
        try {
          const ideaResult = await this.ideaRepo.findById(event.payload.ideaId);
          if (ideaResult.isErr() || !ideaResult.value) {
            throw new Error(`Idea not found for DecideUseCase: ${event.payload.ideaId}`);
          }

          const result = await this.decideUseCase.execute({
            ideaId: event.payload.ideaId,
            ideaText: ideaResult.value.text,
            traceId: event.traceId,
            eventId: event.eventId,
          });
          if (result.isErr()) {
            throw new Error(`DecideUseCase failed: ${result.error.message}`);
          }
        } catch (error) {
          Sentry.captureException(error, {
            extra: {
              eventType: 'signals.fetched.v1',
              traceId: event.traceId,
              ideaId: event.payload.ideaId,
            },
          });
          throw error;
        }
      },
    );

    // Wire: decision.ready.v1 → send verdict email (fire-and-forget)
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      this._eventBus.subscribe<DecisionReadyV1['payload']>(
        'decision.ready.v1',
        async (event: DomainEvent<DecisionReadyV1['payload']>) => {
          try {
            const ideaResult = await this.ideaRepo.findById(event.payload.ideaId);
            if (ideaResult.isErr() || !ideaResult.value) return;
            const idea = ideaResult.value;

            const { data } = await this._supabase.auth.admin.getUserById(idea.userId);
            const userEmail = data?.user?.email;
            if (!userEmail) return;

            const decisionResult = await this.decisionRepo.findByIdeaId(event.payload.ideaId);
            const decision = decisionResult.isOk() ? decisionResult.value : null;
            const dims = decision?.dimensions;
            const score = dims?.length
              ? Math.round(
                  dims.reduce(
                    (sum: number, d: { weight: number; score: number }) => sum + d.weight * d.score,
                    0,
                  ),
                )
              : Math.round(event.payload.confidence * 100);

            await sendVerdictEmail(resendApiKey, {
              to: userEmail,
              ideaId: idea.id,
              ideaText: idea.text,
              verdict: event.payload.verdict,
              score,
              traceId: event.traceId,
            });
          } catch (error) {
            Sentry.captureException(error, {
              extra: {
                eventType: 'decision.ready.v1',
                traceId: event.traceId,
                ideaId: event.payload.ideaId,
              },
            });
          }
        },
      );
    }

    // Wire: decision.ready.v1 → outbound webhook delivery (fire-and-forget)
    this._eventBus.subscribe<DecisionReadyV1['payload']>(
      'decision.ready.v1',
      async (event: DomainEvent<DecisionReadyV1['payload']>) => {
        try {
          const ideaResult = await this.ideaRepo.findById(event.payload.ideaId);
          if (ideaResult.isErr() || !ideaResult.value) return;
          const idea = ideaResult.value;

          const decisionResult = await this.decisionRepo.findByIdeaId(event.payload.ideaId);
          const decision = decisionResult.isOk() ? decisionResult.value : null;
          const dims = decision?.dimensions;
          const score = dims?.length
            ? Math.round(
                dims.reduce(
                  (sum: number, d: { weight: number; score: number }) => sum + d.weight * d.score,
                  0,
                ),
              )
            : Math.round(event.payload.confidence * 100);

          await this.deliverWebhook(
            idea.id,
            idea.text,
            idea.userId,
            event.payload.verdict,
            score,
            event.traceId,
          );
        } catch (error) {
          Sentry.captureException(error, {
            extra: { eventType: 'decision.ready.v1.webhook', traceId: event.traceId, ideaId: event.payload.ideaId },
          });
        }
      },
    );
  }
}

// Singleton per process (Next.js module caching handles this in dev + prod)
export const container = new AppContainer();
