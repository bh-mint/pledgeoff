import {
  SupabaseIdeaRepository,
  SupabaseSignalRepository,
  SupabaseDecisionRepository,
  SupabaseFeedbackRepository,
  SupabaseIdempotencyStore,
  InMemoryEventBus,
} from '@pledgeoff/adapters';
import { CreateIdeaUseCase } from '@pledgeoff/core';
import { createServiceRoleClient } from './supabase-server.js';

function buildContainer() {
  const supabase = createServiceRoleClient();

  const ideaRepo = new SupabaseIdeaRepository(supabase);
  const signalRepo = new SupabaseSignalRepository(supabase);
  const decisionRepo = new SupabaseDecisionRepository(supabase);
  const feedbackRepo = new SupabaseFeedbackRepository(supabase);
  const idempotencyStore = new SupabaseIdempotencyStore(supabase);
  const eventBus = new InMemoryEventBus();

  const createIdeaUseCase = new CreateIdeaUseCase(ideaRepo, eventBus);

  return {
    createIdeaUseCase,
    // Remaining use cases wired in P3/P4 when their adapters are ready
    _repos: { ideaRepo, signalRepo, decisionRepo, feedbackRepo, idempotencyStore },
    _eventBus: eventBus,
  };
}

// Singleton per process (Next.js module caching handles this in dev + prod)
export const container = buildContainer();
