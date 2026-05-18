# Module: core

## Purpose
Pure TypeScript domain logic — zero infrastructure dependencies. Defines entities, port interfaces, and use-cases that orchestrate business rules. Nothing in this package imports from `adapters`, `supabase-js`, or any external service.

## Owns
- Tables: none (domain layer has no direct DB access)
- Code paths: `src/domain/`, `src/ports/`, `src/use-cases/`

## Ports consumed
- `IIdeaRepository`, `ISignalRepository`, `IDecisionRepository`, `IFeedbackRepository`
- `ISubscriptionRepository`, `ITeamRepository`, `IIdeaReactionRepository`
- `ISimulationRepository`, `ILandingPageRepository`, `ICustomerAnalysisRepository`
- `IBuildAnalysisRepository`, `ICompetitorAnalysisRepository`
- `ISourceAdapter`, `ILLMAdapter`, `ICacheAdapter`, `IEventBus`, `IAuditLog`, `IIdempotencyStore`

## Events published
- none (event publishing delegated to `IEventBus` port — called by use-cases)

## Events consumed
- none (use-cases are invoked directly by API routes, not by events)

## Tier 1 scope
- All domain entities and ports fully defined
- Use-cases: `CreateIdeaUseCase`, `FetchSignalsUseCase`, `DecideUseCase`, `GetOrCreateSubscriptionUseCase`, `UpdateTeamSeatsUseCase`, `InviteTeamMemberUseCase`, `AcceptTeamInviteUseCase`, and all Intelligence tool use-cases

## Tier 2/3 evolution
- No changes expected — hexagonal architecture means adapters swap, not domain
- Add new use-cases as features grow; ports stay stable

## Failure modes
- Use-cases return `Result<T, E>` via `neverthrow` — no exceptions leak to callers
- Domain validation via Zod schemas at entity boundaries
