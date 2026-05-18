# Module: eventbus

## Purpose
Implements the transactional outbox pattern for reliable event delivery. Events are written to the `outbox` table in the same DB transaction as the domain write, then delivered via a cron poller. Guarantees at-least-once delivery with idempotency enforced by `packages/core`.

## Owns
- Tables: `outbox`, `processed_events` (via migrations)
- Code paths: `src/postgres-event-bus.ts`, `src/redis-streams-event-bus.ts`

## Ports consumed
- Implements: `IEventBus` from `packages/core/src/ports/event-bus.ts`

## Events published
- none (delivers events written by use-cases)

## Events consumed
- none (polled by `/api/v1/cron/process-outbox`)

## Tier 1 scope
- `PostgresEventBus` — active default; writes to `outbox`, delivers via cron polling every minute

## Tier 2/3 evolution
- `RedisStreamsEventBus` — built and behind port, not yet wired as default
- Swap in `container.ts` when Upstash Redis is active (set `EVENT_BUS_PROVIDER=redis-streams`)

## Failure modes
- Failed deliveries remain in `outbox` with `status=failed`; cron retries on next run
- Duplicate delivery prevented by `processed_events` PK uniqueness check
