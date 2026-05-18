# Module: adapters

## Purpose
Concrete implementations of all port interfaces defined in `packages/core`. Each adapter wraps one external service (Supabase, Stripe, Resend, Groq, Anthropic, Brave Search, GitHub, etc.) and translates between domain types and infrastructure specifics.

## Owns
- Tables: none (adapters read/write via service clients, not raw SQL)
- Code paths: `src/storage/`, `src/stripe/`, `src/email/`, `src/llm/`, `src/sources/`, `src/cache/`

## Ports consumed
- Implements: all `I*` ports from `packages/core/src/ports/`

## Events published
- none

## Events consumed
- none

## Tier 1 scope
- **Storage:** Supabase adapters for all 13 repositories + idempotency store + audit log
- **Stripe:** `StripeAdapter` — checkout, portal, webhooks, seat add-ons, invoice retry
- **Email:** `resend-email-adapter` — welcome, verdict, team invite, payment-failed, sequences
- **LLM:** `GroqLLMAdapter` (primary), `AnthropicLLMAdapter` (fallback)
- **Sources:** `BraveSearchSourceAdapter` (Reddit proxy), `GitHubSourceAdapter`, `HNSourceAdapter`, `ProductHuntSourceAdapter`, `GoogleSearchSourceAdapter`, `DevToSourceAdapter`
- **Cache:** `InMemoryCacheAdapter` (Tier 1 default), `UpstashRedisCacheAdapter` (Tier 2, behind port)

## Tier 2/3 evolution
- Swap `InMemoryCacheAdapter` → `UpstashRedisCacheAdapter` in `container.ts` (adapter already built)
- Add new source adapters via `ISourceAdapter` — no use-case changes needed

## Failure modes
- All adapters wrap exceptions into typed `Result<T, AdapterError>` — no raw throws
- Graceful degradation: source adapters log and continue if one source is down
