# Module: observability

## Purpose
Centralized structured logging and tracing utilities. All application code imports `logger` from this package — no `console.*` calls allowed outside this module.

## Owns
- Tables: none
- Code paths: `src/logger.ts`, `src/tracer.ts`, `src/sdk.ts`, `src/types.ts`

## Ports consumed
- none (infrastructure package, not behind a port)

## Events published
- none

## Events consumed
- none

## Tier 1 scope
- `logger` — Pino-based structured logger; all logs include `traceId`, `target`, `operation`, `latencyMs`, `outcome`
- `tracer` — `traceId` propagation via `x-trace-id` header
- Sentry integration for error capture (free tier)
- Axiom for log ingestion (free tier)

## Tier 2/3 evolution
- Add Prometheus metrics exporter if Axiom hits limits
- OpenTelemetry spans if distributed tracing becomes necessary

## Failure modes
- Logger never throws — failures are silently dropped to avoid cascading errors from observability layer
